import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getOpenEHREHRBySubjectId, getOpenEHRCompositions, getOpenEHRComposition, createOpenEHRComposition } from "@/lib/openehr/openehr";

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/vital-signs
 * Retrieve vital signs for a patient directly from OpenEHR compositions
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
         
            const respiratory_rate = 
            details["template_clinical_encounter_v1/vital_signs/any_event:0/respiratory_rate|magnitude"];
            
            const spo2 = 
            details["template_clinical_encounter_v1/vital_signs/any_event:0/oxygen_saturation_spo2|magnitude"];
          // Note: respiratory_rate and spo2 are not in this template

          return {
            composition_uid: comp.composition_uid,
            recorded_time: comp.start_time,
            temperature: temperature ? parseFloat(temperature) : undefined,
            systolic: systolic ? parseFloat(systolic) : undefined,
            diastolic: diastolic ? parseFloat(diastolic) : undefined,
            heart_rate: heart_rate ? parseFloat(heart_rate) : undefined,
            respiratory_rate: respiratory_rate ? parseFloat(respiratory_rate) : undefined,
            spo2: spo2 ? parseFloat(spo2) : undefined,
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
 * Create a new clinical encounter composition in OpenEHR with supplied vitals
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

const eventTime = new Date().toISOString();

// Temperature
if (temperature) {
  compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/body_temperature|magnitude"] = parseFloat(temperature);
  compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/body_temperature|unit"] = "°C";
  compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/time"] = eventTime;
}

// Blood Pressure
if (systolic && diastolic) {
  compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/systolic_blood_pressure|magnitude"] = parseFloat(systolic);
  compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/systolic_blood_pressure|unit"] = "mm[Hg]";
  compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/diastolic_blood_pressure|magnitude"] = parseFloat(diastolic);
  compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/diastolic_blood_pressure|unit"] = "mm[Hg]";

  if (!compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/time"]) {
    compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/time"] = eventTime;
  }
}

// Heart Rate
if (heartRate) {
  compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/heart_rate|magnitude"] = parseFloat(heartRate);
  compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/heart_rate|unit"] = "/min";

  if (!compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/time"]) {
    compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/time"] = eventTime;
  }
}

// Respiratory Rate
if (respiratoryRate) {
  compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/respiratory_rate|magnitude"] = parseFloat(respiratoryRate);
  compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/respiratory_rate|unit"] = "/min";

  if (!compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/time"]) {
    compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/time"] = eventTime;
  }
}

// Oxygen Saturation (SpO2)
if (spO2) {
  compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/oxygen_saturation_spo2|magnitude"] = parseFloat(spO2);
  compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/oxygen_saturation_spo2|unit"] = "%";

  if (!compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/time"]) {
    compositionData["template_clinical_encounter_v1/vital_signs/any_event:0/time"] = eventTime;
  }
}

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
