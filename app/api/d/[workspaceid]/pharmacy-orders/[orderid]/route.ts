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
  users,
} from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { Pool } from "pg";

type RouteParams = { params: Promise<{ workspaceid: string; orderid: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, orderid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    // Fetch order with prescriber name
    const [orderData] = await db
      .select({
        order: pharmacyOrders,
        prescribername: users.name,
      })
      .from(pharmacyOrders)
      .leftJoin(users, eq(pharmacyOrders.prescriberid, users.userid))
      .where(eq(pharmacyOrders.orderid, orderid))
      .limit(1);

    if (!orderData || orderData.order.workspaceid !== workspaceid) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = { ...orderData.order, prescribername: orderData.prescribername };

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

    // Items with drug info + inventory price
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
        // Best available batch selling price (in-stock + non-expired via pharmacy_stock_levels)
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
      })
      .from(pharmacyOrderItems)
      .leftJoin(drugs, eq(pharmacyOrderItems.drugid, drugs.drugid))
      .where(eq(pharmacyOrderItems.orderid, orderid));

    // Fetch prices from inventory for items that don't have unitprice
    const itemsWithPrices = await Promise.all(
      items.map(async (item: any) => {
        if (item.unitprice) return item;
        
        // Fetch selling price from inventory
        const priceResult = await pool.query(`
          SELECT ib.selling_price
          FROM items i
          LEFT JOIN item_batches ib ON ib.item_id = i.id
          WHERE i.name ILIKE $1
            AND i.is_active = true
            AND ib.quantity > 0
          ORDER BY ib.expiry_date ASC
          LIMIT 1
        `, [item.drugname]);
        
        return {
          ...item,
          unitprice: priceResult.rows[0]?.selling_price || null
        };
      })
    );

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
      items: itemsWithPrices,
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
