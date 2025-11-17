import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

// In-memory storage for referrals (dummy data)
// In production, this would be stored in EHRbase or a database
const referralStore: Record<string, any[]> = {};

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/referrals
 * Retrieve referral records for a patient (from dummy data)
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

    const records = referralStore[patientid] || [];

    return NextResponse.json({ referrals: records });
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
 * Create a new referral record (dummy data storage)
 *
 * Follows openEHR Referral concepts:
 * - physician_department (referred to)
 * - clinical_indication (reason for referral)
 * - urgency (yes/no or priority level)
 * - comment (additional notes)
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
      return NextResponse.json({ error: "Forbidden - Only doctors can create referrals" }, { status: 403 });
    }

    const body = await request.json();
    const { referral } = body;

    const record = {
      composition_uid: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recorded_time: new Date().toISOString(),
      physician_department: referral.physicianDepartment,
      clinical_indication: referral.clinicalIndication,
      urgency: referral.urgency, // "yes" or "no"
      comment: referral.comment,
      referred_by: user.name || user.email, // Track who made the referral
      status: "pending", // pending, accepted, completed, cancelled
    };

    if (!referralStore[patientid]) {
      referralStore[patientid] = [];
    }

    referralStore[patientid].unshift(record);

    console.log("✅ Referral recorded (dummy data):", record);

    return NextResponse.json(
      {
        success: true,
        message: "Referral created successfully",
        record,
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
