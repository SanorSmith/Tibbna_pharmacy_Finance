import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { purchaseOrders, purchaseOrderItems, items, vendors } from '@/lib/db/schema';
import { eq, and, desc, like, or, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import type { PurchaseOrder, CreatePurchaseOrderRequest, UpdatePurchaseOrderRequest, POFilters } from '@/lib/types/procurement';

// GET /api/d/[workspaceid]/procurement/orders - List POs with filters
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const searchParams = req.nextUrl.searchParams;

    const status = searchParams.get('status') as any;
    const vendorid = searchParams.get('vendorid');
    const datefrom = searchParams.get('datefrom');
    const dateto = searchParams.get('dateto');
    const searchQuery = searchParams.get('search');

    const conditions = [];

    if (status) {
      conditions.push(eq(purchaseOrders.status, status));
    }
    if (vendorid) {
      conditions.push(eq(purchaseOrders.vendorid, vendorid));
    }
    if (datefrom) {
      conditions.push(gte(purchaseOrders.orderdate, new Date(datefrom)));
    }
    if (dateto) {
      conditions.push(lte(purchaseOrders.orderdate, new Date(dateto)));
    }
    if (searchQuery) {
      conditions.push(
        or(
          like(purchaseOrders.ponumber, `%${searchQuery}%`),
          like(purchaseOrders.notes, `%${searchQuery}%`)
        )!
      );
    }

    const orders = await db
      .select({
        id: purchaseOrders.id,
        ponumber: purchaseOrders.ponumber,
        vendorid: purchaseOrders.vendorid,
        prid: purchaseOrders.prid,
        warehouseid: purchaseOrders.warehouseid,
        status: purchaseOrders.status,
        orderdate: purchaseOrders.orderdate,
        expecteddate: purchaseOrders.expecteddate,
        totalamount: purchaseOrders.totalamount,
        currency: purchaseOrders.currency,
        paymentterms: purchaseOrders.paymentterms,
        shippingaddress: purchaseOrders.shippingaddress,
        notes: purchaseOrders.notes,
        approvedby: purchaseOrders.approvedby,
        sentby: purchaseOrders.sentby,
        createdat: purchaseOrders.createdat,
        updatedat: purchaseOrders.updatedat,
        vendor: {
          id: vendors.id,
          name: vendors.name,
          contactname: vendors.contactname,
          phone: vendors.phone,
        },
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorid, vendors.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(purchaseOrders.orderdate));

    // Get items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const orderItems = await db
          .select()
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.poid, order.id));

        const itemsWithDetails = await Promise.all(
          orderItems.map(async (item) => {
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
          ...order,
          items: itemsWithDetails,
        };
      })
    );

    return NextResponse.json(ordersWithItems);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 });
  }
}

// POST /api/d/[workspaceid]/procurement/orders - Create PO
const createPOSchema = z.object({
  vendorid: z.string().uuid(),
  warehouseid: z.string().uuid().optional(),
  expecteddate: z.string().optional(),
  paymentterms: z.number().optional(),
  shippingaddress: z.string().optional(),
  notes: z.string().optional(),
  approvedby: z.string().optional(),
  items: z.array(
    z.object({
      itemid: z.string().uuid(),
      orderedqty: z.number().min(1),
      unitprice: z.number().min(0),
    })
  ).min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const body = await req.json();
    const validated = createPOSchema.parse(body);

    // Generate PO number
    const ponumber = `PO-${Date.now().toString().slice(-8)}`;

    // Calculate total amount
    const totalamount = validated.items.reduce(
      (sum, item) => sum + item.orderedqty * item.unitprice,
      0
    );

    // Create PO
    const [newPO] = await db
      .insert(purchaseOrders)
      .values({
        ponumber,
        vendorid: validated.vendorid,
        warehouseid: validated.warehouseid,
        expecteddate: validated.expecteddate ? new Date(validated.expecteddate) : null,
        paymentterms: validated.paymentterms || 30,
        shippingaddress: validated.shippingaddress,
        notes: validated.notes,
        approvedby: validated.approvedby,
        totalamount: totalamount.toString(),
        status: 'draft',
        orderdate: new Date(),
      })
      .returning();

    // Create PO items
    const poItems = await Promise.all(
      validated.items.map(async (item) => {
        const [newItem] = await db
          .insert(purchaseOrderItems)
          .values({
            poid: newPO.id,
            itemid: item.itemid,
            orderedqty: item.orderedqty,
            receivedqty: 0,
            unitprice: item.unitprice.toString(),
            totalprice: (item.orderedqty * item.unitprice).toString(),
          })
          .returning();

        return newItem;
      })
    );

    return NextResponse.json({
      ...newPO,
      totalamount: newPO.totalamount ? parseFloat(newPO.totalamount) : 0,
      items: poItems,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create purchase order' }, { status: 500 });
  }
}

// PATCH /api/d/[workspaceid]/procurement/orders/[id] - Update PO
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const body = await req.json();
    const { id, status } = body;
    
    if (!id || !status) {
      return NextResponse.json({ error: 'Order ID and status are required' }, { status: 400 });
    }

    // Update PO
    const [updatedPO] = await db
      .update(purchaseOrders)
      .set({ 
        status,
        updatedat: new Date(),
      })
      .where(eq(purchaseOrders.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      order: updatedPO,
    });
  } catch (error) {
    console.error('Error updating PO:', error);
    return NextResponse.json({ error: 'Failed to update PO' }, { status: 500 });
  }
}
