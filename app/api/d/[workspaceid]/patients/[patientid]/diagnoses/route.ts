import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { 
  getOpenEHREHRBySubjectId, 
  createOpenEHRComposition,
  getOpenEHRCompositions,
  getOpenEHRComposition
} from "@/lib/openehr/openehr";

// Type definitions for OpenEHR composition
interface OpenEHRComposition {
  composition_uid: string;
  start_time: string;
}

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
      return NextResponse.json({ diagnoses: [] });
    }

    // Fetch all compositions and extract diagnoses
    const compositions = await getOpenEHRCompositions(ehrId);
    
    // Fetch full details for each composition to extract diagnoses
    const diagnoses = await Promise.all(
      compositions.map(async (comp: OpenEHRComposition) => {
        try {
          const details = await getOpenEHRComposition(ehrId, comp.composition_uid) as Record<string, any>;
          
          // Extract diagnosis from composition details using correct template paths
          const problemDiagnosis = 
            details["template_clinical_encounter_v1/problem_diagnosis/problem_diagnosis_name"];
          
          const variant = 
            details["template_clinical_encounter_v1/problem_diagnosis/variant:0"];
          
          const clinicalDescription = 
            details["template_clinical_encounter_v1/problem_diagnosis/clinical_description"];
          
          const bodySite = 
            details["template_clinical_encounter_v1/problem_diagnosis/body_site:0"];
          
          const dateOfOnset = 
            details["template_clinical_encounter_v1/problem_diagnosis/date_time_of_onset"];
          
          const dateOfResolution = 
            details["template_clinical_encounter_v1/problem_diagnosis/date_time_of_resolution"];
          
          const severity = 
            details["template_clinical_encounter_v1/problem_diagnosis/severity|value"];
          
          const comment = 
            details["template_clinical_encounter_v1/problem_diagnosis/comment"];

          // Only return if there's an actual diagnosis
          if (problemDiagnosis) {
            return {
              composition_uid: comp.composition_uid,
              recorded_time: comp.start_time,
              problem_diagnosis: problemDiagnosis,
              clinical_status: variant || "active",
              clinical_description: clinicalDescription,
              body_site: bodySite,
              date_of_onset: dateOfOnset,
              date_of_resolution: dateOfResolution,
              severity: severity,
              comment: comment,
            };
          }
        } catch (error) {
          console.error(`Failed to fetch composition ${comp.composition_uid}:`, error);
        }
        return null;
      })
    );

    // Filter out null entries and sort by date
    const validDiagnoses = diagnoses
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(b.recorded_time).getTime() - new Date(a.recorded_time).getTime());

    return NextResponse.json({ diagnoses: validDiagnoses });
  } catch (error) {
    console.error("Error fetching diagnoses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const body = await request.json();
    const {
      problemDiagnosis,
      clinicalStatus,
      dateOfOnset,
      dateOfResolution,
      clinicalDescription,
      bodySite,
      comment,
    } = body;

    // Validate required fields
    if (!problemDiagnosis) {
      return NextResponse.json({ error: "Problem/Diagnosis name is required" }, { status: 400 });
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

    // Add diagnosis to composition using correct template paths
    const eventTime = new Date().toISOString();

    // Problem/Diagnosis Name (required)
    compositionData["template_clinical_encounter_v1/problem_diagnosis/problem_diagnosis_name"] = problemDiagnosis;

    // Clinical Status (mapped to variant)
    if (clinicalStatus) {
      compositionData["template_clinical_encounter_v1/problem_diagnosis/variant:0"] = clinicalStatus;
    }

    // Clinical Description
    if (clinicalDescription) {
      compositionData["template_clinical_encounter_v1/problem_diagnosis/clinical_description"] = clinicalDescription;
    }

    // Body Site
    if (bodySite) {
      compositionData["template_clinical_encounter_v1/problem_diagnosis/body_site:0"] = bodySite;
    }

    // Date/Time of Onset
    if (dateOfOnset) {
      compositionData["template_clinical_encounter_v1/problem_diagnosis/date_time_of_onset"] = new Date(dateOfOnset).toISOString();
    }

    // Date/Time of Resolution
    if (dateOfResolution) {
      compositionData["template_clinical_encounter_v1/problem_diagnosis/date_time_of_resolution"] = new Date(dateOfResolution).toISOString();
    }

    // Skip severity field for now - template has specific code requirements
    // TODO: Determine exact severity codes from OpenEHR template definition
    console.log("Severity field skipped - template validation issues");

    // Comment
    if (comment) {
      compositionData["template_clinical_encounter_v1/problem_diagnosis/comment"] = comment;
    }

    // Set language and encoding for diagnosis
    compositionData["template_clinical_encounter_v1/problem_diagnosis/language|code"] = "en";
    compositionData["template_clinical_encounter_v1/problem_diagnosis/language|terminology"] = "ISO_639-1";
    compositionData["template_clinical_encounter_v1/problem_diagnosis/encoding|code"] = "UTF-8";
    compositionData["template_clinical_encounter_v1/problem_diagnosis/encoding|terminology"] = "IANA_character-sets";

    // Check if there's a recent composition with vitals that we can update
    const compositions = await getOpenEHRCompositions(ehrId);
    const recentComposition = compositions.length > 0 ? compositions[0] : null;
    
    let compositionUid: string;
    let useExistingTimestamp = false;
    
    if (recentComposition) {
      // Try to get the most recent composition to see if it has vitals
      try {
        const existingDetails = await getOpenEHRComposition(ehrId, recentComposition.composition_uid) as Record<string, any>;
        
        // Check if this composition has vital signs data
        const hasVitals = existingDetails["template_clinical_encounter_v1/vital_signs/any_event:0/body_temperature|magnitude"] ||
                         existingDetails["template_clinical_encounter_v1/vital_signs/any_event:0/systolic_blood_pressure|magnitude"] ||
                         existingDetails["template_clinical_encounter_v1/vital_signs/any_event:0/heart_rate|magnitude"];
        
        if (hasVitals) {
          // This composition has vitals, so we'll use the same timestamp and preserve vitals
          // Use the same timestamp as the existing composition to create a true unified encounter
          compositionData["template_clinical_encounter_v1/context/start_time"] = recentComposition.start_time;
          useExistingTimestamp = true;
          
          // Copy existing vital signs data
          const vitalSignsPaths = [
            "template_clinical_encounter_v1/vital_signs/any_event:0/body_temperature|magnitude",
            "template_clinical_encounter_v1/vital_signs/any_event:0/body_temperature|unit",
            "template_clinical_encounter_v1/vital_signs/any_event:0/systolic_blood_pressure|magnitude",
            "template_clinical_encounter_v1/vital_signs/any_event:0/systolic_blood_pressure|unit",
            "template_clinical_encounter_v1/vital_signs/any_event:0/diastolic_blood_pressure|magnitude",
            "template_clinical_encounter_v1/vital_signs/any_event:0/diastolic_blood_pressure|unit",
            "template_clinical_encounter_v1/vital_signs/any_event:0/heart_rate|magnitude",
            "template_clinical_encounter_v1/vital_signs/any_event:0/heart_rate|unit",
            "template_clinical_encounter_v1/vital_signs/any_event:0/time"
          ];
          
          vitalSignsPaths.forEach(path => {
            if (existingDetails[path]) {
              compositionData[path] = existingDetails[path];
            }
          });
          
          console.log("Creating unified composition with same timestamp as existing vitals:", recentComposition.start_time);
          console.log("Will delete old composition after creating new one:", recentComposition.composition_uid);
        }
      } catch (error) {
        console.error("Failed to check existing composition:", error);
        // Fall back to creating a new composition
      }
    }
    
    // Create composition in OpenEHR
    compositionUid = await createOpenEHRComposition(
      ehrId,
      "template_clinical_encounter_v1",
      compositionData
    );

    return NextResponse.json({
      success: true,
      composition_uid: compositionUid,
      message: "Diagnosis recorded successfully in OpenEHR"
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating diagnosis:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
