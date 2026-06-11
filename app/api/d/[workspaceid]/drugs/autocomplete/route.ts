/**
 * GET /api/d/[workspaceid]/drugs/autocomplete
 * Search drugs by name for autocomplete with full drug details
 * 
 * Pharmacy Order Model:
 * - Searches only pharmacy inventory items (items table)
 * - Only shows drugs that are actually in stock
 * - Returns item details with storage location
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

    // Search only pharmacy inventory items with stock
    // Return drug_id if available, otherwise use item_id
    // Extract strength from name if not in drug tables (e.g., "Paracetamol 500mg" -> "500mg")
    const results = await db.execute(sql`
      SELECT DISTINCT ON (i.id)
        COALESCE(i.drug_id, i.id) as drugid,
        i.id as itemid,
        i.name,
        i.generic_name as genericname,
        COALESCE(gd.form, d.form, i.item_type::text, '') as form,
        COALESCE(
          NULLIF(gd.strength, ''), 
          NULLIF(d.strength, '')
        ) as strength,
        COALESCE(gd.unit, d.unit, i.uom) as unit,
        COALESCE(gd.route, d.route, '') as route,
        COALESCE(gd.atccode, d.atccode, '') as atccode,
        COALESCE(gd.category, d.category, '') as category,
        COALESCE(gd.interaction, d.interaction, '') as interaction,
        COALESCE(gd.warning, d.warning, '') as warning,
        COALESCE(gd.nationalcode, d.nationalcode, '') as nationalcode,
        i.barcode,
        i.manufacturer,
        false as insuranceapproved,
        i.storage_location_id as "storageLocationId",
        ws.sectionname as "storageLocationName",
        ws.bin_location as "storageLocation",
        ws.section_type as "storageType",
        ws.shelf
      FROM items i
      LEFT JOIN drugs d ON d.drugid = i.drug_id AND d.workspaceid = ${workspaceid}
      LEFT JOIN global_drugs gd ON gd.drugid = i.drug_id
      LEFT JOIN warehouse_sections ws ON ws.id = i.storage_location_id
      WHERE i.workspace_id = ${workspaceid}
        AND i.is_active = true
        AND i.inventory_category = 'pharmacy'
        AND (i.name ILIKE ${'%' + query + '%'} OR i.generic_name ILIKE ${'%' + query + '%'})
        AND EXISTS (
          SELECT 1 FROM inventory_stock ist
          WHERE ist.item_id = i.id AND ist.quantity > 0
        )
      ORDER BY i.id, i.name
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
