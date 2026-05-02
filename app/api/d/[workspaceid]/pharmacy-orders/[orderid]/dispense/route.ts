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
import { pharmacyOrders, pharmacyOrderItems, invoices, invoiceLines, itemBatches } from "@/lib/db/schema";
import { drugs, drugBatches } from "@/lib/db/tables/pharmacy-drugs";
import { stockLevels, stockMovements } from "@/lib/db/tables/pharmacy-stock";
import { eq, sql } from "drizzle-orm";
import { createMedicationDispenseComposition, MEDICATION_DISPENSE_ACTION_STATES } from "@/lib/openehr/medication-dispense";
import { createOpenEHRComposition } from "@/lib/openehr/openehr";
import { patients } from "@/lib/db/tables/patient";
import { Pool } from "pg";

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

    // Check if at least one item is ready to dispense
    const scannedItems = items.filter(
      (i) => i.status === "SCANNED" || i.status === "SUBSTITUTED"
    );
    
    const allReady = items.every(
      (i) => i.status === "SCANNED" || i.status === "DISPENSED" || i.status === "SUBSTITUTED"
    );

    if (scannedItems.length === 0) {
      return NextResponse.json({
        message: "No items scanned yet — scan at least one item before dispensing",
        order: { ...order, status: "IN_PROGRESS" },
        items,
        allScanned: false,
      });
    }
    
    // Allow partial dispensing - only process scanned items
    const itemsToDispense = allReady ? items : scannedItems;

    // ── Process scanned items → finalize ──────────────────────────────────
    // 1. Validate batch expiry before dispensing
    const expiryWarnings: string[] = [];
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const item of itemsToDispense) {
      if (item.batchid && isValidUUID(item.batchid)) {
        try {
          const [batch] = await db
            .select()
            .from(drugBatches)
            .where(eq(drugBatches.batchid, item.batchid))
            .limit(1);

          if (batch) {
            const expiryDate = new Date(batch.expirydate);
            
            // Check if expired
            if (expiryDate < today) {
              return NextResponse.json({
                error: `Cannot dispense: ${item.drugname} batch ${batch.lotnumber} expired on ${batch.expirydate}`,
                expiredBatch: {
                  drugname: item.drugname,
                  lotnumber: batch.lotnumber,
                  expirydate: batch.expirydate,
                }
              }, { status: 400 });
            }
            
            // Warn if expiring within 30 days
            if (expiryDate < thirtyDaysFromNow) {
              const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              expiryWarnings.push(`${item.drugname} batch ${batch.lotnumber} expires in ${daysUntilExpiry} days (${batch.expirydate})`);
            }
          }
        } catch (batchError) {
          console.error(`Error checking batch expiry for item ${item.itemid}:`, batchError);
        }
      }
    }

    // Log expiry warnings
    if (expiryWarnings.length > 0) {
      console.warn('[Dispense Expiry Warnings]', expiryWarnings);
    }

    // 2. Deduct stock from item_batches + create movements
    let dispensedCount = 0;
    let backorderedCount = 0;
    const backorderedItems: string[] = [];
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    for (const item of itemsToDispense) {
      try {
        // Try to find the batch by scanned barcode if available
        let batchId = null;
        if (item.scannedbarcode) {
          const batchLookup = await pool.query(`
            SELECT ib.id, ib.batch_number, ib.quantity
            FROM items i
            JOIN item_batches ib ON ib.item_id = i.id
            WHERE i.barcode = $1
              AND ib.quantity > 0
            ORDER BY ib.expiry_date ASC NULLS LAST
            LIMIT 1
          `, [item.scannedbarcode]);
          
          if (batchLookup.rows.length > 0) {
            batchId = batchLookup.rows[0].id;
          }
        }

        if (batchId) {
          // Reduce quantity in inventory_stock (unified inventory system)
          const stockUpdateResult = await pool.query(`
            UPDATE inventory_stock
            SET quantity = GREATEST(0, quantity - $1),
                updated_at = NOW()
            WHERE batch_id = $2
              AND quantity >= $1
            RETURNING id, quantity
          `, [item.quantity, batchId]);

          if (stockUpdateResult.rows.length > 0) {
            // Successfully dispensed from the scanned batch
            await db
              .update(pharmacyOrderItems)
              .set({ status: "DISPENSED" })
              .where(eq(pharmacyOrderItems.itemid, item.itemid));
            
            dispensedCount++;
            console.log(`Dispensed ${item.quantity} units from batch (inventory_stock updated)`);
            continue;
          } else {
            // Insufficient quantity in the scanned batch
            backorderedCount++;
            backorderedItems.push(`${item.drugname} (insufficient stock in scanned batch)`);
            console.warn(`Insufficient stock in batch ${batchId} for ${item.drugname}`);
            continue;
          }
        }

        // Fallback: try to find any available batch for this drug by drug_id (unified inventory system)
        const batchQuery = await pool.query(`
          SELECT ib.id, ist.quantity as stock_quantity, ib.batch_number
          FROM item_batches ib
          JOIN items i ON i.id = ib.item_id
          JOIN inventory_stock ist ON ist.batch_id = ib.id
          WHERE i.drug_id = $1
            AND ist.quantity >= $2
            AND i.is_active = true
          ORDER BY ib.expiry_date ASC NULLS LAST
          LIMIT 1
        `, [item.drugid, item.quantity]);

        if (batchQuery.rows.length > 0) {
          const batch = batchQuery.rows[0];
          
          // Reduce quantity in inventory_stock (unified inventory system)
          await pool.query(`
            UPDATE inventory_stock
            SET quantity = quantity - $1,
                updated_at = NOW()
            WHERE batch_id = $2
          `, [item.quantity, batch.id]);

          await db
            .update(pharmacyOrderItems)
            .set({ 
              status: "DISPENSED",
              batchid: batch.id
            })
            .where(eq(pharmacyOrderItems.itemid, item.itemid));
          
          dispensedCount++;
          console.log(`Dispensed ${item.quantity} units of ${item.drugname} from batch ${batch.batch_number} (inventory_stock updated)`);
        } else {
          // No sufficient stock found
          backorderedCount++;
          backorderedItems.push(`${item.drugname} (out of stock)`);
          console.warn(`No sufficient stock for ${item.drugname}`);
        }

        // Legacy stock levels handling (keep for backward compatibility)
        if (!item.drugid) {
          console.log(`Skipping legacy stock check for ${item.itemid} - no drugid`);
          continue;
        }

        if (!isValidUUID(item.drugid)) {
          console.log(`Skipping legacy stock check for ${item.itemid} - invalid drugid format`);
          continue;
        }

        const [sl] = await db
          .select()
          .from(stockLevels)
          .where(eq(stockLevels.drugid, item.drugid))
          .limit(1);

        if (sl) {
          const availableQty = sl.quantity;
          
          // Check if sufficient stock is available
          if (availableQty >= item.quantity) {
            // Full quantity available - dispense normally
            const newQty = Math.max(0, sl.quantity - item.quantity);
            const newReserved = Math.max(0, sl.reservedquantity - item.quantity);
            await db
              .update(stockLevels)
              .set({ 
                quantity: newQty, 
                reservedquantity: newReserved,
                updatedat: new Date() 
              })
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
              performedby: validPerformedBy ?? null,
            });

            // Mark item dispensed and record location
            await db
              .update(pharmacyOrderItems)
              .set({ 
                status: "DISPENSED",
                dispenselocationid: sl.locationid 
              })
              .where(eq(pharmacyOrderItems.itemid, item.itemid));
            
            dispensedCount++;
            console.log(`Dispensed ${item.quantity} units of ${item.drugname}`);
          } else {
            // Insufficient stock - mark as backordered
            await db
              .update(pharmacyOrderItems)
              .set({ 
                status: "PENDING",
                notes: `Backordered: Only ${availableQty} of ${item.quantity} units available`
              })
              .where(eq(pharmacyOrderItems.itemid, item.itemid));
            
            backorderedCount++;
            backorderedItems.push(`${item.drugname} (need ${item.quantity}, have ${availableQty})`);
            console.warn(`Insufficient stock for ${item.drugname}: need ${item.quantity}, have ${availableQty}`);
          }
        } else {
          // No stock level found - mark as backordered
          await db
            .update(pharmacyOrderItems)
            .set({ 
              status: "PENDING",
              notes: "Backordered: No stock available"
            })
            .where(eq(pharmacyOrderItems.itemid, item.itemid));
          
          backorderedCount++;
          backorderedItems.push(`${item.drugname} (no stock)`);
          console.warn(`No stock level found for ${item.drugname}`);
        }
      } catch (itemError) {
        console.error(`Error processing item ${item.itemid}:`, itemError);
        // Continue with next item instead of failing the entire process
        continue;
      }
    }

    // 2. Mark order status based on dispensed vs backordered vs pending items
    // Validate user.userid before using it
    let validDispensedBy: string | null = user.userid;
    if (validDispensedBy && !isValidUUID(validDispensedBy)) {
      console.log(`Invalid user.userid format: ${validDispensedBy}, using null`);
      validDispensedBy = null;
    }
    
    // Count pending (unscanned) items
    const pendingItems = items.filter(i => i.status === "PENDING").length;
    
    // Determine final order status
    let finalStatus: "DISPENSED" | "PARTIALLY_DISPENSED";
    if (pendingItems > 0 || (backorderedCount > 0 && dispensedCount > 0)) {
      // Some items not dispensed (either pending/unscanned or backordered)
      finalStatus = "PARTIALLY_DISPENSED";
      console.log(`Partial dispense: ${dispensedCount} dispensed, ${backorderedCount} backordered, ${pendingItems} pending`);
    } else if (dispensedCount > 0 && backorderedCount === 0) {
      // All items dispensed successfully
      finalStatus = "DISPENSED";
      console.log(`Full dispense: ${dispensedCount} items dispensed`);
    } else {
      // All scanned items backordered - keep as IN_PROGRESS
      return NextResponse.json({
        error: "Cannot complete dispense: all scanned items are out of stock",
        backorderedItems,
      }, { status: 400 });
    }
    
    const [updatedOrder] = await db
      .update(pharmacyOrders)
      .set({
        status: finalStatus,
        dispensedby: validDispensedBy,
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
        // First try drug_batches (pharmacy drug system)
        const [batch] = await db
          .select()
          .from(drugBatches)
          .where(eq(drugBatches.batchid, item.batchid))
          .limit(1);
        if (batch?.sellingprice) price = parseFloat(batch.sellingprice);

        // If not found, try item_batches (inventory system)
        if (!price) {
          const [invBatch] = await db
            .select()
            .from(itemBatches)
            .where(eq(itemBatches.id, item.batchid))
            .limit(1);
          if (invBatch?.sellingprice) price = parseFloat(invBatch.sellingprice);
        }
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

    const statusMsg = finalStatus === "PARTIALLY_DISPENSED" 
      ? `Partially dispensed: ${dispensedCount} items dispensed, ${backorderedCount} backordered`
      : `Successfully dispensed order ${orderid} with ${dispensedCount} items`;
    console.log(statusMsg);
    
    await pool.end();

    return NextResponse.json({
      message: finalStatus === "PARTIALLY_DISPENSED"
        ? `Partial dispense completed: ${dispensedCount} dispensed, ${backorderedCount} backordered`
        : expiryWarnings.length > 0 
          ? `Order dispensed successfully (${expiryWarnings.length} expiry warning${expiryWarnings.length > 1 ? 's' : ''})`
          : "Order dispensed successfully",
      allScanned: true,
      order: { ...order, status: finalStatus, dispensecompositionuid: dispenseCompositionUid },
      invoice: inv,
      openEhrComposition: dispenseCompositionUid,
      dispensedCount,
      backorderedCount,
      backorderedItems: backorderedCount > 0 ? backorderedItems : undefined,
      expiryWarnings: expiryWarnings.length > 0 ? expiryWarnings : undefined,
    });
  } catch (error) {
    console.error("[Pharmacy Dispense POST]", error);
    return NextResponse.json({ error: "Failed to dispense" }, { status: 500 });
  }
}
