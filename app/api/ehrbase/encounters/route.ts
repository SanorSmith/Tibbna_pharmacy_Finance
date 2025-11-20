import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/db/queries/admin/shared";
import { listClinicalEncounters } from "@/lib/openehr/encounter";

/**
 * GET /api/ehrbase/encounters?ehrId=xxx
 * List all clinical encounters for a specific EHR
 * Returns composition_uid, composition_name, and start_time for each encounter
 */
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await checkIsAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ehrId = searchParams.get("ehrId");

    if (!ehrId) {
      return NextResponse.json(
        { error: "ehrId query parameter is required" },
        { status: 400 }
      );
    }

    const encounters = await listClinicalEncounters(ehrId);

    return NextResponse.json({
      success: true,
      encounters,
      count: encounters.length,
    });
  } catch (error) {
    console.error("Error listing clinical encounters:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
