import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { warehouseStock, drugs, warehouseSections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/warehouse-stock
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const warehouseid = searchParams.get("warehouseid");

  try {
    const query = db
      .select({
        id:          warehouseStock.id,
        warehouseid: warehouseStock.warehouseid,
        sectionid:   warehouseStock.sectionid,
        drugid:      warehouseStock.drugid,
        quantity:    warehouseStock.quantity,
        createdat:   warehouseStock.createdat,
        drugname:    drugs.name,
        genericname: drugs.genericname,
        form:        drugs.form,
        strength:    drugs.strength,
        sectionname: warehouseSections.sectionname,
      })
      .from(warehouseStock)
      .leftJoin(drugs, eq(warehouseStock.drugid, drugs.drugid))
      .leftJoin(warehouseSections, eq(warehouseStock.sectionid, warehouseSections.id));

    const results = warehouseid
      ? await query.where(eq(warehouseStock.warehouseid, warehouseid))
      : await query;

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch stock" }, { status: 500 });
  }
}

// POST /api/warehouse-stock
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { warehouseid, sectionid, drugid, quantity } = body;

    if (!warehouseid || !drugid || quantity === undefined) {
      return NextResponse.json({ error: "warehouseid, drugid and quantity are required" }, { status: 400 });
    }
    if (quantity < 0) {
      return NextResponse.json({ error: "Quantity cannot be negative" }, { status: 400 });
    }

    const [created] = await db
      .insert(warehouseStock)
      .values({ warehouseid, sectionid: sectionid || null, drugid, quantity: parseInt(quantity) })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add stock" }, { status: 500 });
  }
}

// PATCH /api/warehouse-stock
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, quantity } = body;

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    if (quantity < 0) return NextResponse.json({ error: "Quantity cannot be negative" }, { status: 400 });

    const [updated] = await db
      .update(warehouseStock)
      .set({ quantity: parseInt(quantity) })
      .where(eq(warehouseStock.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update stock" }, { status: 500 });
  }
}
