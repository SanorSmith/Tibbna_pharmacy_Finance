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
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { pharmacyOrders, pharmacyOrderItems, invoices, invoiceLines } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createMedicationDispenseComposition, MEDICATION_DISPENSE_ACTION_STATES } from "@/lib/openehr/medication-dispense";
import { createOpenEHRComposition } from "@/lib/openehr/openehr";
import { patients } from "@/lib/db/tables/patient";

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
      if (order.openehrorderid && order.patientid) {
        // Fetch patient to get EHR ID (national ID)
        const [patient] = await db
          .select()
          .from(patients)
          .where(eq(patients.patientid, order.patientid))
          .limit(1);

        if (patient?.nationalid) {
          // Extract route from first item's dosage (e.g., "Route: Oral, Dose: 500mg")
          const firstItem = items[0];
          let route = "oral"; // default
          if (firstItem?.dosage) {
            const routeMatch = firstItem.dosage.match(/Route:\s*([^,]+)/i);
            if (routeMatch) {
              route = routeMatch[1].trim().toLowerCase();
            }
          }

          // Create the medication dispense composition data
          const compositionData = createMedicationDispenseComposition({
            medicationItem: firstItem?.drugname || "Unknown Medication",
            quantityDispensed: firstItem?.quantity || 1,
            quantityUnit: "each",
            batchNumber: firstItem?.batchid || "BATCH-" + Date.now(),
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
            route: route,
            substitutionPerformed: "SUBSTITUTION_NOT_PERFORMED",
            actionState: "PRESCRIPTION_DISPENSED",
            comment: `Dispensed by ${user.name || "Pharmacist"} for order ${orderid}`,
            timing: new Date().toISOString(),
            composerName: user.name || "Pharmacist",
          });

          // Submit to OpenEHR
          const compositionUid = await createOpenEHRComposition(
            patient.nationalid, // EHR ID
            "template_medication_dispense_v1", // Template ID
            compositionData
          );

          dispenseCompositionUid = compositionUid;
          
          console.log("[OpenEHR] Medication dispense composition created:", compositionUid);

          // Update order with dispense composition UID
          await db
            .update(pharmacyOrders)
            .set({ dispensecompositionuid: dispenseCompositionUid })
            .where(eq(pharmacyOrders.orderid, orderid));
        } else {
          console.warn("[OpenEHR] Patient has no national ID, skipping OpenEHR integration");
          dispenseCompositionUid = `dispense-${orderid}-${Date.now()}-no-ehr`;
        }
      } else {
        console.warn("[OpenEHR] No openEHR order ID or patient ID, skipping OpenEHR integration");
      }
    } catch (openehrError) {
      console.error("[OpenEHR Dispense Composition Error]", openehrError);
      // Create fallback UID but continue - don't fail the whole dispense process
      dispenseCompositionUid = `dispense-${orderid}-${Date.now()}-fallback`;
      
      // Still update the order with fallback UID for traceability
      await db
        .update(pharmacyOrders)
        .set({ dispensecompositionuid: dispenseCompositionUid })
        .where(eq(pharmacyOrders.orderid, orderid));
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
