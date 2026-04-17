/**
 * Pharmacy Drugs CRUD API — GLOBAL catalog (shared across all workspaces)
 * GET  — list all drugs with search (no workspace filter)
 * POST — register a new drug (stores creating workspace for reference)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drugs, items } from "@/lib/db/schema";
import { or, ilike, desc } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(
  request: NextRequest
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    let whereClause;
    if (search.trim()) {
      const pattern = `%${search.trim()}%`;
      whereClause = or(
        ilike(drugs.name, pattern),
        ilike(drugs.genericname, pattern),
        ilike(drugs.nationalcode, pattern),
        ilike(drugs.barcode, pattern)
      );
    }

    const rows = await db
      .select()
      .from(drugs)
      .where(whereClause)
      .orderBy(desc(drugs.createdat));

    return NextResponse.json({ drugs: rows });
  } catch (error) {
    console.error("[Pharmacy Drugs GET]", error);
    return NextResponse.json({ error: "Failed to fetch drugs" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    if (!body.name || !body.form || !body.strength) {
      return NextResponse.json(
        { error: "Drug name, dose form, and strength are required" },
        { status: 400 }
      );
    }

    const workspaceid = body.workspaceid || "cec4d702-6dae-4ea5-9a30-ef17842c00fd";
    
    // Create drug record
    const [insertedDrug] = await db
      .insert(drugs)
      .values({
        workspaceid,
        name: body.name,
        genericname: body.genericname || null,
        atccode: body.atccode || null,
        form: body.form,
        strength: body.strength,
        unit: body.unit || "tablet",
        barcode: body.barcode || null,
        nationalcode: body.nationalcode || null,
        description: body.description || null,
        interaction: body.interaction || null,
        warning: body.warning || null,
        pregnancy: body.pregnancy || null,
        sideeffect: body.sideeffect || null,
        storagetype: body.storagetype || null,
        indication: body.indication || null,
        traffic: body.traffic || null,
        notes: body.notes || null,
        insuranceapproved: body.insuranceapproved ?? false,
        requiresprescription: body.requiresprescription ?? true,
        metadata: body.metadata || {},
      })
      .returning();

    // Also create item record so it appears in pharmacy inventory
    const [insertedItem] = await db
      .insert(items)
      .values({
        workspaceid,
        drugid: insertedDrug.drugid,
        itemcode: body.itemcode || `PHR-${Date.now()}`,
        name: body.name,
        genericname: body.genericname || null,
        itemtype: body.form || "drug",
        inventorycategory: "pharmacy",
        uom: body.unit || "tablet",
        minlevel: body.min_level || 10,
        reorderlevel: body.reorder_level || 20,
        maxlevel: body.max_level || 100,
        controlled: body.controlled || false,
        manufacturer: body.manufacturer || null,
        isactive: true,
        description: body.description || null,
        barcode: body.barcode || null,
        batchtracking: true,
        expirytracking: true,
      })
      .returning();

    return NextResponse.json({ drug: insertedDrug, item: insertedItem }, { status: 201 });
  } catch (error) {
    console.error("[Pharmacy Drugs POST]", error);
    return NextResponse.json({ error: "Failed to register drug" }, { status: 500 });
  }
}
