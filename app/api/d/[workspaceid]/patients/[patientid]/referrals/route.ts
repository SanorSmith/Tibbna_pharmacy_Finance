import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getOpenEHREHRBySubjectId,
  createReferral,
  listReferrals,
  getReferral,
  type ReferralComposition,
} from "@/lib/openehr";

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/referrals
 * Retrieve referral records for a patient from OpenEHR using template_referral_v1
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
      return NextResponse.json({ referrals: [] }, { status: 200 });
    }

    // Get list of referral compositions with timeout
    let referralList;
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout fetching referral list')), 30000)
      );
      referralList = await Promise.race([listReferrals(ehrId), timeoutPromise]);
    } catch (error) {
      console.error("Error or timeout fetching referral list:", error);
      return NextResponse.json({ 
        referrals: [],
        message: "EHRBase is slow or unavailable. Please try again later."
      }, { status: 200 });
    }

    // Fetch full details for each referral with timeout protection
    const referrals = await Promise.all(
      referralList.map(async (item) => {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 30000)
          );
          const composition = await Promise.race([
            getReferral(ehrId, item.composition_uid),
            timeoutPromise
          ]);
          
          // Only include compositions that start with "REFERRAL:"
          const problemDiagnosis = composition["template_clinical_encounter_v1/problem_diagnosis/problem_diagnosis_name"] || "";
          if (!problemDiagnosis.startsWith("REFERRAL:")) {
            return null;
          }

          // Parse referral data from the composition fields
          const clinicalDescription = composition["template_clinical_encounter_v1/problem_diagnosis/clinical_description"] || "";
          const [department, physician] = clinicalDescription.split(" | ");

          return {
            composition_uid: item.composition_uid,
            recorded_time: item.start_time,
            physician_department: department || "",
            receiving_physician: physician || "",
            clinical_indication: problemDiagnosis.replace("REFERRAL: ", ""),
            urgency: composition["template_clinical_encounter_v1/problem_diagnosis/variant:0"] || "routine",
            comment: composition["template_clinical_encounter_v1/problem_diagnosis/comment"] || "",
            referred_by: composition["template_clinical_encounter_v1/composer|name"] || "Unknown",
            status: composition["template_clinical_encounter_v1/problem_diagnosis/body_site:0"] || "pending",
          };
        } catch (error) {
          console.error(`Timeout or error fetching composition ${item.composition_uid}:`, error);
          return null;
        }
      })
    );

    // Filter out null entries (non-referral compositions and timeouts)
    const filteredReferrals = referrals.filter((r) => r !== null);

    return NextResponse.json({ referrals: filteredReferrals }, { status: 200 });
  } catch (error) {
    console.error("Error fetching referrals:", error);
    return NextResponse.json(
      { referrals: [], error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/referrals
 * Create a new referral record in OpenEHR using template_referral_v1
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

    const now = new Date().toISOString();

    // Create composition using clinical encounter template with REFERRAL prefix
    const composition: ReferralComposition = {
      // Language / territory / composer
      "template_clinical_encounter_v1/language|code": "en",
      "template_clinical_encounter_v1/language|terminology": "ISO_639-1",
      "template_clinical_encounter_v1/territory|code": "US",
      "template_clinical_encounter_v1/territory|terminology": "ISO_3166-1",
      "template_clinical_encounter_v1/composer|name": user.name || user.email || "Unknown",

      // Context
      "template_clinical_encounter_v1/context/start_time": now,
      "template_clinical_encounter_v1/context/setting|code": "238",
      "template_clinical_encounter_v1/context/setting|value": "other care",
      "template_clinical_encounter_v1/context/setting|terminology": "openehr",

      // Category
      "template_clinical_encounter_v1/category|code": "433",
      "template_clinical_encounter_v1/category|value": "event",
      "template_clinical_encounter_v1/category|terminology": "openehr",

      // Map referral fields to problem_diagnosis fields with REFERRAL prefix
      "template_clinical_encounter_v1/problem_diagnosis/problem_diagnosis_name": `REFERRAL: ${referral.clinicalIndication}`,
      "template_clinical_encounter_v1/problem_diagnosis/clinical_description": `${referral.physicianDepartment} | ${referral.receivingPhysician || ""}`,
      "template_clinical_encounter_v1/problem_diagnosis/variant:0": referral.urgency,
      "template_clinical_encounter_v1/problem_diagnosis/body_site:0": "pending",
      "template_clinical_encounter_v1/problem_diagnosis/comment": referral.comment || "",
    };

    const compositionUid = await createReferral(ehrId, composition);

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
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
