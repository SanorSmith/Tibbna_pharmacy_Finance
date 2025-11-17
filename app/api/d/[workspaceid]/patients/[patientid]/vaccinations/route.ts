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

// Initialize with dummy data for demonstration
const vaccinationStore: Record<string, VaccinationRecord[]> = {
  // Sample patient ID with dummy vaccinations
  "eaf012cb-359a-4ed4-8679-124cbdf7465a": [
    {
      composition_uid: "vaccination-1731847200000-001",
      recorded_time: "2024-03-15T10:00:00.000Z",
      vaccine_name: "Influenza Vaccine (Quadrivalent)",
      targeted_disease: "Influenza",
      description: "Seasonal flu vaccine for 2023-2024 season",
      total_administrations: 1,
      last_vaccine_date: "2024-03-15",
      next_vaccine_due: "2025-03-15",
      additional_details: "Administered in left deltoid muscle. No adverse reactions reported.",
      comment: "Patient tolerated vaccine well. Advised to monitor for any reactions."
    },
    {
      composition_uid: "vaccination-1715097600000-002",
      recorded_time: "2023-05-07T14:30:00.000Z",
      vaccine_name: "Tetanus-Diphtheria (Td) Booster",
      targeted_disease: "Tetanus and Diphtheria",
      description: "Routine Td booster vaccination",
      total_administrations: 1,
      last_vaccine_date: "2023-05-07",
      next_vaccine_due: "2033-05-07",
      additional_details: "Administered in right deltoid. Patient reported mild soreness at injection site.",
      comment: "Next booster due in 10 years. Patient counseled on wound care."
    },
    {
      composition_uid: "vaccination-1698451200000-003",
      recorded_time: "2022-10-28T09:15:00.000Z",
      vaccine_name: "COVID-19 Vaccine (Bivalent Booster)",
      targeted_disease: "COVID-19",
      description: "Updated bivalent COVID-19 booster dose",
      total_administrations: 5,
      last_vaccine_date: "2022-10-28",
      next_vaccine_due: "2023-10-28",
      additional_details: "Fifth dose (bivalent booster). Administered in left arm. No immediate adverse reactions.",
      comment: "Patient completed primary series and boosters. Annual boosters recommended."
    },
    {
      composition_uid: "vaccination-1672531200000-004",
      recorded_time: "2021-01-01T11:00:00.000Z",
      vaccine_name: "Pneumococcal Polysaccharide Vaccine (PPSV23)",
      targeted_disease: "Pneumococcal Disease",
      description: "Pneumococcal vaccination for adults",
      total_administrations: 1,
      last_vaccine_date: "2021-01-01",
      next_vaccine_due: "2026-01-01",
      additional_details: "Administered subcutaneously in left arm. Patient has history of asthma.",
      comment: "Recommended for patients with chronic respiratory conditions. Next dose in 5 years."
    },
    {
      composition_uid: "vaccination-1609459200000-005",
      recorded_time: "2020-01-01T10:30:00.000Z",
      vaccine_name: "Hepatitis B Vaccine",
      targeted_disease: "Hepatitis B",
      description: "Hepatitis B vaccination series - Dose 3 of 3",
      total_administrations: 3,
      last_vaccine_date: "2020-01-01",
      additional_details: "Completed 3-dose series. Administered in right deltoid. Series started in 2019.",
      comment: "Series complete. Post-vaccination serology recommended to confirm immunity."
    }
  ]
};

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
