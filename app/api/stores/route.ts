import { NextResponse } from "next/server";
import { db as db } from "@/lib/db";
import { stores, warehouses, storeStock, items } from "@/lib/db/schema";
import { eq, and, count, sum } from "drizzle-orm";

const WORKSPACE_ID = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";

export async function GET() {
  try {
    const rows = await db.select().from(stores).where(eq(stores.isactive, true)).orderBy(stores.name);

    // enrich with stock count per store
    const enriched = await Promise.all(rows.map(async (store) => {
      let stockcount = 0, totalstock = 0;
      try {
        const [stats] = await db
          .select({ stockcount: count(storeStock.id), totalstock: sum(storeStock.quantity) })
          .from(storeStock)
          .where(eq(storeStock.storeid, store.id));
        stockcount = Number(stats?.stockcount ?? 0);
        totalstock = Number(stats?.totalstock ?? 0);
      } catch (_) {}
      return { ...store, stockcount, totalstock };
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Stores GET error:", error);
    return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, storetype, department, warehouseid, manager, location, description } = body;

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const [created] = await db.insert(stores).values({
      workspaceid: WORKSPACE_ID,
      name, storetype: storetype ?? "sub",
      department, warehouseid, manager, location, description,
    }).returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Stores POST error:", error);
    return NextResponse.json({ error: "Failed to create store" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await db.update(stores).set({ isactive: false, updatedat: new Date() }).where(eq(stores.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Stores DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete store" }, { status: 500 });
  }
}
