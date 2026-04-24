/**
 * POS Order Details API
 *
 * GET — dispensed order with items, drug info, batch info, patient
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pharmacyOrders, pharmacyOrderItems, patients } from "@/lib/db/schema";
import { drugs, drugBatches } from "@/lib/db/tables/pharmacy-drugs";
import { eq, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";

type RouteParams = { params: Promise<{ orderId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;

    // Get order
    const [order] = await db
      .select()
      .from(pharmacyOrders)
      .where(eq(pharmacyOrders.orderid, orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Get order items with drug and batch info
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
        batchid: pharmacyOrderItems.batchid,
        // Drug details
        genericname: drugs.genericname,
        form: drugs.form,
        strength: drugs.strength,
        barcode: drugs.barcode,
        // Batch details (if assigned to order)
        lotnumber: drugBatches.lotnumber,
        expirydate: drugBatches.expirydate,
        sellingprice: drugBatches.sellingprice,
        purchaseprice: drugBatches.purchaseprice,
        // Best available batch price (subquery)
        bestBatchPrice: sql<string>`(
          SELECT sellingprice
          FROM drug_batches
          WHERE drugid = ${pharmacyOrderItems.drugid}
            AND expirydate > CURRENT_DATE
            AND sellingprice IS NOT NULL
          ORDER BY expirydate ASC
          LIMIT 1
        )`.as("bestBatchPrice"),
      })
      .from(pharmacyOrderItems)
      .leftJoin(drugs, eq(pharmacyOrderItems.drugid, drugs.drugid))
      .leftJoin(drugBatches, eq(pharmacyOrderItems.batchid, drugBatches.batchid))
      .where(eq(pharmacyOrderItems.orderid, orderId));

    // Get patient if exists
    let patient = null;
    if (order.patientid) {
      const [p] = await db
        .select()
        .from(patients)
        .where(eq(patients.patientid, order.patientid))
        .limit(1);
      patient = p || null;
    }

    return NextResponse.json({
      order,
      items,
      patient,
    });
  } catch (error) {
    console.error("[POS Order Details]", error);
    return NextResponse.json(
      { error: "Failed to get order details" },
      { status: 500 }
    );
  }
}
