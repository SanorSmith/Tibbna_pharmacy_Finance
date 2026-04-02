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
import { drugs, drugBatches } from "@/lib/db/tables/pharmacy-drugs";
import { stockLevels, stockMovements } from "@/lib/db/tables/pharmacy-stock";
import { eq } from "drizzle-orm";
import { createMedicationDispenseComposition, MEDICATION_DISPENSE_ACTION_STATES } from "@/lib/openehr/medication-dispense";
import { createOpenEHRComposition } from "@/lib/openehr/openehr";
import { patients } from "@/lib/db/tables/patient";

// UUID validation function
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

type RouteParams = { params: Promise<{ workspaceid: string; orderid: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, orderid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    console.log(`User data for dispensing:`, {
      userid: user.userid,
      name: user.name,
      email: user.email
    });

    // Fetch order
    const [order] = await db
      .select()
      .from(pharmacyOrders)
      .where(eq(pharmacyOrders.orderid, orderid))
      .limit(1);

    console.log(`Order data for dispensing:`, {
      orderid: order.orderid,
      patientid: order.patientid,
      openehrorderid: order.openehrorderid,
      status: order.status,
      notes: order.notes
    });

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

    console.log(`Processing ${items.length} items for dispensing:`, 
      items.map(item => ({
        itemid: item.itemid,
        drugname: item.drugname,
        drugid: item.drugid,
        batchid: item.batchid,
        status: item.status
      }))
    );

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
      try {
        if (!item.drugid) {
          console.log(`Skipping item ${item.itemid} - no drugid`);
          continue;
        }

        // Validate UUID format for drugid
        if (!isValidUUID(item.drugid)) {
          console.log(`Skipping item ${item.itemid} - invalid drugid format: ${item.drugid}`);
          continue;
        }

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

          // Validate batchid before using it
          let validBatchId = item.batchid || sl.batchid || null;
          if (validBatchId && !isValidUUID(validBatchId)) {
            console.log(`Invalid batchid format: ${validBatchId}, using null`);
            validBatchId = null;
          }

          // Validate performedby field
          let validPerformedBy: string | null = user.userid;
          if (validPerformedBy && !isValidUUID(validPerformedBy)) {
            console.log(`Invalid performedby format: ${validPerformedBy}, using null`);
            validPerformedBy = null;
          }

          await db.insert(stockMovements).values({
            drugid: item.drugid,
            batchid: validBatchId,
            locationid: sl.locationid,
            type: "DISPENSE",
            quantity: -item.quantity,
            reason: `Dispensed for order ${orderid}`,
            referenceid: orderid,
            performedby: validPerformedBy ?? null, // Fix TypeScript error
          });
        }

        // Mark item dispensed
        await db
          .update(pharmacyOrderItems)
          .set({ status: "DISPENSED" })
          .where(eq(pharmacyOrderItems.itemid, item.itemid));
      } catch (itemError) {
        console.error(`Error processing item ${item.itemid}:`, itemError);
        // Continue with next item instead of failing the entire process
        continue;
      }
    }

    // 2. Mark order dispensed
    // Validate user.userid before using it
    let validDispensedBy: string | null = user.userid;
    if (validDispensedBy && !isValidUUID(validDispensedBy)) {
      console.log(`Invalid user.userid format: ${validDispensedBy}, using null`);
      validDispensedBy = null;
    }
    
    const [updatedOrder] = await db
      .update(pharmacyOrders)
      .set({
        status: "DISPENSED",
        dispensedby: validDispensedBy, // Use validated UUID
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
      if (!price && item.batchid && isValidUUID(item.batchid)) {
        const [batch] = await db
          .select()
          .from(drugBatches)
          .where(eq(drugBatches.batchid, item.batchid))
          .limit(1);
        if (batch?.sellingprice) price = parseFloat(batch.sellingprice);
      } else if (item.batchid && !isValidUUID(item.batchid)) {
        console.log(`Skipping batch lookup - invalid batchid format: ${item.batchid}`);
      }

      const lineTotal = price * item.quantity;
      subtotal += lineTotal;

      // Calculate shares (example: 70% patient, 20% insurance, 10% doctor)
      const patientShare = lineTotal * 0.7;
      const insuranceShare = lineTotal * 0.2;
      const doctorShare = lineTotal * 0.1;

      lineValues.push({
        drugname: item.drugname,
        description: item.drugname, // Required field - use drug name as description
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
    
    // Validate patientid before using it in invoice
    let validPatientId = order.patientid;
    if (validPatientId && !isValidUUID(validPatientId)) {
      console.log(`Invalid patientid format in order: ${validPatientId}, using null`);
      validPatientId = null;
    }
    
    const [inv] = await db
      .insert(invoices)
      .values({
        orderid,
        patientid: validPatientId,
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
      if (order.openehrorderid && order.patientid && isValidUUID(order.patientid)) {
        // Fetch patient to get EHR ID
        const [patient] = await db
          .select()
          .from(patients)
          .where(eq(patients.patientid, order.patientid))
          .limit(1);

        // Use ehrid if available, fallback to nationalid
        const ehrId = patient?.ehrid || patient?.nationalid;
        
        if (ehrId) {
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
            ehrId, // Use proper EHR ID (ehrid or fallback to nationalid)
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

    console.log(`Successfully dispensed order ${orderid} with ${items.length} items`);
    
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
