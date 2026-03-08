import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getOpenEHREHRBySubjectId,
  createVaccination,
  listVaccinations,
  getVaccination,
  type VaccinationComposition,
} from "@/lib/openehr";

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/vaccinations
 * Retrieve vaccination records for a patient from OpenEHR using template_clinical_encounter_v1
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
      return NextResponse.json({ vaccinations: [] }, { status: 200 });
    }

    // Get list of vaccination compositions
    const vaccinationList = await listVaccinations(ehrId);

    // Fetch full details for each vaccination
    const vaccinations = await Promise.all(
      vaccinationList.map(async (item) => {
        const composition = await getVaccination(ehrId, item.composition_uid);
        
        // Only include compositions that start with "VACCINATION:"
        const problemDiagnosis = composition["template_clinical_encounter_v1/problem_diagnosis/problem_diagnosis_name"] || "";
        if (!problemDiagnosis.startsWith("VACCINATION:")) {
          return null;
        }

        // Parse vaccination data from the composition fields
        const clinicalDescription = composition["template_clinical_encounter_v1/problem_diagnosis/clinical_description"] || "";
        const [vaccineName, targetedDisease] = clinicalDescription.split(" | ");

        // Parse comment field to extract next due date and additional details
        const comment = composition["template_clinical_encounter_v1/problem_diagnosis/comment"] || "";
        const commentParts = comment.split(" | ");
        const nextVaccineDue = commentParts[0]?.trim() || "";
        const additionalDetails = commentParts[1]?.trim() || "";
        const commentText = commentParts[2]?.trim() || "";

        return {
          composition_uid: item.composition_uid,
          recorded_time: item.start_time,
          vaccine_name: vaccineName || "",
          targeted_disease: targetedDisease || "",
          total_administrations: parseInt(composition["template_clinical_encounter_v1/problem_diagnosis/variant:0"] || "1"),
          last_vaccine_date: composition["template_clinical_encounter_v1/problem_diagnosis/body_site:0"] || "",
          next_vaccine_due: nextVaccineDue,
          additional_details: additionalDetails,
          comment: commentText,
        };
      })
    );

    // Filter out null entries (non-vaccination compositions)
    const filteredVaccinations = vaccinations.filter((v) => v !== null);

    return NextResponse.json({ vaccinations: filteredVaccinations }, { status: 200 });
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
 * Create a new vaccination record in OpenEHR using template_clinical_encounter_v1
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

    // Only doctors can create vaccinations
    if (membership.role !== "doctor") {
      return NextResponse.json(
        { error: "Forbidden - Only doctors can create vaccinations" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { vaccination } = body as {
      vaccination: {
        vaccineName: string;
        targetedDisease: string;
        description?: string;
        totalAdministrations?: string;
        lastVaccineDate?: string;
        nextVaccineDue?: string;
        additionalDetails?: string;
        comment?: string;
      };
    };

    if (!vaccination) {
      return NextResponse.json(
        { error: "Vaccination payload is required" },
        { status: 400 }
      );
    }

    if (!vaccination.vaccineName || !vaccination.targetedDisease) {
      return NextResponse.json(
        {
          error: "Vaccine Name and Targeted Disease are required for a vaccination",
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

    // Create composition using clinical encounter template with VACCINATION prefix
    const composition: VaccinationComposition = {
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

      // Map vaccination fields to problem_diagnosis fields with VACCINATION prefix
      "template_clinical_encounter_v1/problem_diagnosis/problem_diagnosis_name": `VACCINATION: ${vaccination.vaccineName}`,
      "template_clinical_encounter_v1/problem_diagnosis/clinical_description": `${vaccination.vaccineName} | ${vaccination.targetedDisease}`,
      "template_clinical_encounter_v1/problem_diagnosis/variant:0": vaccination.totalAdministrations || "1",
      "template_clinical_encounter_v1/problem_diagnosis/body_site:0": vaccination.lastVaccineDate || now,
      "template_clinical_encounter_v1/problem_diagnosis/comment": `${vaccination.nextVaccineDue || ""} | ${vaccination.additionalDetails || ""} | ${vaccination.comment || ""}`,
    };

    const compositionUid = await createVaccination(ehrId, composition);

    return NextResponse.json(
      {
        success: true,
        message: "Vaccination created successfully in OpenEHR",
        composition_uid: compositionUid,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating vaccination:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
