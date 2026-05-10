import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  pharmacyPurchaseOrders,
  pharmacyPurchaseOrderItems,
  items,
} from "@/lib/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  const { workspaceid } = await params;
  const status = req.nextUrl.searchParams.get("status") ?? "";

  try {
    const conditions = [eq(pharmacyPurchaseOrders.workspaceid, workspaceid)];
    if (status) {
      conditions.push(eq(pharmacyPurchaseOrders.status, status as any));
    }

    const rows = await db
      .select({
        id: pharmacyPurchaseOrders.id,
        ordernumber: pharmacyPurchaseOrders.ordernumber,
        orderedby: pharmacyPurchaseOrders.orderedby,
        orderdate: pharmacyPurchaseOrders.orderdate,
        expecteddate: pharmacyPurchaseOrders.expecteddate,
        supplierid: pharmacyPurchaseOrders.supplierid,
        suppliername: pharmacyPurchaseOrders.suppliername,
        supplieremail: pharmacyPurchaseOrders.supplieremail,
        supplierphone: pharmacyPurchaseOrders.supplierphone,
        status: pharmacyPurchaseOrders.status,
        notes: pharmacyPurchaseOrders.notes,
        totalamount: pharmacyPurchaseOrders.totalamount,
        isedited: pharmacyPurchaseOrders.isedited,
        cancelreason: pharmacyPurchaseOrders.cancelreason,
        createdat: pharmacyPurchaseOrders.createdat,
        updatedat: pharmacyPurchaseOrders.updatedat,
        item_count: sql<number>`(SELECT COUNT(*) FROM pharmacy_purchase_order_items WHERE order_id = ${pharmacyPurchaseOrders.id})::int`,
      })
      .from(pharmacyPurchaseOrders)
      .where(and(...conditions))
      .orderBy(desc(pharmacyPurchaseOrders.createdat));

    return NextResponse.json(rows);
  } catch (e: any) {
    console.error("GET /pharmacy-procurement/orders error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  const { workspaceid } = await params;

  try {
    const body = await req.json();
    const {
      orderedBy,
      orderDate,
      expectedDate,
      supplierId,
      supplierName,
      supplierEmail,
      supplierPhone,
      notes,
      items: orderItems,
    } = body;

    if (!orderedBy?.trim())
      return NextResponse.json({ error: "Ordered by is required" }, { status: 400 });
    if (!orderItems?.length)
      return NextResponse.json({ error: "Add at least one item" }, { status: 400 });

    const orderNum = `PPO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-4)}`;
    const total = orderItems.reduce(
      (s: number, i: any) => s + (i.orderedQty || 0) * (parseFloat(i.unitCost) || 0),
      0
    );

    const result = await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(pharmacyPurchaseOrders)
        .values({
          workspaceid,
          ordernumber: orderNum,
          orderedby: orderedBy,
          orderdate: orderDate ? new Date(orderDate) : new Date(),
          expecteddate: expectedDate ? new Date(expectedDate) : null,
          supplierid: supplierId || null,
          suppliername: supplierName || null,
          supplieremail: supplierEmail || null,
          supplierphone: supplierPhone || null,
          notes: notes || null,
          totalamount: String(total),
          status: "PENDING",
        })
        .returning();

      for (const item of orderItems) {
        await tx.insert(pharmacyPurchaseOrderItems).values({
          orderid: order.id,
          itemid: item.itemId || null,
          itemname: item.itemName || null,
          uom: item.uom || null,
          orderedqty: item.orderedQty || 0,
          unitcost: item.unitCost ? String(item.unitCost) : null,
          totalcost: String((item.orderedQty || 0) * (parseFloat(item.unitCost) || 0)),
          notes: item.notes || null,
        });

        // Sync price back to items table
        if (item.itemId && item.unitCost) {
          await tx
            .update(items)
            .set({ updatedat: new Date() })
            .where(eq(items.id, item.itemId))
            .catch(() => {});
        }
      }

      return order;
    });

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("POST /pharmacy-procurement/orders error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
