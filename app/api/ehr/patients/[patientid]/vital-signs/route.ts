import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getOpenEHREHRBySubjectId,
  getOpenEHRCompositions,
  getOpenEHRComposition,
  createOpenEHRComposition,
  getOpenEHRVitalSigns,
} from "@/lib/openehr/openehr";

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/vital-signs
 * Retrieve vital signs for a patient directly from OpenEHR compositions
 * Supports pagination with limit and offset query parameters
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const { workspaceid, patientid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pagination parameters from query string
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "1", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and nurses can view vital signs
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch patient to get National ID
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Find EHR by National ID or patient UUID
    let ehrId: string | null = null;
    if (patient.nationalid) {
      ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
    }
    if (!ehrId) {
      ehrId = await getOpenEHREHRBySubjectId(patientid);
    }

    if (!ehrId) {
      // No EHR found, return empty array
      return NextResponse.json({
        vitalSigns: [],
        totalCount: 0,
        hasMore: false,
      });
    }

    // Use optimized AQL query to fetch vital signs directly
    const validVitalSigns = await getOpenEHRVitalSigns(ehrId);

    // Apply pagination
    const totalFilteredCount = validVitalSigns.length;
    const hasMore = offset + limit < totalFilteredCount;

    // Apply pagination to the filtered results
    const paginatedResults = validVitalSigns.slice(offset, offset + limit);

    return NextResponse.json({
      vitalSigns: paginatedResults,
      totalCount: totalFilteredCount,
      hasMore: hasMore,
      currentOffset: offset,
      currentLimit: limit,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/vital-signs
 * Create a new clinical encounter composition in OpenEHR with supplied vitals
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const { workspaceid, patientid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and nurses can record vital signs
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      temperature,
      systolic,
      diastolic,
      heartRate,
      respiratoryRate,
      spO2,
    } = body;

    // Fetch patient to get National ID
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Find EHR by National ID or patient UUID
    let ehrId: string | null = null;
    if (patient.nationalid) {
      ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
    }
    if (!ehrId) {
      ehrId = await getOpenEHREHRBySubjectId(patientid);
    }

    if (!ehrId) {
      return NextResponse.json(
        { error: "No EHR found for this patient" },
        { status: 404 }
      );
    }

    // Create composition data in FLAT format using template_clinical_encounter_v1
    const compositionData: Record<string, unknown> = {
      "template_clinical_encounter_v1/language|code": "en",
      "template_clinical_encounter_v1/language|terminology": "ISO_639-1",
      "template_clinical_encounter_v1/territory|code": "US",
      "template_clinical_encounter_v1/territory|terminology": "ISO_3166-1",
      "template_clinical_encounter_v1/composer|name": user.name || "Unknown",
      "template_clinical_encounter_v1/context/start_time":
        new Date().toISOString(),
      "template_clinical_encounter_v1/context/setting|code": "238",
      "template_clinical_encounter_v1/context/setting|value": "other care",
      "template_clinical_encounter_v1/context/setting|terminology": "openehr",
      "template_clinical_encounter_v1/category|code": "433",
      "template_clinical_encounter_v1/category|value": "event",
      "template_clinical_encounter_v1/category|terminology": "openehr",
    };

    // Add vitals to composition using correct template paths

    const eventTime = new Date().toISOString();

    // Temperature
    if (temperature) {
      compositionData[
        "template_clinical_encounter_v1/vital_signs/any_event:0/body_temperature|magnitude"
      ] = parseFloat(temperature);
      compositionData[
        "template_clinical_encounter_v1/vital_signs/any_event:0/body_temperature|unit"
      ] = "°C";
      compositionData[
        "template_clinical_encounter_v1/vital_signs/any_event:0/time"
      ] = eventTime;
    }

    // Blood Pressure
    if (systolic && diastolic) {
      compositionData[
        "template_clinical_encounter_v1/vital_signs/any_event:0/systolic_blood_pressure|magnitude"
      ] = parseFloat(systolic);
      compositionData[
        "template_clinical_encounter_v1/vital_signs/any_event:0/systolic_blood_pressure|unit"
      ] = "mm[Hg]";
      compositionData[
        "template_clinical_encounter_v1/vital_signs/any_event:0/diastolic_blood_pressure|magnitude"
      ] = parseFloat(diastolic);
      compositionData[
        "template_clinical_encounter_v1/vital_signs/any_event:0/diastolic_blood_pressure|unit"
      ] = "mm[Hg]";

      if (
        !compositionData[
          "template_clinical_encounter_v1/vital_signs/any_event:0/time"
        ]
      ) {
        compositionData[
          "template_clinical_encounter_v1/vital_signs/any_event:0/time"
        ] = eventTime;
      }
    }

    // Heart Rate
    if (heartRate) {
      compositionData[
        "template_clinical_encounter_v1/vital_signs/any_event:0/heart_rate|magnitude"
      ] = parseFloat(heartRate);
      compositionData[
        "template_clinical_encounter_v1/vital_signs/any_event:0/heart_rate|unit"
      ] = "/min";

      if (
        !compositionData[
          "template_clinical_encounter_v1/vital_signs/any_event:0/time"
        ]
      ) {
        compositionData[
          "template_clinical_encounter_v1/vital_signs/any_event:0/time"
        ] = eventTime;
      }
    }

    // Respiratory Rate
    if (respiratoryRate) {
      compositionData[
        "template_clinical_encounter_v1/vital_signs/any_event:0/respiratory_rate|magnitude"
      ] = parseFloat(respiratoryRate);
      compositionData[
        "template_clinical_encounter_v1/vital_signs/any_event:0/respiratory_rate|unit"
      ] = "/min";

      if (
        !compositionData[
          "template_clinical_encounter_v1/vital_signs/any_event:0/time"
        ]
      ) {
        compositionData[
          "template_clinical_encounter_v1/vital_signs/any_event:0/time"
        ] = eventTime;
      }
    }

    // Oxygen Saturation (SpO2)
    if (spO2) {
      compositionData[
        "template_clinical_encounter_v1/vital_signs/any_event:0/oxygen_saturation_spo2|magnitude"
      ] = parseFloat(spO2);
      compositionData[
        "template_clinical_encounter_v1/vital_signs/any_event:0/oxygen_saturation_spo2|unit"
      ] = "%";

      if (
        !compositionData[
          "template_clinical_encounter_v1/vital_signs/any_event:0/time"
        ]
      ) {
        compositionData[
          "template_clinical_encounter_v1/vital_signs/any_event:0/time"
        ] = eventTime;
      }
    }

    // Check if there's a recent composition with diagnoses that we can preserve
    const compositions = await getOpenEHRCompositions(ehrId);
    const recentComposition = compositions.length > 0 ? compositions[0] : null;

    if (recentComposition) {
      // Try to get the most recent composition to see if it has diagnoses
      try {
        const existingDetails = (await getOpenEHRComposition(
          ehrId,
          recentComposition.composition_uid
        )) as Record<string, unknown>;

        // Check if this composition has diagnosis data
        const hasDiagnosis =
          existingDetails[
            "template_clinical_encounter_v1/problem_diagnosis/problem_diagnosis_name"
          ];

        if (hasDiagnosis) {
          // This composition has diagnoses, so we'll use the same timestamp and preserve diagnoses
          // Use the same timestamp as the existing composition to create a true unified encounter
          compositionData["template_clinical_encounter_v1/context/start_time"] =
            recentComposition.start_time;

          // Copy existing diagnosis data
          const diagnosisPaths = [
            "template_clinical_encounter_v1/problem_diagnosis/problem_diagnosis_name",
            "template_clinical_encounter_v1/problem_diagnosis/variant:0",
            "template_clinical_encounter_v1/problem_diagnosis/clinical_description",
            "template_clinical_encounter_v1/problem_diagnosis/body_site:0",
            "template_clinical_encounter_v1/problem_diagnosis/date_time_of_onset",
            "template_clinical_encounter_v1/problem_diagnosis/date_time_of_resolution",
            "template_clinical_encounter_v1/problem_diagnosis/comment",
            "template_clinical_encounter_v1/problem_diagnosis/language|code",
            "template_clinical_encounter_v1/problem_diagnosis/language|terminology",
            "template_clinical_encounter_v1/problem_diagnosis/encoding|code",
            "template_clinical_encounter_v1/problem_diagnosis/encoding|terminology",
          ];

          diagnosisPaths.forEach((path) => {
            if (existingDetails[path]) {
              compositionData[path] = existingDetails[path];
            }
          });
        }
      } catch {
        // Fall back to creating a new composition
      }
    }

    // Create composition in OpenEHR using v1 template
    const compositionUid = await createOpenEHRComposition(
      ehrId,
      "template_clinical_encounter_v1",
      compositionData
    );

    return NextResponse.json(
      {
        success: true,
        composition_uid: compositionUid,
        message: "Vital signs recorded successfully in OpenEHR",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch vital signs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
