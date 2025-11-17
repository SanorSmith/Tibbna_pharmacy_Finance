import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

// In-memory storage for vital signs (dummy data)
// In production, this would be stored in EHRbase or a database
interface VitalSignsRecord {
  composition_uid: string;
  recorded_time: string;
  temperature?: number;
  systolic?: number;
  diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  spo2?: number;
  recorded_by?: string;
}

// Initialize with dummy data for demonstration
const vitalSignsStore: Record<string, VitalSignsRecord[]> = {
  // Sample patient ID with dummy vital signs
  "eaf012cb-359a-4ed4-8679-124cbdf7465a": [
    {
      composition_uid: "vital-signs-1731847200000-001",
      recorded_time: "2024-11-17T08:00:00.000Z",
      systolic: 128,
      diastolic: 82,
      heart_rate: 72,
      temperature: 36.8,
      respiratory_rate: 16,
      spo2: 98,
      recorded_by: "Nurse Jennifer Martinez, RN"
    },
    {
      composition_uid: "vital-signs-1731760800000-002",
      recorded_time: "2024-11-16T14:30:00.000Z",
      systolic: 132,
      diastolic: 85,
      heart_rate: 75,
      temperature: 37.0,
      respiratory_rate: 18,
      spo2: 97,
      recorded_by: "Nurse David Lee, RN"
    },
    {
      composition_uid: "vital-signs-1731674400000-003",
      recorded_time: "2024-11-15T09:15:00.000Z",
      systolic: 125,
      diastolic: 80,
      heart_rate: 68,
      temperature: 36.7,
      respiratory_rate: 15,
      spo2: 99,
      recorded_by: "Nurse Mary Johnson, RN"
    },
    {
      composition_uid: "vital-signs-1731588000000-004",
      recorded_time: "2024-11-14T10:45:00.000Z",
      systolic: 130,
      diastolic: 84,
      heart_rate: 70,
      temperature: 36.9,
      respiratory_rate: 16,
      spo2: 98,
      recorded_by: "Nurse Jennifer Martinez, RN"
    },
    {
      composition_uid: "vital-signs-1731501600000-005",
      recorded_time: "2024-11-13T16:20:00.000Z",
      systolic: 135,
      diastolic: 88,
      heart_rate: 78,
      temperature: 37.1,
      respiratory_rate: 17,
      spo2: 96,
      recorded_by: "Nurse David Lee, RN"
    }
  ]
};

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
