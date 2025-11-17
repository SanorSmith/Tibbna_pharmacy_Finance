import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

// In-memory storage for vaccinations (dummy data)
// In production, this would be stored in EHRbase or a database
interface VaccinationRecord {
  composition_uid: string;
  recorded_time: string;
  vaccine_name: string;
  targeted_disease: string;
  description?: string;
  total_administrations?: number;
  last_vaccine_date?: string;
  next_vaccine_due?: string;
  additional_details?: string;
  comment?: string;
}

const vaccinationStore: Record<string, VaccinationRecord[]> = {};

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/vaccinations
 * Retrieve vaccination summary records for a patient (from dummy data)
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

    // Only doctors and nurses can view vaccinations
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const records = vaccinationStore[patientid] || [];

    return NextResponse.json({ vaccinations: records });
  } catch (error) {
    console.error("Error fetching vaccinations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/vaccinations
 * Create a new vaccination summary record (dummy data storage)
 *
 * Follows openEHR Vaccination summary concepts:
 * - vaccine_name
 * - targeted_disease
 * - description
 * - total_administrations
 * - last_vaccine_date
 * - next_vaccine_due
 * - additional_details
 * - comment
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

    // Only doctors and nurses can record vaccinations
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { vaccination } = body;

    const record = {
      composition_uid: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recorded_time: new Date().toISOString(),
      vaccine_name: vaccination.vaccineName,
      targeted_disease: vaccination.targetedDisease,
      description: vaccination.description,
      total_administrations: vaccination.totalAdministrations
        ? parseInt(vaccination.totalAdministrations, 10)
        : undefined,
      last_vaccine_date: vaccination.lastVaccineDate || undefined,
      next_vaccine_due: vaccination.nextVaccineDue || undefined,
      additional_details: vaccination.additionalDetails,
      comment: vaccination.comment,
    };

    if (!vaccinationStore[patientid]) {
      vaccinationStore[patientid] = [];
    }

    vaccinationStore[patientid].unshift(record);

    console.log("✅ Vaccination recorded (dummy data):", record);

    return NextResponse.json(
      {
        success: true,
        message: "Vaccination recorded successfully",
        record,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating vaccination:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
