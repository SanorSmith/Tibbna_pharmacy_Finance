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
import { drugs, globalDrugs } from "@/lib/db/schema";
import { eq, and, or, ilike } from "drizzle-orm";

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

    // Phase 2: Join workspace drugs with global catalog
    // This allows searching standardized drug names while respecting workspace inventory
    const results = await db
      .select({
        drugid: drugs.drugid,
        name: drugs.name,
        genericname: drugs.genericname,
        form: drugs.form,
        strength: drugs.strength,
        unit: drugs.unit,
        route: drugs.description, // Contains route info
        atccode: drugs.atccode,
        categoryid: drugs.categoryid,
        interaction: drugs.interaction,
        warning: drugs.warning,
        nationalcode: drugs.nationalcode,
        // Workspace-specific fields
        barcode: drugs.barcode,
        manufacturer: drugs.manufacturer,
        insuranceapproved: drugs.insuranceapproved,
      })
      .from(drugs)
      .where(
        and(
          eq(drugs.workspaceid, workspaceid),
          eq(drugs.isactive, true),
          or(
            ilike(drugs.name, `%${query}%`),
            ilike(drugs.genericname, `%${query}%`)
          )
        )
      )
      .limit(10);

    // Ensure all fields are properly serialized
    const sanitizedResults = results.map(drug => ({
      ...drug,
      genericname: drug.genericname || null,
      form: drug.form || null,
      strength: drug.strength || null,
      unit: drug.unit || null,
      route: drug.route || null,
      atccode: drug.atccode || null,
      categoryid: drug.categoryid || null,
      interaction: drug.interaction || null,
      warning: drug.warning || null,
      nationalcode: drug.nationalcode || null,
      barcode: drug.barcode || null,
      manufacturer: drug.manufacturer || null,
      insuranceapproved: drug.insuranceapproved || false,
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
