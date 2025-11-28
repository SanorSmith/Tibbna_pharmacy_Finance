import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getOpenEHREHRBySubjectId, getOpenEHRReferrals } from "@/lib/openehr/openehr";
import { ClinicalEncounterComposition, createClinicalEncounter } from "@/lib/openehr/encounter";

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/referrals
 * Retrieve referral records for a patient from OpenEHR (SERVICE_REQUEST in clinical encounter)
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

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and nurses can view referrals
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
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
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
      return NextResponse.json({ referrals: [] }, { status: 200 });
    }

    const referrals = await getOpenEHRReferrals(ehrId);

    return NextResponse.json({ referrals }, { status: 200 });
  } catch (error) {
    console.error("Error fetching referrals:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/referrals
 * Create a new referral record in OpenEHR as a SERVICE_REQUEST inside
 * the clinical encounter template (template_clinical_encounter_v1).
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

    // Only doctors can create referrals
    if (membership.role !== "doctor") {
      return NextResponse.json(
        { error: "Forbidden - Only doctors can create referrals" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { referral } = body as {
      referral: {
        physicianDepartment: string;
        receivingPhysician?: string;
        clinicalIndication: string;
        urgency: "routine" | "urgent";
        comment?: string;
      };
    };

    if (!referral) {
      return NextResponse.json(
        { error: "Referral payload is required" },
        { status: 400 }
      );
    }

    if (!referral.physicianDepartment || !referral.clinicalIndication) {
      return NextResponse.json(
        {
          error:
            "Physician/Department and Clinical Indication are required for a referral",
        },
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
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
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

    const now = new Date().toISOString();

    const composition: ClinicalEncounterComposition = {
      // Category
      "template_clinical_encounter_v1/category|value": "event",
      "template_clinical_encounter_v1/category|code": "433",
      "template_clinical_encounter_v1/category|terminology": "openehr",

      // Context - must match template codes (238 = 'other care')
      "template_clinical_encounter_v1/context/start_time": now,
      "template_clinical_encounter_v1/context/setting|value": "other care",
      "template_clinical_encounter_v1/context/setting|code": "238",
      "template_clinical_encounter_v1/context/setting|terminology": "openehr",

      // Language / territory / composer
      "template_clinical_encounter_v1/language|code": "en",
      "template_clinical_encounter_v1/language|terminology": "ISO_639-1",
      "template_clinical_encounter_v1/territory|code": "US",
      "template_clinical_encounter_v1/territory|terminology": "ISO_3166-1",
      "template_clinical_encounter_v1/composer|name":
        user.name || user.email || "Unknown",

      // SERVICE REQUEST (Referral) - use template local coded values
      "template_clinical_encounter_v1/service_request/request/service_type|terminology":
        "local",
      "template_clinical_encounter_v1/service_request/request/service_type|code":
        "at0005",
      "template_clinical_encounter_v1/service_request/request/service_type|value":
        "Referral to specialist",

      "template_clinical_encounter_v1/service_request/request/clinical_indication":
        referral.clinicalIndication,

      "template_clinical_encounter_v1/service_request/request/requested_date": now,

      "template_clinical_encounter_v1/service_request/request/requesting_provider":
        user.name || user.email || "Unknown Provider",

      "template_clinical_encounter_v1/service_request/request/receiving_provider":
        referral.physicianDepartment,

      // Store receiving physician name separately in service_name (TEXT)
      ...(referral.receivingPhysician
        ? {
            "template_clinical_encounter_v1/service_request/request/service_name|other":
              referral.receivingPhysician,
          }
        : {}),

      // Add a description marker to distinguish referrals from lab orders
      "template_clinical_encounter_v1/service_request/request/description":
        "REFERRAL_REQUEST",

      "template_clinical_encounter_v1/service_request/request/urgency|terminology":
        "local",
      "template_clinical_encounter_v1/service_request/request/urgency|code":
        referral.urgency === "urgent" ? "at0015" : "at0014",
      "template_clinical_encounter_v1/service_request/request/urgency|value":
        referral.urgency === "urgent" ? "Urgent" : "Routine",

      "template_clinical_encounter_v1/service_request/narrative":
        referral.comment ||
        `Referral to ${referral.physicianDepartment} due to ${referral.clinicalIndication}`,
    };

    const compositionUid = await createClinicalEncounter(ehrId, composition);

    return NextResponse.json(
      {
        success: true,
        message: "Referral created successfully in OpenEHR",
        composition_uid: compositionUid,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating referral:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
