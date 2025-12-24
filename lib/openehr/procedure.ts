/**
 * OpenEHR Procedure/Surgery Management
 * Uses SERVICE_REQUEST in clinical encounter template with PROCEDURE_REQUEST marker
 */

import {
  getOpenEHRCompositions,
  createOpenEHRComposition,
} from "./openehr";
import { SERVICE_REQUEST_MARKERS, isServiceRequestType } from "./service-request-types";

// Template for procedure/surgery scheduling using clinical encounter template
export interface ProcedureCompositionFlat extends Record<string, unknown> {
  // Metadata
  "template_clinical_encounter_v1/language|code"?: string;
  "template_clinical_encounter_v1/language|terminology"?: string;
  "template_clinical_encounter_v1/territory|code"?: string;
  "template_clinical_encounter_v1/territory|terminology"?: string;
  "template_clinical_encounter_v1/composer|name"?: string;
  "template_clinical_encounter_v1/context/start_time"?: string;
  "template_clinical_encounter_v1/context/setting|code"?: string;
  "template_clinical_encounter_v1/context/setting|value"?: string;
  "template_clinical_encounter_v1/context/setting|terminology"?: string;
  "template_clinical_encounter_v1/category|code"?: string;
  "template_clinical_encounter_v1/category|value"?: string;
  "template_clinical_encounter_v1/category|terminology"?: string;

  // Service Request for procedure scheduling
  "template_clinical_encounter_v1/service_request/request/service_name|other"?: string;
  "template_clinical_encounter_v1/service_request/request/description"?: string;
  "template_clinical_encounter_v1/service_request/request/clinical_indication"?: string;
  "template_clinical_encounter_v1/service_request/request/requested_date"?: string;
  "template_clinical_encounter_v1/service_request/request/requesting_provider"?: string;
  "template_clinical_encounter_v1/service_request/narrative"?: string;
  "template_clinical_encounter_v1/service_request/language|code"?: string;
  "template_clinical_encounter_v1/service_request/language|terminology"?: string;
  "template_clinical_encounter_v1/service_request/encoding|code"?: string;
  "template_clinical_encounter_v1/service_request/encoding|terminology"?: string;
}

export interface Procedure {
  composition_uid: string;
  recorded_time: string;
  procedure_name: string;
  procedure_code?: string;
  body_site?: string;
  laterality?: string;
  method?: string;
  description?: string;
  scheduled_date_time?: string;
  duration?: string;
  urgency?: string;
  indication?: string;
  outcome?: string;
  complications?: string;
  performer_name?: string;
  performer_role?: string;
  anesthesia_type?: string;
  theater_location?: string;
  estimated_duration?: string;
  preoperative_assessment?: string;
  current_state: string;
  careflow_step: string;
  comment?: string;
}

/**
 * Parse a procedure composition from OpenEHR
 */
export function parseProcedureComposition(
  composition: Record<string, unknown>,
  compositionUid: string,
  recordedTime: string
): Procedure {
  const content = (composition.content || composition) as Record<string, unknown>;

  return {
    composition_uid: compositionUid,
    recorded_time: recordedTime,
    procedure_name:
      (content["template_clinical_encounter_v1/service_request/request/service_name|other"] as string) ||
      "Surgical Procedure",
    procedure_code: undefined,
    body_site: undefined,
    laterality: undefined,
    method: undefined,
    description: content["template_clinical_encounter_v1/service_request/request/description"] as string | undefined,
    scheduled_date_time:
      content["template_clinical_encounter_v1/service_request/request/requested_date"] as string | undefined,
    duration: undefined,
    urgency: undefined,
    indication: content["template_clinical_encounter_v1/service_request/request/clinical_indication"] as string | undefined,
    outcome: undefined,
    complications: undefined,
    performer_name:
      content["template_clinical_encounter_v1/service_request/request/requesting_provider"] as string | undefined,
    performer_role: "Surgeon",
    anesthesia_type: undefined,
    theater_location: undefined,
    estimated_duration: undefined,
    preoperative_assessment: content["template_clinical_encounter_v1/service_request/narrative"] as string | undefined,
    current_state: "planned",
    careflow_step: "procedure_scheduled",
    comment: content["template_clinical_encounter_v1/service_request/narrative"] as string | undefined,
  };
}

/**
 * List all procedures for a patient
 */
export async function listProcedures(ehrId: string): Promise<
  Array<{
    composition_uid: string;
    start_time: string;
  }>
> {
  const allCompositions = await getOpenEHRCompositions(ehrId);
  
  // Filter for clinical encounter compositions
  const filtered = allCompositions
    .filter((c) => c.composition_name?.includes("Clinical encounter") || c.composition_name?.includes("clinical_encounter"))
    .map((c) => ({
      composition_uid: c.composition_uid,
      start_time: c.start_time,
    }));
  
  return filtered;
}

/**
 * Get a specific procedure composition
 */
