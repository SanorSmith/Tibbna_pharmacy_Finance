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
    const [updatedOrder] = await db
      .update(pharmacyOrders)
      .set({
        status: "DISPENSED",
        dispensedby: user.name || "Unknown Pharmacist",
        dispensedat: new Date(),
        updatedat: new Date(),
      })
      .where(eq(pharmacyOrders.orderid, orderid));

    // 3. Generate invoice with doctor/hospital shares
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

      // Calculate shares (example: 70% patient, 20% insurance, 10% doctor)
      const patientShare = lineTotal * 0.7;
      const insuranceShare = lineTotal * 0.2;
      const doctorShare = lineTotal * 0.1;

      lineValues.push({
        drugname: item.drugname,
        quantity: item.quantity,
        unitprice: price.toFixed(2),
        linetotal: lineTotal.toFixed(2),
        insurancecovered: insuranceShare.toFixed(2),
        patientpays: patientShare.toFixed(2),
      });
    }

    const patientTotal = subtotal * 0.7;
    const insuranceTotal = subtotal * 0.2;
    const doctorTotal = subtotal * 0.1;

    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const [inv] = await db
      .insert(invoices)
      .values({
        orderid,
        patientid: order.patientid,
        invoicenumber: invoiceNumber,
        status: "ISSUED",
        subtotal: subtotal.toFixed(2),
        insurancecovered: insuranceTotal.toFixed(2),
        patientcopay: patientTotal.toFixed(2),
        total: subtotal.toFixed(2),
      })
      .returning();

    for (const lv of lineValues) {
      await db.insert(invoiceLines).values({ ...lv, invoiceid: inv.invoiceid });
    }

    // Create OpenEHR ACTION.medication composition
    let dispenseCompositionUid: string | null = null;
    try {
      if (order.openehrorderid) {
        // For now, create a simple composition - this needs proper OpenEHR integration
        // TODO: Implement proper OpenEHR ACTION.medication composition
        const compositionData = {
          medicationItem: items[0]?.drugname || "Unknown",
          quantityDispensed: items[0]?.quantity || 1,
          quantityUnit: "each",
          batchNumber: items[0]?.batchid || "N/A",
          expiryDate: new Date().toISOString().split('T')[0],
          route: "oral",
          substitutionPerformed: "SUBSTITUTION_NOT_PERFORMED" as const,
          dispenserId: user.userid,
          dispensingOrganizationId: workspaceid,
          patientId: order.patientid || "",
          prescriptionId: order.openehrorderid,
          composerName: user.name || "Pharmacist",
        };

        // const result = await createMedicationDispenseComposition(compositionData);
        // dispenseCompositionUid = result.compositionUid;
        
        // For now, create a dummy UID
        dispenseCompositionUid = `dispense-${orderid}-${Date.now()}`;
        
        // Update order with dispense composition UID
        await db
          .update(pharmacyOrders)
          .set({ dispensecompositionuid: dispenseCompositionUid })
          .where(eq(pharmacyOrders.orderid, orderid));
      }
    } catch (openehrError) {
      console.error("[OpenEHR Dispense Composition]", openehrError);
      // Continue without OpenEHR - don't fail the whole dispense process
    }

    return NextResponse.json({
      message: "Order dispensed successfully",
      allScanned: true,
      order: { ...order, status: "DISPENSED", dispensecompositionuid: dispenseCompositionUid },
      invoice: inv,
      openEhrComposition: dispenseCompositionUid,
    });
  } catch (error) {
    console.error("[Pharmacy Dispense POST]", error);
    return NextResponse.json({ error: "Failed to dispense" }, { status: 500 });
  }
}
