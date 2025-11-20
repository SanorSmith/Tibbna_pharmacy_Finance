import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/db/queries/admin/shared";
import {
  createClinicalEncounter,
  getClinicalEncounters,
  ClinicalEncounterComposition,
} from "@/lib/openehr/encounter";

/**
 * POST /api/ehrbase/encounter
 * Create a new clinical encounter composition
 *
 * Request body:
 * {
 *   ehrId: string,
 *   composition: ClinicalEncounterComposition (FLAT format)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await checkIsAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ehrId, composition } = body;

    if (!ehrId) {
      return NextResponse.json({ error: "ehrId is required" }, { status: 400 });
    }

    if (!composition) {
      return NextResponse.json(
        { error: "composition is required" },
        { status: 400 }
      );
    }

    const compositionUid = await createClinicalEncounter(
      ehrId,
      composition as ClinicalEncounterComposition
    );

    return NextResponse.json(
      {
        success: true,
        compositionUid,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating clinical encounter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ehrbase/encounter?ehrId=xxx
 * Get all clinical encounters for a specific EHR
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

    const encounters = await getClinicalEncounters(ehrId);

    return NextResponse.json({
      success: true,
      encounters,
    });
  } catch (error) {
    console.error("Error fetching clinical encounters:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
