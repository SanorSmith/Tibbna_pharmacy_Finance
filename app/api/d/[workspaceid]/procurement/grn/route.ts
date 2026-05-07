import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { goodsReceiptNotes, grnItems, items, vendors, purchaseOrders } from '@/lib/db/schema';
import { eq, and, desc, like, or, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import type { GoodsReceiptNote, CreateGoodsReceiptRequest } from '@/lib/types/procurement';

// GET /api/d/[workspaceid]/procurement/grn - List GRNs with filters
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

    const conditions = [];

    if (status) {
      conditions.push(eq(goodsReceiptNotes.status, status));
    }
    if (vendorid) {
      conditions.push(eq(goodsReceiptNotes.vendorid, vendorid));
    }
    if (datefrom) {
      conditions.push(gte(goodsReceiptNotes.receiptdate, new Date(datefrom)));
    }
    if (dateto) {
      conditions.push(lte(goodsReceiptNotes.receiptdate, new Date(dateto)));
    }
    if (searchQuery) {
      conditions.push(
        or(
          like(goodsReceiptNotes.grnnumber, `%${searchQuery}%`),
          like(goodsReceiptNotes.notes, `%${searchQuery}%`)
        )!
      );
    }

    const grns = await db
      .select({
        id: goodsReceiptNotes.id,
        grnnumber: goodsReceiptNotes.grnnumber,
        poid: goodsReceiptNotes.poid,
        vendorid: goodsReceiptNotes.vendorid,
        warehouseid: goodsReceiptNotes.warehouseid,
        status: goodsReceiptNotes.status,
        receiptdate: goodsReceiptNotes.receiptdate,
        invoicenumber: goodsReceiptNotes.invoicenumber,
        invoicedate: goodsReceiptNotes.invoicedate,
        receivedby: goodsReceiptNotes.receivedby,
        notes: goodsReceiptNotes.notes,
        createdat: goodsReceiptNotes.createdat,
        updatedat: goodsReceiptNotes.updatedat,
        vendor: {
          id: vendors.id,
          name: vendors.name,
        },
        purchaseOrder: {
          id: purchaseOrders.id,
          ponumber: purchaseOrders.ponumber,
        },
      })
      .from(goodsReceiptNotes)
      .leftJoin(vendors, eq(goodsReceiptNotes.vendorid, vendors.id))
      .leftJoin(purchaseOrders, eq(goodsReceiptNotes.poid, purchaseOrders.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(goodsReceiptNotes.receiptdate));

    // Get items for each GRN
    const grnsWithItems = await Promise.all(
      grns.map(async (grn) => {
        const grnItemsList = await db
          .select()
          .from(grnItems)
          .where(eq(grnItems.grnid, grn.id));

        const itemsWithDetails = await Promise.all(
          grnItemsList.map(async (item) => {
            if (!item.itemid) return { ...item, item: null };
            
            const itemDetails = await db
              .select({
                id: items.id,
                itemcode: items.itemcode,
                name: items.name,
                uom: items.uom,
              })
              .from(items)
              .where(eq(items.id, item.itemid))
              .limit(1);

            return {
              ...item,
              item: itemDetails[0] || null,
            };
          })
        );

        return {
          ...grn,
          items: itemsWithDetails,
        };
      })
    );

    return NextResponse.json(grnsWithItems);
  } catch (error) {
    console.error('Error fetching goods receipt notes:', error);
    return NextResponse.json({ error: 'Failed to fetch goods receipt notes' }, { status: 500 });
  }
}

// POST /api/d/[workspaceid]/procurement/grn - Create GRN
const createGRNSchema = z.object({
  poid: z.string().uuid().optional(),
  vendorid: z.string().uuid(),
  warehouseid: z.string().uuid().optional(),
  invoicenumber: z.string().optional(),
  invoicedate: z.string().optional(),
  receivedby: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      itemid: z.string().uuid(),
      poitemid: z.string().uuid().optional(),
      orderedqty: z.number().optional(),
      receivedqty: z.number().min(0),
      rejectedqty: z.number().min(0).default(0),
      unitprice: z.number().min(0).optional(),
      batchnumber: z.string().optional(),
      expirydate: z.string().optional(),
      manufacturedate: z.string().optional(),
      notes: z.string().optional(),
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
    const validated = createGRNSchema.parse(body);

    // Generate GRN number
    const grnnumber = `GR-${Date.now().toString().slice(-8)}`;

    // Calculate total amount
    const totalamount = validated.items.reduce(
      (sum, item) => sum + item.receivedqty * (item.unitprice || 0),
      0
    );

    // Create GRN
    const [newGRN] = await db
      .insert(goodsReceiptNotes)
      .values({
        grnnumber,
        poid: validated.poid,
        vendorid: validated.vendorid,
        warehouseid: validated.warehouseid,
        invoicenumber: validated.invoicenumber,
        invoicedate: validated.invoicedate ? new Date(validated.invoicedate) : null,
        receivedby: validated.receivedby,
        notes: validated.notes,
        status: 'draft',
        receiptdate: new Date(),
      })
      .returning();

    // Create GRN items
    const grnItemList = await Promise.all(
      validated.items.map(async (item) => {
        const [newItem] = await db
          .insert(grnItems)
          .values({
            grnid: newGRN.id,
            itemid: item.itemid,
            poitemid: item.poitemid,
            orderedqty: item.orderedqty,
            receivedqty: item.receivedqty,
            rejectedqty: item.rejectedqty,
            unitprice: item.unitprice ? item.unitprice.toString() : null,
            batchnumber: item.batchnumber,
            expirydate: item.expirydate ? new Date(item.expirydate) : null,
            manufacturedate: item.manufacturedate ? new Date(item.manufacturedate) : null,
            notes: item.notes,
          })
          .returning();

        return newItem;
      })
    );

    return NextResponse.json({
      ...newGRN,
      items: grnItemList,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating goods receipt note:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create goods receipt note' }, { status: 500 });
  }
}
