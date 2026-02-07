/**
 * Pharmacy Drugs CRUD API — GLOBAL catalog (shared across all workspaces)
 * GET  — list all drugs with search (no workspace filter)
 * POST — register a new drug (stores creating workspace for reference)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drugs } from "@/lib/db/schema";
import { or, ilike, desc } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    await params; // consume params
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
        ilike(drugs.barcode, pattern),
        ilike(drugs.category, pattern)
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
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    if (!body.name || !body.form || !body.strength) {
      return NextResponse.json(
        { error: "Drug name, dose form, and strength are required" },
        { status: 400 }
      );
    }

    const [inserted] = await db
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
        manufacturer: body.manufacturer || null,
        nationalcode: body.nationalcode || null,
        category: body.category || null,
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

    return NextResponse.json({ drug: inserted }, { status: 201 });
  } catch (error) {
    console.error("[Pharmacy Drugs POST]", error);
    return NextResponse.json({ error: "Failed to register drug" }, { status: 500 });
  }
}