export async function getProcedure(
  ehrId: string,
  compositionUid: string
): Promise<Record<string, unknown>> {
  const response = await fetch(
    `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/ehr/${ehrId}/composition/${compositionUid}?format=FLAT`,
    {
      headers: {
        "X-API-Key": process.env.EHRBASE_API_KEY!,
        Authorization: `Basic ${Buffer.from(
          `${process.env.EHRBASE_USER}:${process.env.EHRBASE_PASSWORD}`
        ).toString("base64")}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch procedure: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new procedure composition in OpenEHR
 */
export async function createProcedure(
  ehrId: string,
  procedureData: {
    procedure_name: string;
    procedure_code?: string;
    body_site?: string;
    laterality?: string;
    method?: string;
    description?: string;
    scheduled_date_time?: string;
    duration?: string;
    urgency?: string;
    indication?: string;
    anesthesia_type?: string;
    theater_location?: string;
    estimated_duration?: string;
    preoperative_assessment?: string;
    performer_name?: string;
    performer_role?: string;
    current_state?: string;
    careflow_step?: string;
    comment?: string;
  },
  composerName: string
): Promise<string> {
  const compositionData: ProcedureCompositionFlat = {
    "template_clinical_encounter_v1/language|code": "en",
    "template_clinical_encounter_v1/language|terminology": "ISO_639-1",
    "template_clinical_encounter_v1/territory|code": "US",
    "template_clinical_encounter_v1/territory|terminology": "ISO_3166-1",
    "template_clinical_encounter_v1/composer|name": composerName,
    "template_clinical_encounter_v1/context/start_time": new Date().toISOString(),
    "template_clinical_encounter_v1/context/setting|code": "238",
    "template_clinical_encounter_v1/context/setting|value": "other care",
    "template_clinical_encounter_v1/context/setting|terminology": "openehr",
    "template_clinical_encounter_v1/category|code": "433",
    "template_clinical_encounter_v1/category|value": "event",
    "template_clinical_encounter_v1/category|terminology": "openehr",

    // Service Request for procedure - use PROCEDURE_REQUEST marker
    "template_clinical_encounter_v1/service_request/request/service_name|other":
      procedureData.procedure_name,
    "template_clinical_encounter_v1/service_request/request/description":
      SERVICE_REQUEST_MARKERS.PROCEDURE,
    "template_clinical_encounter_v1/service_request/language|code": "en",
    "template_clinical_encounter_v1/service_request/language|terminology": "ISO_639-1",
    "template_clinical_encounter_v1/service_request/encoding|code": "UTF-8",
    "template_clinical_encounter_v1/service_request/encoding|terminology":
      "IANA_character-sets",
  };

  // Optional fields
  if (procedureData.scheduled_date_time) {
    compositionData["template_clinical_encounter_v1/service_request/request/requested_date"] =
      procedureData.scheduled_date_time;
  }

  if (procedureData.indication) {
    compositionData["template_clinical_encounter_v1/service_request/request/clinical_indication"] =
      procedureData.indication;
  }

  if (procedureData.performer_name) {
    compositionData["template_clinical_encounter_v1/service_request/request/requesting_provider"] =
      procedureData.performer_name;
  }

  // Combine all details into narrative
  const narrativeParts = [];
  if (procedureData.urgency) narrativeParts.push(`Urgency: ${procedureData.urgency}`);
  if (procedureData.description) narrativeParts.push(procedureData.description);
  if (procedureData.anesthesia_type) narrativeParts.push(`Anesthesia: ${procedureData.anesthesia_type}`);
  if (procedureData.theater_location) narrativeParts.push(`Theater: ${procedureData.theater_location}`);
  if (procedureData.estimated_duration) narrativeParts.push(`Duration: ${procedureData.estimated_duration}`);
  if (procedureData.preoperative_assessment) narrativeParts.push(procedureData.preoperative_assessment);
  if (procedureData.comment) narrativeParts.push(procedureData.comment);
  
  if (narrativeParts.length > 0) {
    compositionData["template_clinical_encounter_v1/service_request/narrative"] =
      narrativeParts.join(" | ");
  }

  return createOpenEHRComposition(
    ehrId,
    "template_clinical_encounter_v1",
    compositionData
  );
}

/**
 * Get all procedures for a patient
 */
export async function getOpenEHRProcedures(ehrId: string): Promise<Procedure[]> {
  try {
    const proceduresList = await listProcedures(ehrId);

    const procedures: Procedure[] = [];
    for (const item of proceduresList) {
      try {
        const fullComposition = await getProcedure(ehrId, item.composition_uid);
        const content = (fullComposition.content || fullComposition) as Record<string, unknown>;
        
        // Only include if it's marked as a procedure request
        const description = content["template_clinical_encounter_v1/service_request/request/description"] as string | undefined;
        
        if (!isServiceRequestType(description, SERVICE_REQUEST_MARKERS.PROCEDURE)) {
          continue;
        }
        
        const parsed = parseProcedureComposition(
          fullComposition,
          item.composition_uid,
          item.start_time
        );
        procedures.push(parsed);
      } catch (error) {
        console.error(`Error processing composition ${item.composition_uid}:`, error);
        continue;
      }
    }

    return procedures.sort(
      (a, b) =>
        new Date(b.recorded_time).getTime() -
        new Date(a.recorded_time).getTime()
    );
  } catch (error) {
    console.error("Error fetching procedures:", error);
    return [];
  }
}
