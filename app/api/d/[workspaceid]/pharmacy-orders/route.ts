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
import { eq, and, desc, ilike, sql, inArray } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { z } from "zod";
import { getOpenEHREHRBySubjectId, createOpenEHRComposition } from "@/lib/openehr/openehr";

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

    const conditions: any[] = [eq(pharmacyOrders.workspaceid, workspaceid)];
    if (status) conditions.push(eq(pharmacyOrders.status, status as any));

    const orders = await db
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
      .leftJoin(users, eq(pharmacyOrders.prescriberid, users.userid))
      .where(and(...conditions))
      .orderBy(desc(pharmacyOrders.createdat))
      .limit(200);

    // Fetch order items for each order
    const orderIds = orders.map(o => o.orderid);
    const items = orderIds.length > 0 ? await db
      .select({
        orderid: pharmacyOrderItems.orderid,
        drugname: pharmacyOrderItems.drugname,
        quantity: pharmacyOrderItems.quantity,
        unitprice: pharmacyOrderItems.unitprice,
      })
      .from(pharmacyOrderItems)
      .where(inArray(pharmacyOrderItems.orderid, orderIds)) : [];

    // Group items by order
    const itemsByOrder = items.reduce((acc, item) => {
      if (!acc[item.orderid]) acc[item.orderid] = [];
      acc[item.orderid].push(item);
      return acc;
    }, {} as Record<string, typeof items>);

    // Calculate payment status and add items to orders
    const ordersWithDetails = orders.map(order => {
      const orderItems = itemsByOrder[order.orderid] || [];
      const totalAmount = orderItems.reduce((sum, item) => 
        sum + (parseFloat(item.unitprice || "0") * item.quantity), 0
      );
      const isPaid = order.status === "DISPENSED" && totalAmount > 0;
      
      return {
        ...order,
        items: orderItems,
        totalAmount,
        paymentStatus: isPaid ? "PAID" : totalAmount > 0 ? "PENDING" : "N/A",
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
  prescriberid: z.string().uuid().optional(),
  items: z.array(
    z.object({
      drugid: z.string().uuid().optional().or(z.literal("")),
      drugname: z.string(),
      dosage: z.string().optional(),
      quantity: z.number().int().positive().default(1),
      route: z.string().optional(),
      frequency: z.string().optional(),
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

    // Create order
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
        metadata: data.metadata || {},
      })
      .returning();

    // Resolve drug prices and insert items
    const itemValues = [];
    for (const item of data.items) {
      let unitprice: string | null = null;
      const drugid = item.drugid && item.drugid !== "" ? item.drugid : null;
      
      if (drugid) {
        const [drug] = await db
          .select()
          .from(drugs)
          .where(eq(drugs.drugid, drugid))
          .limit(1);
        // unitprice will be resolved at dispense from batch
      }

      itemValues.push({
        orderid: order.orderid,
        drugid: drugid,
        drugname: item.drugname,
        dosage: item.dosage || null,
        quantity: item.quantity,
        unitprice,
        status: "PENDING" as const,
      });
    }

    const items = await db
      .insert(pharmacyOrderItems)
      .values(itemValues)
      .returning();

    // Create OpenEHR composition if patient exists
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
            // Create OpenEHR composition for each medication item
            for (const item of items) {
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
                "template_clinical_encounter_v1/medication_order/order:0/medication_item": item.drugname,
                "template_clinical_encounter_v1/medication_order/order:0/route:0": data.items.find(i => i.drugname === item.drugname)?.route || "Oral",
                "template_clinical_encounter_v1/medication_order/order:0/timing": data.items.find(i => i.drugname === item.drugname)?.frequency || "As directed",
                "template_clinical_encounter_v1/medication_order/order:0/overall_directions_description": 
                  `${item.dosage || ""} ${data.items.find(i => i.drugname === item.drugname)?.route || "Oral"} ${data.items.find(i => i.drugname === item.drugname)?.frequency || ""}`.trim(),
              };

              if (data.notes) {
                compositionData["template_clinical_encounter_v1/medication_order/order:0/comment:0"] = 
                  `Pharmacy Order - ${data.notes}`;
              }

              compositionUid = await createOpenEHRComposition(
                ehrId,
                "template_clinical_encounter_v1",
                compositionData
              );

              // Update order with OpenEHR composition UID
              if (compositionUid && !order.openehrorderid) {
                await db
                  .update(pharmacyOrders)
                  .set({ openehrorderid: compositionUid })
                  .where(eq(pharmacyOrders.orderid, order.orderid));
              }
            }
          }
        }
      } catch (openEhrError) {
        console.error("[Pharmacy Orders] OpenEHR integration failed:", openEhrError);
        // Continue even if OpenEHR fails - order is still created locally
      }
    }

    return NextResponse.json({ order, items, openehrCompositionUid: compositionUid }, { status: 201 });
  } catch (error) {
    console.error("[Pharmacy Orders POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
