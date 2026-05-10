/**
 * POS Order Details API
 *
 * GET — dispensed order with items, drug info, batch info, patient
 *
 * Uses the unified inventory system: items → item_batches → inventory_stock
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  posSales,
  posSaleItems,
  pharmacyOrders,
  pharmacyOrderItems,
  patients,
} from "@/lib/db/schema";
import { drugs } from "@/lib/db/tables/pharmacy-drugs";
import * as schema from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
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

    // Get order items with drug info and prices from unified inventory system
    const orderItems = await db
      .select({
        itemid: pharmacyOrderItems.itemid,
        orderid: pharmacyOrderItems.orderid,
        drugid: pharmacyOrderItems.drugid,
        drugname: pharmacyOrderItems.drugname,
        dosage: pharmacyOrderItems.dosage,
        quantity: pharmacyOrderItems.quantity,
        quantitydispensed: pharmacyOrderItems.quantitydispensed,
        unitprice: pharmacyOrderItems.unitprice,
        status: pharmacyOrderItems.status,
        batchid: pharmacyOrderItems.batchid,
        // Drug details from drugs table
        genericname: drugs.genericname,
        form: drugs.form,
        strength: drugs.strength,
        barcode: drugs.barcode,
        // --- Unified inventory system: items → item_batches → inventory_stock ---
        // Item ID from items table (linked by drug_id or name)
        inventoryItemId: sql<string>`(
          SELECT i.id FROM items i
          WHERE i.drug_id = ${pharmacyOrderItems.drugid}
             OR i.name = ${pharmacyOrderItems.drugname}
          LIMIT 1
        )`.as("inventoryItemId"),
        // Best batch ID (FIFO: earliest-expiry, non-quarantined, in-stock)
        bestBatchId: sql<string>`(
          SELECT ib.id
          FROM items i
          JOIN item_batches ib ON ib.item_id = i.id
          JOIN inventory_stock ist ON ist.item_id = i.id AND ist.batch_id = ib.id
          WHERE (i.drug_id = ${pharmacyOrderItems.drugid} OR i.name = ${pharmacyOrderItems.drugname})
            AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP)
            AND ib.is_quarantined = false
            AND ist.quantity > 0
          ORDER BY ib.expiry_date ASC NULLS LAST
          LIMIT 1
        )`.as("bestBatchId"),
        // Selling price from best FIFO batch
        sellingprice: sql<string>`(
          SELECT ib.selling_price
          FROM items i
          JOIN item_batches ib ON ib.item_id = i.id
          JOIN inventory_stock ist ON ist.item_id = i.id AND ist.batch_id = ib.id
          WHERE (i.drug_id = ${pharmacyOrderItems.drugid} OR i.name = ${pharmacyOrderItems.drugname})
            AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP)
            AND ib.is_quarantined = false
            AND ist.quantity > 0
            AND ib.selling_price IS NOT NULL
          ORDER BY ib.expiry_date ASC NULLS LAST
          LIMIT 1
        )`.as("sellingprice"),
        // Unit cost from best FIFO batch
        unitcost: sql<string>`(
          SELECT ib.unit_cost
          FROM items i
          JOIN item_batches ib ON ib.item_id = i.id
          JOIN inventory_stock ist ON ist.item_id = i.id AND ist.batch_id = ib.id
          WHERE (i.drug_id = ${pharmacyOrderItems.drugid} OR i.name = ${pharmacyOrderItems.drugname})
            AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP)
            AND ib.is_quarantined = false
            AND ist.quantity > 0
          ORDER BY ib.expiry_date ASC NULLS LAST
          LIMIT 1
        )`.as("unitcost"),
        // Batch number from best FIFO batch
        lotnumber: sql<string>`(
          SELECT ib.batch_number
          FROM items i
          JOIN item_batches ib ON ib.item_id = i.id
          JOIN inventory_stock ist ON ist.item_id = i.id AND ist.batch_id = ib.id
          WHERE (i.drug_id = ${pharmacyOrderItems.drugid} OR i.name = ${pharmacyOrderItems.drugname})
            AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP)
            AND ib.is_quarantined = false
            AND ist.quantity > 0
          ORDER BY ib.expiry_date ASC NULLS LAST
          LIMIT 1
        )`.as("lotnumber"),
        // Expiry date from best FIFO batch
        expirydate: sql<string>`(
          SELECT ib.expiry_date
          FROM items i
          JOIN item_batches ib ON ib.item_id = i.id
          JOIN inventory_stock ist ON ist.item_id = i.id AND ist.batch_id = ib.id
          WHERE (i.drug_id = ${pharmacyOrderItems.drugid} OR i.name = ${pharmacyOrderItems.drugname})
            AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP)
            AND ib.is_quarantined = false
            AND ist.quantity > 0
          ORDER BY ib.expiry_date ASC NULLS LAST
          LIMIT 1
        )`.as("expirydate"),
        // Total available stock across all valid batches (including those without batches)
        availableStock: sql<number>`COALESCE((
          SELECT SUM(ist.quantity)
          FROM items i
          JOIN inventory_stock ist ON ist.item_id = i.id
          LEFT JOIN item_batches ib ON ib.id = ist.batch_id AND ib.item_id = i.id
          WHERE (i.drug_id = ${pharmacyOrderItems.drugid} OR i.name = ${pharmacyOrderItems.drugname})
            AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP OR ib.id IS NULL)
            AND (ib.is_quarantined = false OR ib.id IS NULL)
            AND ist.quantity > 0
        ), 0)`.as("availableStock"),
      })
      .from(pharmacyOrderItems)
      .leftJoin(drugs, eq(pharmacyOrderItems.drugid, drugs.drugid))
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
      items: orderItems,
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
