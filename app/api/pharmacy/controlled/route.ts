// ─── /api/pharmacy/controlled/route.ts ───────────────────────────────────────
import { NextResponse } from "next/server";
import { db as db } from "@/lib/db";
import { controlledDrugLog, stores, items, itemBatches } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
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
        storename:       stores.name,
        batchnumber:     itemBatches.batchnumber,
      })
      .from(controlledDrugLog)
      .leftJoin(items,       eq(controlledDrugLog.itemid,  items.id))
      .leftJoin(stores,      eq(controlledDrugLog.storeid, stores.id))
      .leftJoin(itemBatches, eq(controlledDrugLog.batchid, itemBatches.id))
      .orderBy(sql`${controlledDrugLog.createdat} DESC`)
      .limit(100);
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Controlled log GET error:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeid, itemid, quantity, actiontype, patientref, prescriptionref, dispensedby, witnessedby, notes, batchid } = body;

    if (!storeid || !itemid || !quantity) return NextResponse.json({ error: "storeid, itemid and quantity required" }, { status: 400 });

    const [log] = await db.insert(controlledDrugLog).values({
      storeid, itemid, quantity: Number(quantity), actiontype, patientref,
      prescriptionref, dispensedby, witnessedby, notes, batchid: batchid ?? null,
    }).returning();

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Controlled log POST error:", error);
    return NextResponse.json({ error: "Failed to save log" }, { status: 500 });
  }
}
