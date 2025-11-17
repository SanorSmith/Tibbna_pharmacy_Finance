import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

// In-memory storage for vital signs (dummy data)
// In production, this would be stored in EHRbase or a database
const vitalSignsStore: Record<string, any[]> = {};

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/vital-signs
 * Retrieve vital signs for a patient (from dummy data)
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

    // Only doctors and nurses can view vital signs
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get vital signs from in-memory store
    const patientVitalSigns = vitalSignsStore[patientid] || [];

    return NextResponse.json({ vitalSigns: patientVitalSigns });
  } catch (error) {
    console.error("Error fetching vital signs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/vital-signs
 * Create a new vital signs record (dummy data storage)
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
    const { vitalSigns } = body;

    // Create vital signs record following openEHR structure
    const vitalSignsRecord = {
      composition_uid: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recorded_time: new Date().toISOString(),
      temperature: vitalSigns.temperature,
      systolic: vitalSigns.systolic,
      diastolic: vitalSigns.diastolic,
      heart_rate: vitalSigns.heartRate,
      respiratory_rate: vitalSigns.respiratoryRate,
      spo2: vitalSigns.spO2,
    };

    // Store in memory (initialize array if doesn't exist)
    if (!vitalSignsStore[patientid]) {
      vitalSignsStore[patientid] = [];
    }
    vitalSignsStore[patientid].unshift(vitalSignsRecord); // Add to beginning

    console.log("✅ Vital signs recorded (dummy data):", vitalSignsRecord);

    return NextResponse.json(
      { 
        success: true,
        message: "Vital signs recorded successfully",
        record: vitalSignsRecord
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating vital signs:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
