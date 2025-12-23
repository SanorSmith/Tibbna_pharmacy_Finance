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

    // Get list of referral compositions
    const referralList = await listReferrals(ehrId);

    // Fetch full details for each referral
    const referrals = await Promise.all(
      referralList.map(async (item) => {
        const composition = await getReferral(ehrId, item.composition_uid);
        return {
          composition_uid: item.composition_uid,
          recorded_time: item.start_time,
          physician_department: composition["template_referral_v1/referral/physician_department"] || "",
          receiving_physician: composition["template_referral_v1/referral/receiving_physician"] || "",
          clinical_indication: composition["template_referral_v1/referral/clinical_indication"] || "",
          urgency: composition["template_referral_v1/referral/urgency"] || "routine",
          comment: composition["template_referral_v1/referral/comment"] || "",
          referred_by: composition["template_referral_v1/composer|name"] || "Unknown",
          status: composition["template_referral_v1/referral/status"] || "pending",
        };
      })
    );

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

    // Create composition using the dedicated referral template
    const composition: ReferralComposition = {
      // Language / territory / composer
      "template_referral_v1/language|code": "en",
      "template_referral_v1/language|terminology": "ISO_639-1",
      "template_referral_v1/territory|code": "US",
      "template_referral_v1/territory|terminology": "ISO_3166-1",
      "template_referral_v1/composer|name": user.name || user.email || "Unknown",

      // Context
      "template_referral_v1/context/start_time": now,
      "template_referral_v1/context/setting|code": "238",
      "template_referral_v1/context/setting|value": "other care",
      "template_referral_v1/context/setting|terminology": "openehr",

      // Category
      "template_referral_v1/category|code": "433",
      "template_referral_v1/category|value": "event",
      "template_referral_v1/category|terminology": "openehr",

      // Referral fields
      "template_referral_v1/referral/physician_department": referral.physicianDepartment,
      "template_referral_v1/referral/receiving_physician": referral.receivingPhysician || "",
      "template_referral_v1/referral/clinical_indication": referral.clinicalIndication,
      "template_referral_v1/referral/urgency": referral.urgency,
      "template_referral_v1/referral/comment": referral.comment || "",
      "template_referral_v1/referral/referred_by": user.name || user.email || "Unknown",
      "template_referral_v1/referral/status": "pending",
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
