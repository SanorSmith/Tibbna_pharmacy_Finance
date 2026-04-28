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
        quantitydispensed: pharmacyOrderItems.quantitydispensed,
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
        // Best available batch selling price (matches POS search pattern: in-stock + non-expired)
        bestBatchPrice: sql<string>`(
          SELECT db.sellingprice
          FROM drug_batches db
          WHERE db.drugid = ${pharmacyOrderItems.drugid}
            AND db.expirydate > CURRENT_DATE
            AND db.batchid IN (
              SELECT psl.batchid FROM pharmacy_stock_levels psl
              WHERE psl.drugid = ${pharmacyOrderItems.drugid} AND psl.quantity > 0
            )
          ORDER BY db.expirydate ASC
          LIMIT 1
        )`.as("bestBatchPrice"),
        // Best available batch purchase price (fallback, same in-stock filter)
        bestBatchPurchasePrice: sql<string>`(
          SELECT db.purchaseprice
          FROM drug_batches db
          WHERE db.drugid = ${pharmacyOrderItems.drugid}
            AND db.expirydate > CURRENT_DATE
            AND db.batchid IN (
              SELECT psl.batchid FROM pharmacy_stock_levels psl
              WHERE psl.drugid = ${pharmacyOrderItems.drugid} AND psl.quantity > 0
            )
          ORDER BY db.expirydate ASC
          LIMIT 1
        )`.as("bestBatchPurchasePrice"),
        // Available stock for this drug
        availableStock: sql<number>`COALESCE((
          SELECT SUM(psl.quantity)
          FROM pharmacy_stock_levels psl
          WHERE psl.drugid = ${pharmacyOrderItems.drugid}
            AND psl.batchid IN (
              SELECT db.batchid FROM drug_batches db
              WHERE db.drugid = ${pharmacyOrderItems.drugid} AND db.expirydate > CURRENT_DATE
            )
        ), 0)`.as("availableStock"),
        // Fallback: find price by drug NAME (handles duplicate drug records across workspaces)
        nameBasedPrice: sql<string>`(
          SELECT db.sellingprice
          FROM drugs d2
          JOIN drug_batches db ON db.drugid = d2.drugid
          JOIN pharmacy_stock_levels psl ON psl.batchid = db.batchid AND psl.drugid = d2.drugid
          WHERE d2.name = ${pharmacyOrderItems.drugname}
            AND db.expirydate > CURRENT_DATE
            AND psl.quantity > 0
            AND db.sellingprice IS NOT NULL
          ORDER BY db.expirydate ASC
          LIMIT 1
        )`.as("nameBasedPrice"),
        // Fallback: stock count by drug name
        nameBasedStock: sql<number>`COALESCE((
          SELECT SUM(psl.quantity)
          FROM drugs d2
          JOIN drug_batches db ON db.drugid = d2.drugid
          JOIN pharmacy_stock_levels psl ON psl.batchid = db.batchid AND psl.drugid = d2.drugid
          WHERE d2.name = ${pharmacyOrderItems.drugname}
            AND db.expirydate > CURRENT_DATE
        ), 0)`.as("nameBasedStock"),
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

    // Debug: log price data AND check ALL inventory tables
    for (const item of items as any[]) {
      console.log(`[POS Price Debug] Drug: ${item.drugname} | drugid: ${item.drugid} | bestBatchPrice: ${item.bestBatchPrice} | nameBasedPrice: ${item.nameBasedPrice} | nameBasedStock: ${item.nameBasedStock} | availableStock: ${item.availableStock}`);
      
      // Check which inventory tables actually exist and have data
      const inventoryCheck = await db.execute(sql`
        SELECT 
          'pharmacy_stock_levels' as table_name,
          COUNT(*) as records,
          SUM(quantity) as total_qty,
          NULL as avg_price
        FROM pharmacy_stock_levels psl
        WHERE psl.drugid = ${item.drugid}
        
        UNION ALL
        
        SELECT 
          'drug_batches' as table_name,
          COUNT(*) as records,
          0 as total_qty,
          AVG(sellingprice) as avg_price
        FROM drug_batches db
        WHERE db.drugid = ${item.drugid}
      `);
      console.log(`[POS All Inventory Tables] "${item.drugname}":`, inventoryCheck);
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
