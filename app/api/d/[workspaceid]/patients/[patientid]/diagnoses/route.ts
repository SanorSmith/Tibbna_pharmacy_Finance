import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { UserWorkspace } from "@/lib/db/tables/workspace";
import {
  getOpenEHREHRBySubjectId,
  createOpenEHRComposition,
  getOpenEHRCompositions,
  getOpenEHRComposition,
  getOpenEHRDiagnoses,
} from "@/lib/openehr/openehr";

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
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w: UserWorkspace) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and nurses can view diagnoses
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
      return NextResponse.json({
        diagnoses: [],
        totalCount: 0,
        hasMore: false,
      });
    }

    // Use optimized AQL query to fetch diagnoses directly with timeout protection
    let validDiagnoses;
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout fetching diagnoses')), 30000)
      );
      validDiagnoses = await Promise.race([
        getOpenEHRDiagnoses(ehrId),
        timeoutPromise
      ]);
    } catch (error) {
      console.error("Error or timeout fetching diagnoses:", error);
      return NextResponse.json({
        diagnoses: [],
        totalCount: 0,
        hasMore: false,
        message: "EHRBase is slow or unavailable. Please try again later."
      }, { status: 200 });
    }

    // Apply pagination to the filtered results
    const totalFilteredCount = validDiagnoses.length;
    const hasMore = offset + limit < totalFilteredCount;

    // Apply pagination to the filtered results
    const paginatedResults = validDiagnoses.slice(offset, offset + limit);

    return NextResponse.json({
      diagnoses: paginatedResults,
      totalCount: totalFilteredCount,
      hasMore: hasMore,
      currentOffset: offset,
      currentLimit: limit,
    });
  } catch (error) {
    console.error("Error fetching diagnoses:", error);
    return NextResponse.json(
      { diagnoses: [], totalCount: 0, hasMore: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
      (w: UserWorkspace) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and nurses can create diagnoses
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      problemDiagnosis,
      clinicalStatus,
      dateOfOnset,
      dateOfResolution,
      clinicalDescription,
      bodySite,
      comment,
    } = body;

    // Validate required fields
    if (!problemDiagnosis) {
      return NextResponse.json(
        { error: "Problem/Diagnosis name is required" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "No EHR found for this patient" },
        { status: 404 }
      );
    }

    // Create composition data in FLAT format using correct template paths
    // Using template_clinical_encounter_v1 which is known to work
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

    // Add diagnosis to composition using correct template paths

    // Problem/Diagnosis Name (required)
    compositionData[
      "template_clinical_encounter_v1/problem_diagnosis/problem_diagnosis_name"
    ] = problemDiagnosis;

    // Clinical Status (mapped to variant)
    if (clinicalStatus) {
      compositionData[
        "template_clinical_encounter_v1/problem_diagnosis/variant:0"
      ] = clinicalStatus;
    }

    // Clinical Description
    if (clinicalDescription) {
      compositionData[
        "template_clinical_encounter_v1/problem_diagnosis/clinical_description"
      ] = clinicalDescription;
    }

    // Body Site
    if (bodySite) {
      compositionData[
        "template_clinical_encounter_v1/problem_diagnosis/body_site:0"
      ] = bodySite;
    }

    // Date/Time of Onset
    if (dateOfOnset) {
      compositionData[
        "template_clinical_encounter_v1/problem_diagnosis/date_time_of_onset"
      ] = new Date(dateOfOnset).toISOString();
    }

    // Date/Time of Resolution
    if (dateOfResolution) {
      compositionData[
        "template_clinical_encounter_v1/problem_diagnosis/date_time_of_resolution"
      ] = new Date(dateOfResolution).toISOString();
    }

    // Skip severity field for now - template has specific code requirements
    // TODO: Determine exact severity codes from OpenEHR template definition
    console.log("Severity field skipped - template validation issues");

    // Comment
    if (comment) {
      compositionData[
        "template_clinical_encounter_v1/problem_diagnosis/comment"
      ] = comment;
    }

    // Set language and encoding for diagnosis
    compositionData[
      "template_clinical_encounter_v1/problem_diagnosis/language|code"
    ] = "en";
    compositionData[
      "template_clinical_encounter_v1/problem_diagnosis/language|terminology"
    ] = "ISO_639-1";
    compositionData[
      "template_clinical_encounter_v1/problem_diagnosis/encoding|code"
    ] = "UTF-8";
    compositionData[
      "template_clinical_encounter_v1/problem_diagnosis/encoding|terminology"
    ] = "IANA_character-sets";

    // Check if there's a recent composition with vitals that we can update
    const compositions = await getOpenEHRCompositions(ehrId);
    const recentComposition = compositions.length > 0 ? compositions[0] : null;

    let compositionUid = "";

    if (recentComposition) {
      // Try to get the most recent composition to see if it has vitals
      try {
        const existingDetails = (await getOpenEHRComposition(
          ehrId,
          recentComposition.composition_uid
        )) as Record<string, unknown>;

        // Check if this composition has vital signs data
        const hasVitals =
          existingDetails[
            "template_clinical_encounter_v1/vital_signs/any_event:0/body_temperature|magnitude"
          ] ||
          existingDetails[
            "template_clinical_encounter_v1/vital_signs/any_event:0/systolic_blood_pressure|magnitude"
          ] ||
          existingDetails[
            "template_clinical_encounter_v1/vital_signs/any_event:0/heart_rate|magnitude"
          ];

        if (hasVitals) {
          // This composition has vitals, so we'll use the same timestamp and preserve vitals
          // Use the same timestamp as the existing composition to create a true unified encounter
          compositionData["template_clinical_encounter_v1/context/start_time"] =
            recentComposition.start_time;

          // Copy existing vital signs data
          const vitalSignsPaths = [
            "template_clinical_encounter_v1/vital_signs/any_event:0/body_temperature|magnitude",
            "template_clinical_encounter_v1/vital_signs/any_event:0/body_temperature|unit",
            "template_clinical_encounter_v1/vital_signs/any_event:0/systolic_blood_pressure|magnitude",
            "template_clinical_encounter_v1/vital_signs/any_event:0/systolic_blood_pressure|unit",
            "template_clinical_encounter_v1/vital_signs/any_event:0/diastolic_blood_pressure|magnitude",
            "template_clinical_encounter_v1/vital_signs/any_event:0/diastolic_blood_pressure|unit",
            "template_clinical_encounter_v1/vital_signs/any_event:0/heart_rate|magnitude",
            "template_clinical_encounter_v1/vital_signs/any_event:0/heart_rate|unit",
            "template_clinical_encounter_v1/vital_signs/any_event:0/time",
          ];

          vitalSignsPaths.forEach((path) => {
            if (existingDetails[path]) {
              compositionData[path] = existingDetails[path];
            }
          });

          console.log(
            "Creating unified composition with same timestamp as existing vitals:",
            recentComposition.start_time
          );
          console.log(
            "Will delete old composition after creating new one:",
            recentComposition.composition_uid
          );
        }
      } catch (error) {
        console.error("Failed to check existing composition:", error);
        // Fall back to creating a new composition
      }
    }

    // Create composition in OpenEHR
    compositionUid = await createOpenEHRComposition(
      ehrId,
      "template_clinical_encounter_v1",
      compositionData
    );

    return NextResponse.json(
      {
        success: true,
        composition_uid: compositionUid,
        message: "Diagnosis recorded successfully in OpenEHR",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating diagnosis:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
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
      (w: UserWorkspace) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and nurses can update diagnoses
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      composition_uid,
      problemDiagnosis,
      clinicalStatus,
      dateOfOnset,
      dateOfResolution,
      clinicalDescription,
      bodySite,
      comment,
    } = body;

    // Validate required fields
    if (!composition_uid) {
      return NextResponse.json(
        { error: "Composition UID is required" },
        { status: 400 }
      );
    }
    if (!problemDiagnosis) {
      return NextResponse.json(
        { error: "Problem/Diagnosis name is required" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "No EHR found for this patient" },
        { status: 404 }
      );
    }

    // Get existing composition to preserve other data
    const existingComposition = (await getOpenEHRComposition(
      ehrId,
      composition_uid
    )) as Record<string, unknown>;

    // Check if this is a care plan composition (not a diagnosis)
    const isCarePlan = 
      existingComposition["template_care_plan_v1/problem_diagnosis/problem_diagnosis_name"] === "Care Plan - See Goal Section" ||
      (existingComposition["template_clinical_encounter_v2/problem_diagnosis/problem_diagnosis_name"] as string)?.includes("care plan") ||
      (existingComposition["template_clinical_encounter_v2/problem_diagnosis/clinical_description"] as string)?.includes("This is a care plan composition");

    if (isCarePlan) {
      return NextResponse.json(
        { 
          error: "Cannot edit care plan compositions from the diagnosis tab. Please use the Care Plans tab instead." 
        },
        { status: 400 }
      );
    }

    // Create composition data in FLAT format using correct template paths
    // Using template_clinical_encounter_v1 which is known to work
    const compositionData: Record<string, unknown> = {
      "template_clinical_encounter_v1/language|code": "en",
      "template_clinical_encounter_v1/language|terminology": "ISO_639-1",
      "template_clinical_encounter_v1/territory|code": "US",
      "template_clinical_encounter_v1/territory|terminology": "ISO_3166-1",
      "template_clinical_encounter_v1/composer|name": user.name || "Unknown",
      "template_clinical_encounter_v1/context/start_time":
        existingComposition[
          "template_clinical_encounter_v1/context/start_time"
        ] || new Date().toISOString(),
      "template_clinical_encounter_v1/context/setting|code": "238",
      "template_clinical_encounter_v1/context/setting|value": "other care",
      "template_clinical_encounter_v1/context/setting|terminology": "openehr",
      "template_clinical_encounter_v1/category|code": "433",
      "template_clinical_encounter_v1/category|value": "event",
      "template_clinical_encounter_v1/category|terminology": "openehr",
    };

    // Copy existing vital signs data if present
    const vitalSignsPaths = [
      "template_clinical_encounter_v1/vital_signs/any_event:0/body_temperature|magnitude",
      "template_clinical_encounter_v1/vital_signs/any_event:0/body_temperature|unit",
      "template_clinical_encounter_v1/vital_signs/any_event:0/systolic_blood_pressure|magnitude",
      "template_clinical_encounter_v1/vital_signs/any_event:0/systolic_blood_pressure|unit",
      "template_clinical_encounter_v1/vital_signs/any_event:0/diastolic_blood_pressure|magnitude",
      "template_clinical_encounter_v1/vital_signs/any_event:0/diastolic_blood_pressure|unit",
      "template_clinical_encounter_v1/vital_signs/any_event:0/heart_rate|magnitude",
      "template_clinical_encounter_v1/vital_signs/any_event:0/heart_rate|unit",
      "template_clinical_encounter_v1/vital_signs/any_event:0/time",
    ];

    vitalSignsPaths.forEach((path) => {
      if (existingComposition[path]) {
        compositionData[path] = existingComposition[path];
      }
    });

    // Update diagnosis fields
    compositionData[
      "template_clinical_encounter_v1/problem_diagnosis/problem_diagnosis_name"
    ] = problemDiagnosis;

    // Clinical Status (mapped to variant)
    if (clinicalStatus) {
      compositionData[
        "template_clinical_encounter_v1/problem_diagnosis/variant:0"
      ] = clinicalStatus;
    }

    // Clinical Description
    if (clinicalDescription) {
      compositionData[
        "template_clinical_encounter_v1/problem_diagnosis/clinical_description"
      ] = clinicalDescription;
    }

    // Body Site
    if (bodySite) {
      compositionData[
        "template_clinical_encounter_v1/problem_diagnosis/body_site:0"
      ] = bodySite;
    }

    // Date/Time of Onset
    if (dateOfOnset) {
      compositionData[
        "template_clinical_encounter_v1/problem_diagnosis/date_time_of_onset"
      ] = new Date(dateOfOnset).toISOString();
    }

    // Date/Time of Resolution
    if (dateOfResolution) {
      compositionData[
        "template_clinical_encounter_v1/problem_diagnosis/date_time_of_resolution"
      ] = new Date(dateOfResolution).toISOString();
    }

    // Comment
    if (comment) {
      compositionData[
        "template_clinical_encounter_v1/problem_diagnosis/comment"
      ] = comment;
    }

    // Set language and encoding for diagnosis
    compositionData[
      "template_clinical_encounter_v1/problem_diagnosis/language|code"
    ] = "en";
    compositionData[
      "template_clinical_encounter_v1/problem_diagnosis/language|terminology"
    ] = "ISO_639-1";
    compositionData[
      "template_clinical_encounter_v1/problem_diagnosis/encoding|code"
    ] = "UTF-8";
    compositionData[
      "template_clinical_encounter_v1/problem_diagnosis/encoding|terminology"
    ] = "IANA_character-sets";

    // Update composition in OpenEHR
    // Note: This EHRbase instance does not support direct PUT updates (501 Not Implemented).
    // Strategy: create a NEW composition with the updated diagnosis data and mark the old one as superseded
    // This preserves history/version control for diagnoses
    
    // Add superseded reference in the new composition to link to the old version
    compositionData["template_clinical_encounter_v1/problem_diagnosis/comment"] = 
      compositionData["template_clinical_encounter_v1/problem_diagnosis/comment"]
        ? `${compositionData["template_clinical_encounter_v1/problem_diagnosis/comment"]} | Supersedes: ${composition_uid}`
        : `Supersedes: ${composition_uid}`;

    try {
      const newCompositionUid = await createOpenEHRComposition(
        ehrId,
        "template_clinical_encounter_v1",
        compositionData
      );

      // Note: Old composition is preserved for history/version control
      // It will be filtered out from the main diagnosis list by checking for newer versions
      console.log(`Created new version of diagnosis. Old composition ${composition_uid} preserved for history.`);

      return NextResponse.json({
        success: true,
        composition_uid: newCompositionUid,
        old_composition_uid: composition_uid,
        message: "Diagnosis updated successfully in OpenEHR (previous version preserved)",
      });
    } catch (ehrError: unknown) {
      const err = ehrError as {
        response?: { data?: unknown };
        message?: string;
      };
      console.error("OpenEHR update error:", err);
      console.error("OpenEHR error response:", err.response?.data);
      console.error(
        "Composition data being sent:",
        JSON.stringify(compositionData, null, 2)
      );

      return NextResponse.json(
        {
          error: "Failed to update composition in OpenEHR",
          details: err.response?.data || err.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error updating diagnosis:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
