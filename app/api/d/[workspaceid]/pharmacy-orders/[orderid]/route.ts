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

    // Fetch order with prescriber and dispenser names
    const [orderData] = await db
      .select({
        order: pharmacyOrders,
        prescribername: sql<string>`prescriber.name`.as('prescribername'),
        dispensedbyname: sql<string>`dispenser.name`.as('dispensedbyname'),
      })
      .from(pharmacyOrders)
      .leftJoin(sql`users AS prescriber`, sql`prescriber.userid = ${pharmacyOrders.prescriberid}`)
      .leftJoin(sql`users AS dispenser`, sql`dispenser.userid = ${pharmacyOrders.dispensedby}`)
      .where(eq(pharmacyOrders.orderid, orderid))
      .limit(1);

    if (!orderData || orderData.order.workspaceid !== workspaceid) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = { 
      ...orderData.order, 
      prescribername: orderData.prescribername,
      dispensedbyname: orderData.dispensedbyname
    };

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
        interaction: drugs.interaction,
        warning: drugs.warning,
        // Best available batch selling price from item_batches (new system)
        bestBatchPrice: sql<string>`(
          SELECT ib.selling_price
          FROM items i
          JOIN item_batches ib ON ib.item_id = i.id
          WHERE i.name = ${pharmacyOrderItems.drugname}
            AND i.is_active = true
            AND ib.quantity > 0
            AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_DATE)
          ORDER BY ib.expiry_date ASC NULLS LAST
          LIMIT 1
        )`.as("bestBatchPrice"),
        // Fallback: find price by drug NAME (handles duplicate drug records across workspaces)
        nameBasedPrice: sql<string>`(
          SELECT ib.selling_price
          FROM items i
          JOIN item_batches ib ON ib.item_id = i.id
          WHERE i.name = ${pharmacyOrderItems.drugname}
            AND i.is_active = true
            AND ib.quantity > 0
            AND ib.selling_price IS NOT NULL
            AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_DATE)
          ORDER BY ib.expiry_date ASC NULLS LAST
          LIMIT 1
        )`.as("nameBasedPrice"),
        // Fallback: selling price from item_batches (dual-schema inventory system)
        inventorySellingPrice: sql<string>`(
          SELECT ib.selling_price
          FROM items i
          JOIN item_batches ib ON ib.item_id = i.id
          WHERE i.name = ${pharmacyOrderItems.drugname}
            AND ib.selling_price IS NOT NULL
          ORDER BY ib.created_at DESC
          LIMIT 1
        )`.as("inventorySellingPrice"),
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
          LEFT JOIN (
            SELECT item_id, selling_price, expiry_date, quantity
            FROM item_batches
            WHERE quantity > 0
          ) ib ON ib.item_id = i.id
          WHERE i.name ILIKE $1
            AND i.is_active = true
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
