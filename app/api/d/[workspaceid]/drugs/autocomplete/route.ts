/**
 * GET /api/d/[workspaceid]/drugs/autocomplete
 * Search drugs by name for autocomplete with full drug details
 * 
 * Phase 2 Hybrid Model:
 * - Searches global drug catalog for standardized drug information
 * - Filters by workspace inventory (only shows drugs available in this workspace)
 * - Returns combined data from global catalog + workspace-specific details
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { drugs, globalDrugs, items, warehouseSections } from "@/lib/db/schema";
import { eq, and, or, ilike, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid } = await params;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ drugs: [] });
    }

    // Phase 2: Join workspace drugs with global catalog and items for storage location
    // This allows searching standardized drug names while respecting workspace inventory
    // Use DISTINCT ON to prevent duplicate drug IDs from multiple items
    const results = await db.execute(sql`
      SELECT DISTINCT ON (d.drugid)
        d.drugid,
        d.name,
        d.genericname,
        d.form,
        d.strength,
        d.unit,
        d.description as route,
        d.atccode,
        d.category,
        d.interaction,
        d.warning,
        d.nationalcode,
        d.barcode,
        d.manufacturer,
        d.insuranceapproved,
        i.storage_location_id as "storageLocationId",
        ws.sectionname as "storageLocationName",
        ws.bin_location as "storageLocation",
        ws.section_type as "storageType",
        ws.shelf
      FROM drugs d
      LEFT JOIN items i ON i.drug_id = d.drugid
      LEFT JOIN warehouse_sections ws ON ws.id = i.storage_location_id
      WHERE d.workspaceid = ${workspaceid}
        AND d.isactive = true
        AND (d.name ILIKE ${'%' + query + '%'} OR d.genericname ILIKE ${'%' + query + '%'})
      ORDER BY d.drugid
      LIMIT 10
    `);

    // Ensure all fields are properly serialized
    const sanitizedResults = results.map(drug => ({
      ...drug,
      genericname: drug.genericname || null,
      form: drug.form || null,
      strength: drug.strength || null,
      unit: drug.unit || null,
      route: drug.route || null,
      atccode: drug.atccode || null,
      category: drug.category || null,
      interaction: drug.interaction || null,
      warning: drug.warning || null,
      nationalcode: drug.nationalcode || null,
      barcode: drug.barcode || null,
      manufacturer: drug.manufacturer || null,
      insuranceapproved: drug.insuranceapproved || false,
      storageLocationId: drug.storageLocationId || null,
      storageLocationName: drug.storageLocationName || null,
      storageLocation: drug.storageLocation || null,
      storageType: drug.storageType || null,
      shelf: drug.shelf || null,
    }));

    return NextResponse.json({ drugs: sanitizedResults });
  } catch (error) {
    console.error("Error in drug autocomplete:", error);
    return NextResponse.json(
      { error: "Failed to search drugs" },
      { status: 500 }
    );
  }
}
