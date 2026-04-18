import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  controlledDrugLog,
  storeTransactions,
  storeStock,
  items,
  stores,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// GET /api/pharmacy/dispense?storeid=xxx
// Returns dispense history for a store
export async function GET(req: NextRequest) {
  try {
    const storeid = req.nextUrl.searchParams.get("storeid");
    if (!storeid) return NextResponse.json({ error: "storeid required" }, { status: 400 });

    const logs = await db
      .select({
        id:              controlledDrugLog.id,
        actiontype:      controlledDrugLog.actiontype,
        quantity:        controlledDrugLog.quantity,
        patientref:      controlledDrugLog.patientref,
        prescriptionref: controlledDrugLog.prescriptionref,
        dispensedby:     controlledDrugLog.dispensedby,
        witnessedby:     controlledDrugLog.witnessedby,
        notes:           controlledDrugLog.notes,
        createdat:       controlledDrugLog.createdat,
        itemname:        items.name,
        itemcode:        items.itemcode,
        controlled:      items.controlled,
      })
      .from(controlledDrugLog)
      .leftJoin(items, eq(items.id, controlledDrugLog.itemid))
      .where(eq(controlledDrugLog.storeid, storeid))
      .orderBy(sql`${controlledDrugLog.createdat} DESC`)
      .limit(200);

    return NextResponse.json({ logs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/pharmacy/dispense
// Body: { storeid, itemid, batchid?, quantity, patientref, prescriptionref,
//         dispensedby, witnessedby, actiontype?, notes }
// 1. Validates stock available
// 2. Deducts from store_stock
// 3. Inserts store_transaction (DISPENSE)
// 4. Inserts controlled_drug_log (for controlled items) or just store_transaction (non-controlled)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      storeid, itemid, batchid, quantity,
      patientref, prescriptionref,
      dispensedby, witnessedby,
      actiontype = "DISPENSE",
      notes,
    } = body;

    if (!storeid || !itemid || !quantity) {
      return NextResponse.json({ error: "storeid, itemid, quantity required" }, { status: 400 });
    }
    if (quantity <= 0) {
      return NextResponse.json({ error: "Quantity must be > 0" }, { status: 400 });
    }

    // 1. Check current store stock
    const stockWhere = batchid
      ? and(eq(storeStock.storeid, storeid), eq(storeStock.itemid, itemid), eq(storeStock.batchid, batchid))
      : and(eq(storeStock.storeid, storeid), eq(storeStock.itemid, itemid));

    const [stock] = await db.select().from(storeStock).where(stockWhere).limit(1);

    if (!stock) {
      return NextResponse.json({ error: "No stock record found for this item in this store" }, { status: 400 });
    }
    const available = stock.quantity - stock.reservedquantity;
    if (available < quantity) {
      return NextResponse.json({
        error: `Insufficient stock. Available: ${available}, Requested: ${quantity}`,
      }, { status: 400 });
    }

    // 2. Deduct from store_stock
    await db
      .update(storeStock)
      .set({ quantity: sql`${storeStock.quantity} - ${quantity}`, lastupdated: new Date() })
      .where(eq(storeStock.id, stock.id));

    // 3. Insert store_transaction
    const [txn] = await db
      .insert(storeTransactions)
      .values({
        storeid,
        itemid,
        batchid: batchid || null,
        transactiontype: "DISPENSE",
        quantity: -quantity,
        referencetype: "dispense",
        patientref:      patientref || null,
        prescriptionref: prescriptionref || null,
        notes:           notes || null,
        createdby:       dispensedby || null,
      })
      .returning();

    // 4. Check if item is controlled — if so, also log to controlled_drug_log
    const [item] = await db.select().from(items).where(eq(items.id, itemid)).limit(1);
    let controlledEntry = null;
    if (item?.controlled) {
      if (!witnessedby) {
        // Roll back the stock deduction
        await db
          .update(storeStock)
          .set({ quantity: sql`${storeStock.quantity} + ${quantity}` })
          .where(eq(storeStock.id, stock.id));
        await db.delete(storeTransactions).where(eq(storeTransactions.id, txn.id));
        return NextResponse.json({ error: "Controlled drug dispense requires a witness" }, { status: 400 });
      }
      [controlledEntry] = await db
        .insert(controlledDrugLog)
        .values({
          storeid,
          itemid,
          batchid:         batchid || null,
          actiontype,
          quantity,
          patientref:      patientref || null,
          prescriptionref: prescriptionref || null,
          dispensedby:     dispensedby || null,
          witnessedby:     witnessedby || null,
          notes:           notes || null,
        })
        .returning();
    }

    return NextResponse.json({
      success: true,
      transaction: txn,
      controlledLog: controlledEntry || null,
      newQty: stock.quantity - quantity,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
