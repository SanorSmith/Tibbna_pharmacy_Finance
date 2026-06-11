/**
 * Pharmacy Orders API
 *
 * GET  — list orders (with optional ?status= filter)
 * POST — ingest an openEHR medication order or create manual order
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  pharmacyOrders,
  pharmacyOrderItems,
  patients,
  drugs,
  users,
} from "@/lib/db/schema";
import { invoices } from "@/lib/db/tables/pharmacy-invoices";
import { posSales } from "@/lib/db/tables/pos-schema";
import { stockLevels } from "@/lib/db/tables/pharmacy-stock";
import { drugBatches } from "@/lib/db/tables/pharmacy-drugs";
import { eq, and, desc, ilike, sql, inArray, asc, gt } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { z } from "zod";
import { getOpenEHREHRBySubjectId, createOpenEHRComposition } from "@/lib/openehr/openehr";

// ── Helper: Select optimal batch using FIFO/expiry logic ──────────────
async function selectOptimalBatch(drugid: string, requiredQty: number) {
  const today = new Date().toISOString().split('T')[0];
  
  // Get all non-expired batches with available stock, ordered by expiry date (FIFO)
  const batchesWithStock = await db
    .select({
      batchid: drugBatches.batchid,
      lotnumber: drugBatches.lotnumber,
      expirydate: drugBatches.expirydate,
      sellingprice: drugBatches.sellingprice,
      quantity: stockLevels.quantity,
      reservedquantity: stockLevels.reservedquantity,
      stocklevelid: stockLevels.stocklevelid,
    })
    .from(drugBatches)
    .innerJoin(stockLevels, eq(stockLevels.batchid, drugBatches.batchid))
    .where(
      and(
        eq(drugBatches.drugid, drugid),
        gt(drugBatches.expirydate, today) // Not expired
      )
    )
    .orderBy(asc(drugBatches.expirydate)); // FIFO: earliest expiry first

  // Find first batch with sufficient available quantity
  for (const batch of batchesWithStock) {
    const availableQty = batch.quantity - batch.reservedquantity;
    if (availableQty >= requiredQty) {
      return {
        batchid: batch.batchid,
        lotnumber: batch.lotnumber,
        expirydate: batch.expirydate,
        sellingprice: batch.sellingprice,
        stocklevelid: batch.stocklevelid,
        availableQty,
      };
    }
  }

  // No single batch has enough - return the batch with most available stock
  if (batchesWithStock.length > 0) {
    const sortedByQty = [...batchesWithStock].sort((a, b) => {
      const availA = a.quantity - a.reservedquantity;
      const availB = b.quantity - b.reservedquantity;
      return availB - availA;
    });
    const best = sortedByQty[0];
    return {
      batchid: best.batchid,
      lotnumber: best.lotnumber,
      expirydate: best.expirydate,
      sellingprice: best.sellingprice,
      stocklevelid: best.stocklevelid,
      availableQty: best.quantity - best.reservedquantity,
    };
  }

  return null; // No batches available
}

// ── GET: list orders ──────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Build base conditions for pharmacy orders table
    const baseConditions: any[] = [eq(pharmacyOrders.workspaceid, workspaceid)];
    if (status) baseConditions.push(eq(pharmacyOrders.status, status as any));

    // Run all queries in parallel for better performance
    const [orders, items, invoicesData, posSalesData] = await Promise.all([
      // Fetch orders with patient name search
      (async () => {
        let query = db
          .select({
            orderid: pharmacyOrders.orderid,
            patientid: pharmacyOrders.patientid,
            status: pharmacyOrders.status,
            source: pharmacyOrders.source,
            priority: pharmacyOrders.priority,
            notes: pharmacyOrders.notes,
            openehrorderid: pharmacyOrders.openehrorderid,
            dispensedby: pharmacyOrders.dispensedby,
            dispensedat: pharmacyOrders.dispensedat,
            createdat: pharmacyOrders.createdat,
            updatedat: pharmacyOrders.updatedat,
            patientfirst: patients.firstname,
            patientlast: patients.lastname,
            prescriberid: pharmacyOrders.prescriberid,
            prescribername: users.name,
            metadata: pharmacyOrders.metadata,
          })
          .from(pharmacyOrders)
          .leftJoin(patients, eq(pharmacyOrders.patientid, patients.patientid))
          .leftJoin(users, eq(pharmacyOrders.prescriberid, users.userid));

        // Build WHERE conditions including patient search
        const whereConditions = [...baseConditions];
        if (search && search.trim()) {
          whereConditions.push(
            sql`(LOWER(${patients.firstname}) LIKE LOWER(${'%' + search.trim() + '%'}) OR LOWER(${patients.lastname}) LIKE LOWER(${'%' + search.trim() + '%'}))`
          );
        }

        return query
          .where(and(...whereConditions))
          .orderBy(desc(pharmacyOrders.createdat))
          .limit(200);
      })(),

      // Fetch all order items (we'll filter by orderIds after)
      db
        .select({
          orderid: pharmacyOrderItems.orderid,
          drugname: pharmacyOrderItems.drugname,
          quantity: pharmacyOrderItems.quantity,
          unitprice: pharmacyOrderItems.unitprice,
        })
        .from(pharmacyOrderItems)
        .innerJoin(pharmacyOrders, eq(pharmacyOrderItems.orderid, pharmacyOrders.orderid))
        .where(and(...baseConditions))
        .orderBy(desc(pharmacyOrders.createdat))
        .limit(1000),

      // Fetch all invoices
      db
        .select({
          orderid: invoices.orderid,
          status: invoices.status,
          total: invoices.total,
        })
        .from(invoices)
        .innerJoin(pharmacyOrders, eq(invoices.orderid, pharmacyOrders.orderid))
        .where(and(...baseConditions)),

      // Fetch all POS sales for these orders to calculate cumulative payments
      db
        .select({
          pharmacyorderid: posSales.pharmacyorderid,
          totalamount: posSales.totalamount,
        })
        .from(posSales)
        .innerJoin(pharmacyOrders, eq(posSales.pharmacyorderid, pharmacyOrders.orderid))
        .where(and(...baseConditions)),
    ]);

    // Group items by order
    const itemsByOrder = items.reduce((acc, item) => {
      if (!acc[item.orderid]) acc[item.orderid] = [];
      acc[item.orderid].push(item);
      return acc;
    }, {} as Record<string, typeof items>);

    // Group invoices by order
    const invoicesByOrder = invoicesData.reduce((acc, inv) => {
      acc[inv.orderid] = { status: inv.status, total: inv.total };
      return acc;
    }, {} as Record<string, { status: string; total: string }>);

    // Group POS sales by order and calculate cumulative payments
    const paymentsByOrder = posSalesData.reduce((acc, sale) => {
      if (!sale.pharmacyorderid) return acc;
      if (!acc[sale.pharmacyorderid]) {
        acc[sale.pharmacyorderid] = 0;
      }
      acc[sale.pharmacyorderid] += parseFloat(sale.totalamount || "0");
      return acc;
    }, {} as Record<string, number>);

    // Calculate payment status and add items to orders
    const ordersWithDetails = orders.map(order => {
      const orderItems = itemsByOrder[order.orderid] || [];
      const totalAmount = orderItems.reduce((sum, item) => 
        sum + (parseFloat(item.unitprice || "0") * item.quantity), 0
      );
      
      const invoice = invoicesByOrder[order.orderid];
      const cumulativePayments = paymentsByOrder[order.orderid] || 0;
      let paymentStatus: string;
      
      // If order is partially dispensed, payment status should be PARTIALLY_PAID
      // even if the invoice for dispensed items is fully paid
      if (order.status === "PARTIALLY_DISPENSED" || order.status === "IN_PROGRESS") {
        paymentStatus = "PARTIALLY_PAID";
      } else if (invoice) {
        // Calculate payment status based on cumulative payments vs invoice total
        const invoiceTotal = parseFloat(invoice.total || "0");
        const TOLERANCE = 0.01;
        
        if (cumulativePayments >= (invoiceTotal - TOLERANCE)) {
          paymentStatus = "PAID";
        } else if (cumulativePayments > 0) {
          paymentStatus = "PARTIALLY_PAID";
        } else {
          paymentStatus = "UNPAID";
        }
      } else if (order.status === "DISPENSED") {
        // Dispensed but no invoice - show as unpaid
        paymentStatus = "UNPAID";
      } else {
        paymentStatus = "UNPAID";
      }
      
      return {
        ...order,
        items: orderItems,
        totalAmount,
        paymentStatus,
      };
    });

    return NextResponse.json({ orders: ordersWithDetails });
  } catch (error) {
    console.error("[Pharmacy Orders GET]", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

// ── POST: create / ingest order ───────────────────────────────────────
const orderSchema = z.object({
  patientid: z.string().uuid().optional(),
  source: z.enum(["openehr", "manual", "PHARMACY"]).default("manual"),
  openehrorderid: z.string().optional(),
  priority: z.enum(["routine", "urgent", "stat"]).default("routine"),
  notes: z.string().optional(),
  prescriberid: z.string().uuid().nullable().optional(),
  prescriberName: z.string().optional(),
  items: z.array(
    z.object({
      drugid: z.string().uuid().optional().or(z.literal("")),
      drugname: z.string(),
      dosage: z.string().optional(),
      quantity: z.number().int().positive().default(1),
      doseAmount: z.string().optional(),
      doseUnit: z.string().optional(),
      route: z.string().optional(),
      timingDirections: z.string().optional(),
      directionDuration: z.string().optional(),
      validUntil: z.string().optional(),
      usage: z.string().optional(),
      asRequired: z.boolean().optional(),
      asRequiredCriterion: z.string().optional(),
      additionalInstruction: z.string().optional(),
      clinicalIndication: z.string().optional(),
      pharmacistNotes: z.string().optional(),
      frequency: z.string().optional(),
      form: z.string().optional(),
      strength: z.string().optional(),
    })
  ).min(1),
  // openEHR-specific fields
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const data = orderSchema.parse(body);

    // Create ONE order with multiple items
    const [order] = await db
      .insert(pharmacyOrders)
      .values({
        workspaceid,
        patientid: data.patientid || null,
        prescriberid: data.prescriberid || null,
        status: "PENDING",
        source: data.source,
        openehrorderid: data.openehrorderid || null,
        priority: data.priority,
        notes: data.notes || null,
        metadata: {
          ...data.metadata,
          multiMedicationOrder: data.items.length > 1,
          medicationCount: data.items.length,
        },
      })
      .returning();

    const allItems: any[] = [];
    const compositionUids: string[] = [];

    // Create items for this order
    for (const item of data.items) {
      // Select optimal batch using FIFO/expiry logic
      let unitprice: string | null = null;
      let selectedBatchId: string | null = null;
      const drugid = item.drugid && item.drugid !== "" ? item.drugid : null;
      
      if (drugid) {
        const optimalBatch = await selectOptimalBatch(drugid, item.quantity);
        if (optimalBatch) {
          selectedBatchId = optimalBatch.batchid;
          unitprice = optimalBatch.sellingprice;
          console.log(`Selected batch ${optimalBatch.lotnumber} (expires: ${optimalBatch.expirydate}) for ${item.drugname}`);
        } else {
          console.warn(`No suitable batch found for ${item.drugname} - order will be created without batch assignment`);
        }
      }

      // Construct comprehensive dosage string from detailed fields
      let dosageString = item.dosage || "";
      if (!dosageString && item.doseAmount && item.doseUnit) {
        // Build comprehensive dosage string with all fields
        const parts = [];
        
        // Dose
        parts.push(`Dose: ${item.doseAmount} ${item.doseUnit}`);
        
        // Route
        if (item.route) parts.push(`Route: ${item.route}`);
        
        // Timing
        if (item.timingDirections) parts.push(`Timing: ${item.timingDirections}`);
        
        // Duration
        if (item.directionDuration) parts.push(`Duration: ${item.directionDuration}`);
        
        // Instructions
        if (item.additionalInstruction) parts.push(`Instructions: ${item.additionalInstruction}`);
        
        // Usage
        if (item.usage) parts.push(`Usage: ${item.usage}`);
        
        // Valid Until
        if (item.validUntil) parts.push(`Valid Until: ${item.validUntil}`);
        
        // As Required
        if (item.asRequired) {
          parts.push(`As Required (PRN): Yes${item.asRequiredCriterion ? ` - ${item.asRequiredCriterion}` : ''}`);
        }
        
        // Pharmacist Notes
        if (item.pharmacistNotes) parts.push(`Pharmacist Notes: ${item.pharmacistNotes}`);
        
        dosageString = parts.join(" | ");
      }

      // Create item for the order with selected batch
      const [orderItem] = await db
        .insert(pharmacyOrderItems)
        .values({
          orderid: order.orderid,
          drugid: drugid,
          batchid: selectedBatchId,
          drugname: item.drugname,
          dosage: dosageString || null,
          quantity: item.quantity,
          unitprice,
          status: "PENDING" as const,
        })
        .returning();

      allItems.push(orderItem);

      // Reserve stock for this item
      if (drugid) {
        try {
          const [stockLevel] = await db
            .select()
            .from(stockLevels)
            .where(eq(stockLevels.drugid, drugid))
            .limit(1);

          if (stockLevel) {
            const availableQty = stockLevel.quantity - stockLevel.reservedquantity;
            if (availableQty >= item.quantity) {
              // Reserve the stock
              await db
                .update(stockLevels)
                .set({
                  reservedquantity: sql`${stockLevels.reservedquantity} + ${item.quantity}`,
                  updatedat: new Date(),
                })
                .where(eq(stockLevels.stocklevelid, stockLevel.stocklevelid));
              
              console.log(`Reserved ${item.quantity} units of ${item.drugname} for order ${order.orderid}`);
            } else {
              console.warn(`Insufficient stock for ${item.drugname}: available=${availableQty}, requested=${item.quantity}`);
              // Note: Order is still created but stock is not reserved
              // You may want to mark the order item status differently or notify the user
            }
          } else {
            console.warn(`No stock level found for drug ${drugid}`);
          }
        } catch (stockError) {
          console.error(`Error reserving stock for ${item.drugname}:`, stockError);
          // Continue with order creation even if stock reservation fails
        }
      }
    }

    // Create OpenEHR composition for the single order if patient exists
    let compositionUid: string | null = null;
    if (data.patientid) {
      try {
        const [patient] = await db
          .select()
          .from(patients)
          .where(eq(patients.patientid, data.patientid))
          .limit(1);

        if (patient) {
          // Find EHR by National ID or patient UUID
          let ehrId: string | null = null;
          if (patient.nationalid) {
            ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
          }
          if (!ehrId) {
            ehrId = await getOpenEHREHRBySubjectId(data.patientid);
          }

          if (ehrId) {
            // Create OpenEHR composition for the single order with multiple medications
            const compositionData: Record<string, unknown> = {
              "template_clinical_encounter_v1/language|code": "en",
              "template_clinical_encounter_v1/language|terminology": "ISO_639-1",
              "template_clinical_encounter_v1/territory|code": "US",
              "template_clinical_encounter_v1/territory|terminology": "ISO_3166-1",
              "template_clinical_encounter_v1/composer|name": user.name || user.email || "Pharmacist",
              "template_clinical_encounter_v1/context/start_time": new Date().toISOString(),
              "template_clinical_encounter_v1/context/setting|code": "238",
              "template_clinical_encounter_v1/context/setting|value": "other care",
              "template_clinical_encounter_v1/context/setting|terminology": "openehr",
              "template_clinical_encounter_v1/category|code": "433",
              "template_clinical_encounter_v1/category|value": "event",
              "template_clinical_encounter_v1/category|terminology": "openehr",
            };

            // Add each medication to the composition
            data.items.forEach((item, index) => {
              const currentItem = allItems[index];
              compositionData[`template_clinical_encounter_v1/medication_order/order:${index}/medication_item`] = item.drugname;
              compositionData[`template_clinical_encounter_v1/medication_order/order:${index}/route:0`] = item.route || "Oral";
              compositionData[`template_clinical_encounter_v1/medication_order/order:${index}/timing`] = item.timingDirections || item.frequency || "As directed";
              compositionData[`template_clinical_encounter_v1/medication_order/order:${index}/overall_directions_description`] = 
                `${currentItem?.dosage || ""} ${item.route || "Oral"} ${item.timingDirections || item.frequency || ""}`.trim();

              // Use structured OpenEHR fields like doctor prescriptions
              if (item.additionalInstruction) {
                compositionData[`template_clinical_encounter_v1/medication_order/order:${index}/additional_instruction:0`] = 
                  item.additionalInstruction;
              }

              if (item.clinicalIndication) {
                compositionData[`template_clinical_encounter_v1/medication_order/order:${index}/clinical_indication:0`] = 
                  item.clinicalIndication;
              }
            });

            // Build comment with structured metadata for retrieval
            const commentParts = [];
            commentParts.push(`Medications: ${data.items.map(item => item.drugname).join(", ")}`);
            if (data.notes) {
              commentParts.push(`Notes: ${data.notes}`);
            }
            commentParts.push(`Issued from: Pharmacy`);
            
            if (commentParts.length > 0) {
              compositionData["template_clinical_encounter_v1/medication_order/order:0/comment"] = 
                commentParts.join(" | ");
            }

            compositionUid = await createOpenEHRComposition(
              ehrId,
              "template_clinical_encounter_v1",
              compositionData
            );

            if (compositionUid) {
              compositionUids.push(compositionUid);
              
              // Update order with OpenEHR composition UID
              await db
                .update(pharmacyOrders)
                .set({ openehrorderid: compositionUid })
                .where(eq(pharmacyOrders.orderid, order.orderid));
            }
          }
        }
      } catch (openEhrError) {
        console.error("[Pharmacy Orders] OpenEHR integration failed:", openEhrError);
        // Continue even if OpenEHR fails - order is still created locally
      }
    }

    return NextResponse.json({ 
      order,
      orders: [order],
      items: allItems, 
      openehrCompositionUids: compositionUids,
      message: `Successfully created order with ${allItems.length} medication(s)`
    }, { status: 201 });
  } catch (error) {
    console.error("[Pharmacy Orders POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
