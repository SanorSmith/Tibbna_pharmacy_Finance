/**
 * Single Pharmacy Order API
 *
 * GET   — order detail with items + patient + invoice
 * PATCH — update order status
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  pharmacyOrders,
  pharmacyOrderItems,
  patients,
  drugs,
  invoices,
  invoiceLines,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/user";

type RouteParams = { params: Promise<{ workspaceid: string; orderid: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Patient
    let patient = null;
    if (order.patientid) {
      const [p] = await db
        .select()
        .from(patients)
        .where(eq(patients.patientid, order.patientid))
        .limit(1);
      patient = p || null;
    }

    // Items with drug info
    const items = await db
      .select({
        itemid: pharmacyOrderItems.itemid,
        orderid: pharmacyOrderItems.orderid,
        drugid: pharmacyOrderItems.drugid,
        drugname: pharmacyOrderItems.drugname,
        dosage: pharmacyOrderItems.dosage,
        quantity: pharmacyOrderItems.quantity,
        unitprice: pharmacyOrderItems.unitprice,
        status: pharmacyOrderItems.status,
        scannedbarcode: pharmacyOrderItems.scannedbarcode,
        scannedat: pharmacyOrderItems.scannedat,
        notes: pharmacyOrderItems.notes,
        batchid: pharmacyOrderItems.batchid,
        // drug details
        drugbarcode: drugs.barcode,
        drugform: drugs.form,
        drugstrength: drugs.strength,
      })
      .from(pharmacyOrderItems)
      .leftJoin(drugs, eq(pharmacyOrderItems.drugid, drugs.drugid))
      .where(eq(pharmacyOrderItems.orderid, orderid));

    // Invoice (if exists)
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.orderid, orderid))
      .limit(1);

    let invLines: any[] = [];
    if (invoice) {
      invLines = await db
        .select()
        .from(invoiceLines)
        .where(eq(invoiceLines.invoiceid, invoice.invoiceid));
    }

    return NextResponse.json({
      order,
      patient,
      items,
      invoice: invoice ? { ...invoice, lines: invLines } : null,
    });
  } catch (error) {
    console.error("[Pharmacy Order Detail GET]", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, orderid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { status, notes } = body;

    const updates: any = { updatedat: new Date() };
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const [updated] = await db
      .update(pharmacyOrders)
      .set(updates)
      .where(eq(pharmacyOrders.orderid, orderid))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error("[Pharmacy Order PATCH]", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
