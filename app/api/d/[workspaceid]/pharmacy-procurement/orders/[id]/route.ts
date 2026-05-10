import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  pharmacyPurchaseOrders,
  pharmacyPurchaseOrderItems,
  items,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; id: string }> }
) {
  const { id } = await params;
  try {
    const [order] = await db
      .select()
      .from(pharmacyPurchaseOrders)
      .where(eq(pharmacyPurchaseOrders.id, id));

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const orderItems = await db
      .select()
      .from(pharmacyPurchaseOrderItems)
      .where(eq(pharmacyPurchaseOrderItems.orderid, id));

    return NextResponse.json({ order, items: orderItems });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const {
      status,
      edit,
      reason,
      orderedBy,
      orderDate,
      expectedDate,
      supplierName,
      supplierEmail,
      supplierPhone,
      notes,
      items: orderItems,
    } = body;

    // Status-only update (cancel)
    if (status && !edit) {
      await db
        .update(pharmacyPurchaseOrders)
        .set({
          status: status as any,
          cancelreason: reason || null,
          updatedat: new Date(),
        })
        .where(eq(pharmacyPurchaseOrders.id, id));
      return NextResponse.json({ success: true });
    }

    // Full edit
    if (edit) {
      const total = (orderItems || []).reduce(
        (s: number, i: any) => s + (i.orderedQty || 0) * (parseFloat(i.unitCost) || 0),
        0
      );

      await db.transaction(async (tx) => {
        await tx
          .update(pharmacyPurchaseOrders)
          .set({
            orderedby: orderedBy || undefined,
            orderdate: orderDate ? new Date(orderDate) : undefined,
            expecteddate: expectedDate ? new Date(expectedDate) : undefined,
            suppliername: supplierName || undefined,
            supplieremail: supplierEmail || undefined,
            supplierphone: supplierPhone || undefined,
            notes: notes ?? undefined,
            totalamount: String(total),
            isedited: true,
            updatedat: new Date(),
          })
          .where(eq(pharmacyPurchaseOrders.id, id));

        if (orderItems?.length) {
          await tx
            .delete(pharmacyPurchaseOrderItems)
            .where(eq(pharmacyPurchaseOrderItems.orderid, id));

          for (const item of orderItems) {
            await tx.insert(pharmacyPurchaseOrderItems).values({
              orderid: id,
              itemid: item.itemId || null,
              itemname: item.itemName || null,
              uom: item.uom || null,
              orderedqty: item.orderedQty || 0,
              unitcost: item.unitCost ? String(item.unitCost) : null,
              totalcost: String((item.orderedQty || 0) * (parseFloat(item.unitCost) || 0)),
              notes: item.notes || null,
            });

            if (item.itemId && item.unitCost) {
              await tx
                .update(items)
                .set({ updatedat: new Date() })
                .where(eq(items.id, item.itemId))
                .catch(() => {});
            }
          }
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("PATCH /pharmacy-procurement/orders/[id] error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
