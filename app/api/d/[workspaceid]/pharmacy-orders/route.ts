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
} from "@/lib/db/schema";
import { eq, and, desc, ilike } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { z } from "zod";

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
      })
      .from(pharmacyOrders)
      .leftJoin(patients, eq(pharmacyOrders.patientid, patients.patientid))
      .where(and(...conditions))
      .orderBy(desc(pharmacyOrders.createdat))
      .limit(200);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[Pharmacy Orders GET]", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

// ── POST: create / ingest order ───────────────────────────────────────
const orderSchema = z.object({
  patientid: z.string().uuid().optional(),
  source: z.enum(["openehr", "manual"]).default("manual"),
  openehrorderid: z.string().optional(),
  priority: z.enum(["routine", "urgent", "stat"]).default("routine"),
  notes: z.string().optional(),
  prescriberid: z.string().uuid().optional(),
  items: z.array(
    z.object({
      drugid: z.string().uuid().optional(),
      drugname: z.string(),
      dosage: z.string().optional(),
      quantity: z.number().int().positive().default(1),
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
      if (item.drugid) {
        const [drug] = await db
          .select()
          .from(drugs)
          .where(eq(drugs.drugid, item.drugid))
          .limit(1);
        // unitprice will be resolved at dispense from batch
      }

      itemValues.push({
        orderid: order.orderid,
        drugid: item.drugid || null,
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

    return NextResponse.json({ order, items }, { status: 201 });
  } catch (error) {
    console.error("[Pharmacy Orders POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
