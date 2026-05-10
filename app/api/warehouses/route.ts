import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { warehouses, warehouseSections, inventoryStock } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const all = await db.select().from(warehouses).where(eq(warehouses.isactive, true)).orderBy(warehouses.name);

    const enriched = await Promise.all(all.map(async (w) => {
      const [{ sectioncount }] = await db
        .select({ sectioncount: sql<number>`count(*)` })
        .from(warehouseSections)
        .where(eq(warehouseSections.warehouseid, w.id));

      const [{ stockcount }] = await db
        .select({ stockcount: sql<number>`coalesce(sum(quantity), 0)` })
        .from(inventoryStock)
        .where(eq(inventoryStock.warehouseid, w.id));

      return { ...w, sectioncount: Number(sectioncount), totalstock: Number(stockcount) };
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch warehouses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, location, manager, description, warehousetype } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Warehouse name is required" }, { status: 400 });

    const [created] = await db.insert(warehouses).values({
      name, location, manager, description,
      warehousetype: warehousetype ?? "hospital",
    }).returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create warehouse" }, { status: 500 });
  }
}
