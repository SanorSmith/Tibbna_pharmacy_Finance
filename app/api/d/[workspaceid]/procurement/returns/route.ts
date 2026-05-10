import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supplierReturns, supplierReturnItems, supplierClaims, vendors } from '@/lib/db/schema';
import { eq, and, desc, like, or, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import type { CreateSupplierReturnRequest } from '@/lib/types/procurement';

// GET /api/d/[workspaceid]/procurement/returns - List returns with filters
export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceid: string } }
) {
  try {
    const { workspaceid } = params;
    const searchParams = req.nextUrl.searchParams;

    const status = searchParams.get('status') as any;
    const vendorid = searchParams.get('vendorid');
    const datefrom = searchParams.get('datefrom');
    const dateto = searchParams.get('dateto');
    const searchQuery = searchParams.get('search');

    const conditions = [eq(supplierReturns.workspaceid, workspaceid)];

    if (status) {
      conditions.push(eq(supplierReturns.status, status));
    }
    if (vendorid) {
      conditions.push(eq(supplierReturns.vendorid, vendorid));
    }
    if (datefrom) {
      conditions.push(gte(supplierReturns.returndate, new Date(datefrom)));
    }
    if (dateto) {
      conditions.push(lte(supplierReturns.returndate, new Date(dateto)));
    }
    if (searchQuery) {
      conditions.push(
        or(
          like(supplierReturns.returnnumber, `%${searchQuery}%`),
          like(supplierReturns.description, `%${searchQuery}%`)
        )!
      );
    }

    const returns = await db
      .select({
        id: supplierReturns.id,
        workspaceid: supplierReturns.workspaceid,
        returnnumber: supplierReturns.returnnumber,
        claimid: supplierReturns.claimid,
        vendorid: supplierReturns.vendorid,
        status: supplierReturns.status,
        returndate: supplierReturns.returndate,
        expecteddate: supplierReturns.expecteddate,
        description: supplierReturns.description,
        totalamount: supplierReturns.totalamount,
        creditnote: supplierReturns.creditnote,
        receiveddate: supplierReturns.receiveddate,
        receivedby: supplierReturns.receivedby,
        createdby: supplierReturns.createdby,
        createdat: supplierReturns.createdat,
        updatedat: supplierReturns.updatedat,
        vendor: {
          id: vendors.id,
          name: vendors.name,
        },
        claim: {
          id: supplierClaims.id,
          claimnumber: supplierClaims.claimnumber,
        },
      })
      .from(supplierReturns)
      .leftJoin(vendors, eq(supplierReturns.vendorid, vendors.id))
      .leftJoin(supplierClaims, eq(supplierReturns.claimid, supplierClaims.id))
      .where(and(...conditions))
      .orderBy(desc(supplierReturns.returndate));

    // Get items for each return
    const returnsWithItems = await Promise.all(
      returns.map(async (ret) => {
        const returnItems = await db
          .select()
          .from(supplierReturnItems)
          .where(eq(supplierReturnItems.returnid, ret.id));

        return {
          ...ret,
          totalamount: ret.totalamount ? parseFloat(ret.totalamount) : 0,
          items: returnItems,
        };
      })
    );

    return NextResponse.json(returnsWithItems);
  } catch (error) {
    console.error('Error fetching supplier returns:', error);
    return NextResponse.json({ error: 'Failed to fetch supplier returns' }, { status: 500 });
  }
}

// POST /api/d/[workspaceid]/procurement/returns - Create return
const createReturnSchema = z.object({
  claimid: z.string().uuid().optional(),
  vendorid: z.string().uuid(),
  expecteddate: z.string().optional(),
  description: z.string().min(1),
  items: z.array(
    z.object({
      itemid: z.string().uuid(),
      batchid: z.string().uuid().optional(),
      quantity: z.number().min(1),
      unitprice: z.number().min(0),
      reason: z.string().min(1),
    })
  ).min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { workspaceid: string } }
) {
  try {
    const { workspaceid } = params;
    const body = await req.json();
    const validated = createReturnSchema.parse(body);

    // Generate return number
    const returnnumber = `RET-${Date.now().toString().slice(-8)}`;

    // Calculate total amount
    const totalamount = validated.items.reduce(
      (sum, item) => sum + item.quantity * item.unitprice,
      0
    );

    // Create return
    const [newReturn] = await db
      .insert(supplierReturns)
      .values({
        workspaceid,
        returnnumber,
        claimid: validated.claimid,
        vendorid: validated.vendorid,
        expecteddate: validated.expecteddate ? new Date(validated.expecteddate) : null,
        description: validated.description,
        totalamount: totalamount.toString(),
        status: 'pending',
        returndate: new Date(),
      })
      .returning();

    // Create return items
    const returnItemList = await Promise.all(
      validated.items.map(async (item) => {
        const [newItem] = await db
          .insert(supplierReturnItems)
          .values({
            returnid: newReturn.id,
            itemid: item.itemid,
            batchid: item.batchid,
            quantity: item.quantity,
            unitprice: item.unitprice.toString(),
            reason: item.reason,
          })
          .returning();

        return newItem;
      })
    );

    return NextResponse.json({
      ...newReturn,
      totalamount: parseFloat(newReturn.totalamount || '0'),
      items: returnItemList,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating supplier return:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create supplier return' }, { status: 500 });
  }
}
