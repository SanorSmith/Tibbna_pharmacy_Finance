/**
 * Pharmacy Dispense API
 *
 * POST /api/d/[workspaceid]/pharmacy-orders/[orderid]/dispense
 *
 * Starts or completes dispensing for an order:
 *  - Marks order IN_PROGRESS on first call
 *  - When all items are SCANNED / DISPENSED → marks order DISPENSED
 *  - Creates stock movements and generates invoice
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  pharmacyOrders,
  pharmacyOrderItems,
  stockLevels,
  stockMovements,
  invoices,
  invoiceLines,
  drugBatches,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUser } from "@/lib/user";

type RouteParams = { params: Promise<{ workspaceid: string; orderid: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, orderid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch order
    const [order] = await db
      .select()
      .from(pharmacyOrders)
      .where(eq(pharmacyOrders.orderid, orderid))
      .limit(1);

    if (!order || order.workspaceid !== workspaceid) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "DISPENSED" || order.status === "CANCELLED") {
      return NextResponse.json(
        { error: `Order already ${order.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Move to IN_PROGRESS if still PENDING
    if (order.status === "PENDING") {
      await db
        .update(pharmacyOrders)
        .set({ status: "IN_PROGRESS", updatedat: new Date() })
        .where(eq(pharmacyOrders.orderid, orderid));
    }

    // Load items
    const items = await db
      .select()
      .from(pharmacyOrderItems)
      .where(eq(pharmacyOrderItems.orderid, orderid));

    const allReady = items.every(
      (i) => i.status === "SCANNED" || i.status === "DISPENSED" || i.status === "SUBSTITUTED"
    );

    if (!allReady) {
      return NextResponse.json({
        message: "Dispensing started — scan all items before completing",
        order: { ...order, status: "IN_PROGRESS" },
        items,
        allScanned: false,
      });
    }

    // ── All items scanned → finalize ──────────────────────────────────
    // 1. Deduct stock + create movements
    for (const item of items) {
      if (!item.drugid) continue;

      // Find a stock level row for this drug
      const [sl] = await db
        .select()
        .from(stockLevels)
        .where(eq(stockLevels.drugid, item.drugid))
        .limit(1);

      if (sl) {
        const newQty = Math.max(0, sl.quantity - item.quantity);
        await db
          .update(stockLevels)
          .set({ quantity: newQty, updatedat: new Date() })
          .where(eq(stockLevels.stocklevelid, sl.stocklevelid));

        await db.insert(stockMovements).values({
          drugid: item.drugid,
          batchid: item.batchid || sl.batchid || null,
          locationid: sl.locationid,
          type: "DISPENSE",
          quantity: -item.quantity,
          reason: `Dispensed for order ${orderid}`,
          referenceid: orderid,
          performedby: user.userid,
        });
      }

      // Mark item dispensed
      await db
        .update(pharmacyOrderItems)
        .set({ status: "DISPENSED" })
        .where(eq(pharmacyOrderItems.itemid, item.itemid));
    }

    // 2. Mark order dispensed
    await db
      .update(pharmacyOrders)
      .set({
        status: "DISPENSED",
        dispensedby: user.userid,
        dispensedat: new Date(),
        updatedat: new Date(),
      })
      .where(eq(pharmacyOrders.orderid, orderid));

    // 3. Generate invoice
    let subtotal = 0;
    const lineValues: any[] = [];
    for (const item of items) {
      let price = item.unitprice ? parseFloat(item.unitprice) : 0;

      // Try to resolve price from batch if missing
      if (!price && item.batchid) {
        const [batch] = await db
          .select()
          .from(drugBatches)
          .where(eq(drugBatches.batchid, item.batchid))
          .limit(1);
        if (batch?.sellingprice) price = parseFloat(batch.sellingprice);
      }

      const lineTotal = price * item.quantity;
      subtotal += lineTotal;

      lineValues.push({
        drugid: item.drugid,
        description: item.drugname,
        quantity: item.quantity,
        unitprice: price.toFixed(2),
        linetotal: lineTotal.toFixed(2),
        insurancecovered: "0",
        patientpays: lineTotal.toFixed(2),
      });
    }

    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const [inv] = await db
      .insert(invoices)
      .values({
        orderid,
        patientid: order.patientid,
        invoicenumber: invoiceNumber,
        status: "ISSUED",
        subtotal: subtotal.toFixed(2),
        insurancecovered: "0",
        patientcopay: subtotal.toFixed(2),
        total: subtotal.toFixed(2),
      })
      .returning();

    for (const lv of lineValues) {
      await db.insert(invoiceLines).values({ ...lv, invoiceid: inv.invoiceid });
    }

    return NextResponse.json({
      message: "Order dispensed successfully",
      allScanned: true,
      order: { ...order, status: "DISPENSED" },
      invoice: inv,
    });
  } catch (error) {
    console.error("[Pharmacy Dispense POST]", error);
    return NextResponse.json({ error: "Failed to dispense" }, { status: 500 });
  }
}
