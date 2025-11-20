import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getOpenEHREHRBySubjectId, getOpenEHRCompositions, getOpenEHRComposition, createOpenEHRComposition } from "@/lib/openehr/openehr";

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
      // No EHR found, return empty array
      return NextResponse.json({ vitalSigns: [] });
    }

    // Fetch all compositions and extract vitals
    const compositions = await getOpenEHRCompositions(ehrId);
    
    // Fetch full details for each composition to extract vitals
    const vitalSigns = await Promise.all(
      compositions.map(async (comp) => {
        try {
          const details = await getOpenEHRComposition(ehrId, comp.composition_uid) as Record<string, any>;
          
          // Extract vitals from composition details using correct template paths
          const temperature = 
            details["template_clinical_encounter_v1/vital_signs/any_event:0/body_temperature|magnitude"];
          
          const systolic = 
            details["template_clinical_encounter_v1/vital_signs/any_event:0/systolic_blood_pressure|magnitude"];
          
          const diastolic = 
            details["template_clinical_encounter_v1/vital_signs/any_event:0/diastolic_blood_pressure|magnitude"];
          
          const heart_rate = 
            details["template_clinical_encounter_v1/vital_signs/any_event:0/heart_rate|magnitude"];
          
          // Note: respiratory_rate and spo2 are not in this template

          return {
            composition_uid: comp.composition_uid,
            recorded_time: comp.start_time,
            temperature: temperature ? parseFloat(temperature) : undefined,
            systolic: systolic ? parseFloat(systolic) : undefined,
            diastolic: diastolic ? parseFloat(diastolic) : undefined,
            heart_rate: heart_rate ? parseFloat(heart_rate) : undefined,
            // These fields are not in template_clinical_encounter_v1
            respiratory_rate: undefined,
            spo2: undefined,
          };
        } catch (error) {
          console.error(`Failed to fetch composition ${comp.composition_uid}:`, error);
          return {
            composition_uid: comp.composition_uid,
            recorded_time: comp.start_time,
          };
        }
      })
    );

    return NextResponse.json({ vitalSigns });
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
    const { temperature, systolic, diastolic, heartRate, respiratoryRate, spO2 } = body;

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
      return NextResponse.json({ error: "No EHR found for this patient" }, { status: 404 });
    }

    // Create composition data in FLAT format using correct template paths
    const compositionData: Record<string, unknown> = {
      "template_clinical_encounter_v1/language|code": "en",
      "template_clinical_encounter_v1/language|terminology": "ISO_639-1",
      "template_clinical_encounter_v1/territory|code": "US",
      "template_clinical_encounter_v1/territory|terminology": "ISO_3166-1",
      "template_clinical_encounter_v1/composer|name": user.name || "Unknown",
      "template_clinical_encounter_v1/context/start_time": new Date().toISOString(),
      "template_clinical_encounter_v1/context/setting|code": "238",
      "template_clinical_encounter_v1/context/setting|value": "other care",
      "template_clinical_encounter_v1/context/setting|terminology": "openehr",
      "template_clinical_encounter_v1/category|code": "433",
      "template_clinical_encounter_v1/category|value": "event",
      "template_clinical_encounter_v1/category|terminology": "openehr",
    };

    // Add vitals to composition using correct template paths
    if (temperature) {
      compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/body_temperature|magnitude"] = parseFloat(temperature);
      compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/body_temperature|unit"] = "°C";
      compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/time"] = new Date().toISOString();
    }
    if (systolic && diastolic) {
      compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/systolic_blood_pressure|magnitude"] = parseFloat(systolic);
      compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/systolic_blood_pressure|unit"] = "mm[Hg]";
      compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/diastolic_blood_pressure|magnitude"] = parseFloat(diastolic);
      compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/diastolic_blood_pressure|unit"] = "mm[Hg]";
      if (!temperature) {
        compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/time"] = new Date().toISOString();
      }
    }
    if (heartRate) {
      compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/heart_rate|magnitude"] = parseFloat(heartRate);
      compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/heart_rate|unit"] = "/min";
      if (!temperature && !systolic) {
        compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/time"] = new Date().toISOString();
      }
    }
    // Note: respiratory_rate and spo2 are not in this template
    // Only temperature, blood_pressure, and heart_rate are supported
    
    // Add required encoding fields
    if (temperature || systolic || heartRate || respiratoryRate || spO2) {
      compositionData["template_clinical_encounter_v1/vital_signs/language|code"] = "en";
      compositionData["template_clinical_encounter_v1/vital_signs/language|terminology"] = "ISO_639-1";
      compositionData["template_clinical_encounter_v1/vital_signs/encoding|code"] = "UTF-8";
      compositionData["template_clinical_encounter_v1/vital_signs/encoding|terminology"] = "IANA_character-sets";
    }

    // Create composition in OpenEHR
    // Note: Replace 'template_clinical_encounter_v1' with your actual template ID
    const compositionUid = await createOpenEHRComposition(
      ehrId,
      "template_clinical_encounter_v1",
      compositionData
    );

    return NextResponse.json({
      success: true,
      composition_uid: compositionUid,
      message: "Vital signs recorded successfully in OpenEHR"
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating vital signs:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
