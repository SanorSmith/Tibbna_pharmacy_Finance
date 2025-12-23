import axios from "axios";

const username = process.env.EHRBASE_USER?.trim() || "";
const password = process.env.EHRBASE_PASSWORD?.trim() || "";
const credentials = `${username}:${password}`;
const basicAuth = Buffer.from(credentials, "utf-8").toString("base64");

// Clinical Encounter Composition Type - STRICT FLAT FORMAT
export interface ClinicalEncounterComposition {
  // Category
  "template_clinical_encounter_v2/category|terminology"?: string;
  "template_clinical_encounter_v2/category|code"?: string;
  "template_clinical_encounter_v2/category|value"?: string;

  // Context
  "template_clinical_encounter_v2/context/start_time"?: string;
  "template_clinical_encounter_v2/context/setting|value"?: string;
  "template_clinical_encounter_v2/context/setting|code"?: string;
  "template_clinical_encounter_v2/context/setting|terminology"?: string;
  "template_clinical_encounter_v2/context/_end_time"?: string;
  "template_clinical_encounter_v2/context/_health_care_facility|name"?: string;

  // Problem Diagnosis
  "template_clinical_encounter_v2/problem_diagnosis/problem_diagnosis_name"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/variant:0"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/clinical_description"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/body_site:0"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/cause:0"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/date_time_of_onset"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/date_time_clinically_recognised"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/severity|value"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/severity|terminology"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/severity|code"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/course_description"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/date_time_of_resolution"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/diagnostic_certainty|terminology"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/diagnostic_certainty|code"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/diagnostic_certainty|value"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/comment"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/last_updated"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/language|code"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/language|terminology"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/encoding|code"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/encoding|terminology"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/_work_flow_id|id"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/_work_flow_id|id_scheme"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/_work_flow_id|namespace"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/_work_flow_id|type"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/_guideline_id|id"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/_guideline_id|id_scheme"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/_guideline_id|namespace"?: string;
  "template_clinical_encounter_v2/problem_diagnosis/_guideline_id|type"?: string;

  // Service Request
  "template_clinical_encounter_v2/service_request/request/service_name|other"?: string;
  "template_clinical_encounter_v2/service_request/request/service_type|terminology"?: string;
  "template_clinical_encounter_v2/service_request/request/service_type|code"?: string;
  "template_clinical_encounter_v2/service_request/request/service_type|value"?: string;
  "template_clinical_encounter_v2/service_request/request/description"?: string;
  "template_clinical_encounter_v2/service_request/request/clinical_indication"?: string;
  "template_clinical_encounter_v2/service_request/request/urgency|code"?: string;
  "template_clinical_encounter_v2/service_request/request/urgency|value"?: string;
  "template_clinical_encounter_v2/service_request/request/urgency|terminology"?: string;
  "template_clinical_encounter_v2/service_request/request/requested_date"?: string;
  "template_clinical_encounter_v2/service_request/request/requesting_provider"?: string;
  "template_clinical_encounter_v2/service_request/request/receiving_provider"?: string;
  "template_clinical_encounter_v2/service_request/request/request_status|terminology"?: string;
  "template_clinical_encounter_v2/service_request/request/request_status|code"?: string;
  "template_clinical_encounter_v2/service_request/request/request_status|value"?: string;
  "template_clinical_encounter_v2/service_request/request/special_requirements"?: string;
  "template_clinical_encounter_v2/service_request/request/timing|formalism"?: string;
  "template_clinical_encounter_v2/service_request/request/timing"?: string;
  "template_clinical_encounter_v2/service_request/request/action_archetype_id"?: string;
  "template_clinical_encounter_v2/service_request/request_id"?: string;
  "template_clinical_encounter_v2/service_request/narrative"?: string;
  "template_clinical_encounter_v2/service_request/language|terminology"?: string;
  "template_clinical_encounter_v2/service_request/language|code"?: string;
  "template_clinical_encounter_v2/service_request/encoding|terminology"?: string;
  "template_clinical_encounter_v2/service_request/encoding|code"?: string;
  "template_clinical_encounter_v2/service_request/_work_flow_id|id"?: string;
  "template_clinical_encounter_v2/service_request/_work_flow_id|id_scheme"?: string;
  "template_clinical_encounter_v2/service_request/_work_flow_id|namespace"?: string;
  "template_clinical_encounter_v2/service_request/_work_flow_id|type"?: string;
  "template_clinical_encounter_v2/service_request/_guideline_id|id"?: string;
  "template_clinical_encounter_v2/service_request/_guideline_id|id_scheme"?: string;
  "template_clinical_encounter_v2/service_request/_guideline_id|namespace"?: string;
  "template_clinical_encounter_v2/service_request/_guideline_id|type"?: string;
  "template_clinical_encounter_v2/service_request/_wf_definition|value"?: string;
  "template_clinical_encounter_v2/service_request/_wf_definition|formalism"?: string;

  // Medication Order
  "template_clinical_encounter_v2/medication_order/order:0/medication_item"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/route:0"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/body_site"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/administration_method:0"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/overall_directions_description"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/parsable_directions"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/parsable_directions|formalism"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/specific_directions_description:0"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/dosage_justification:0"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/medication_safety/exceptional_safety_override"?: boolean;
  "template_clinical_encounter_v2/medication_order/order:0/medication_safety/safety_override:0/overriden_safety_advice"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/medication_safety/safety_override:0/override_reason:0"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/medication_safety/maximum_dose:0/maximum_amount|unit"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/medication_safety/maximum_dose:0/maximum_amount|magnitude"?: number;
  "template_clinical_encounter_v2/medication_order/order:0/medication_safety/maximum_dose:0/allowed_period"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/medication_safety/total_daily_effective_dose/purpose"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/medication_safety/total_daily_effective_dose/total_daily_amount|magnitude"?: number;
  "template_clinical_encounter_v2/medication_order/order:0/medication_safety/total_daily_effective_dose/total_daily_amount|unit"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/additional_instruction:0"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/patient_information:0"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/monitoring_instruction:0"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/clinical_indication:0"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/therapeutic_intent:0"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/clinician_guidance"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/order_details/order_start_date_time"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/order_details/order_stop_date_time"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/order_details/order_start_criterion:0"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/order_details/order_stop_criterion:0"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/order_details/administrations_completed"?: number;
  "template_clinical_encounter_v2/medication_order/order:0/order_details/duration_of_order_completed"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/dispense_directions/dispense_instruction:0"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/dispense_directions/substitution_direction|value"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/dispense_directions/substitution_direction|code"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/dispense_directions/substitution_direction|terminology"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/dispense_directions/non-substitution_reason"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/dispense_directions/priority"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/dispense_directions/dispensing_start_date"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/dispense_directions/dispensing_expiry_date"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/comment"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/timing|formalism"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/timing"?: string;
  "template_clinical_encounter_v2/medication_order/order:0/action_archetype_id"?: string;
  "template_clinical_encounter_v2/medication_order/order_identifier:0|id"?: string;
  "template_clinical_encounter_v2/medication_order/narrative"?: string;
  "template_clinical_encounter_v2/medication_order/language|terminology"?: string;
  "template_clinical_encounter_v2/medication_order/language|code"?: string;
  "template_clinical_encounter_v2/medication_order/encoding|terminology"?: string;
  "template_clinical_encounter_v2/medication_order/encoding|code"?: string;
  "template_clinical_encounter_v2/medication_order/_work_flow_id|id"?: string;
  "template_clinical_encounter_v2/medication_order/_work_flow_id|id_scheme"?: string;
  "template_clinical_encounter_v2/medication_order/_work_flow_id|namespace"?: string;
  "template_clinical_encounter_v2/medication_order/_work_flow_id|type"?: string;
  "template_clinical_encounter_v2/medication_order/_guideline_id|id"?: string;
  "template_clinical_encounter_v2/medication_order/_guideline_id|id_scheme"?: string;
  "template_clinical_encounter_v2/medication_order/_guideline_id|namespace"?: string;
  "template_clinical_encounter_v2/medication_order/_guideline_id|type"?: string;
  "template_clinical_encounter_v2/medication_order/_wf_definition|value"?: string;
  "template_clinical_encounter_v2/medication_order/_wf_definition|formalism"?: string;

  // Vital Signs - any_event:0
  "template_clinical_encounter_v2/vital_signs/any_event:0/systolic_blood_pressure|magnitude"?: number;
  "template_clinical_encounter_v2/vital_signs/any_event:0/systolic_blood_pressure|unit"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:0/diastolic_blood_pressure|unit"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:0/diastolic_blood_pressure|magnitude"?: number;
  "template_clinical_encounter_v2/vital_signs/any_event:0/heart_rate|unit"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:0/heart_rate|magnitude"?: number;
  "template_clinical_encounter_v2/vital_signs/any_event:0/body_temperature|magnitude"?: number;
  "template_clinical_encounter_v2/vital_signs/any_event:0/body_temperature|unit"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:0/respiratory_rate|magnitude"?: number;
  "template_clinical_encounter_v2/vital_signs/any_event:0/respiratory_rate|unit"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:0/oxygen_saturation_spo2|unit"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:0/oxygen_saturation_spo2|magnitude"?: number;
  "template_clinical_encounter_v2/vital_signs/any_event:0/comments"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:0/position|terminology"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:0/position|value"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:0/position|code"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:0/time"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:0/width"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:0/math_function|code"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:0/math_function|terminology"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:0/math_function|value"?: string;

  // Vital Signs - any_event:1
  "template_clinical_encounter_v2/vital_signs/any_event:1/systolic_blood_pressure|magnitude"?: number;
  "template_clinical_encounter_v2/vital_signs/any_event:1/systolic_blood_pressure|unit"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:1/diastolic_blood_pressure|magnitude"?: number;
  "template_clinical_encounter_v2/vital_signs/any_event:1/diastolic_blood_pressure|unit"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:1/heart_rate|magnitude"?: number;
  "template_clinical_encounter_v2/vital_signs/any_event:1/heart_rate|unit"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:1/body_temperature|magnitude"?: number;
  "template_clinical_encounter_v2/vital_signs/any_event:1/body_temperature|unit"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:1/respiratory_rate|unit"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:1/respiratory_rate|magnitude"?: number;
  "template_clinical_encounter_v2/vital_signs/any_event:1/oxygen_saturation_spo2|unit"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:1/oxygen_saturation_spo2|magnitude"?: number;
  "template_clinical_encounter_v2/vital_signs/any_event:1/comments"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:1/position|code"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:1/position|terminology"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:1/position|value"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:1/time"?: string;

  // Vital Signs - any_event:2
  "template_clinical_encounter_v2/vital_signs/any_event:2/systolic_blood_pressure|unit"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:2/systolic_blood_pressure|magnitude"?: number;
  "template_clinical_encounter_v2/vital_signs/any_event:2/diastolic_blood_pressure|unit"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:2/diastolic_blood_pressure|magnitude"?: number;
  "template_clinical_encounter_v2/vital_signs/any_event:2/heart_rate|unit"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:2/heart_rate|magnitude"?: number;
  "template_clinical_encounter_v2/vital_signs/any_event:2/body_temperature|unit"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:2/body_temperature|magnitude"?: number;
  "template_clinical_encounter_v2/vital_signs/any_event:2/respiratory_rate|unit"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:2/respiratory_rate|magnitude"?: number;
  "template_clinical_encounter_v2/vital_signs/any_event:2/oxygen_saturation_spo2|unit"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:2/oxygen_saturation_spo2|magnitude"?: number;
  "template_clinical_encounter_v2/vital_signs/any_event:2/comments"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:2/position|terminology"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:2/position|value"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:2/position|code"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:2/time"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:2/width"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:2/math_function|value"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:2/math_function|code"?: string;
  "template_clinical_encounter_v2/vital_signs/any_event:2/math_function|terminology"?: string;

  // Vital Signs - Other fields
  "template_clinical_encounter_v2/vital_signs/device"?: string;
  "template_clinical_encounter_v2/vital_signs/language|terminology"?: string;
  "template_clinical_encounter_v2/vital_signs/language|code"?: string;
  "template_clinical_encounter_v2/vital_signs/encoding|code"?: string;
  "template_clinical_encounter_v2/vital_signs/encoding|terminology"?: string;
  "template_clinical_encounter_v2/vital_signs/_work_flow_id|id"?: string;
  "template_clinical_encounter_v2/vital_signs/_work_flow_id|id_scheme"?: string;
  "template_clinical_encounter_v2/vital_signs/_work_flow_id|namespace"?: string;
  "template_clinical_encounter_v2/vital_signs/_work_flow_id|type"?: string;
  "template_clinical_encounter_v2/vital_signs/_guideline_id|id"?: string;
  "template_clinical_encounter_v2/vital_signs/_guideline_id|id_scheme"?: string;
  "template_clinical_encounter_v2/vital_signs/_guideline_id|namespace"?: string;
  "template_clinical_encounter_v2/vital_signs/_guideline_id|type"?: string;

  // Clinical Synopsis
  "template_clinical_encounter_v2/clinical_synopsis/synopsis"?: string;
  "template_clinical_encounter_v2/clinical_synopsis/language|terminology"?: string;
  "template_clinical_encounter_v2/clinical_synopsis/language|code"?: string;
  "template_clinical_encounter_v2/clinical_synopsis/encoding|terminology"?: string;
  "template_clinical_encounter_v2/clinical_synopsis/encoding|code"?: string;
  "template_clinical_encounter_v2/clinical_synopsis/_work_flow_id|id"?: string;
  "template_clinical_encounter_v2/clinical_synopsis/_work_flow_id|id_scheme"?: string;
  "template_clinical_encounter_v2/clinical_synopsis/_work_flow_id|namespace"?: string;
  "template_clinical_encounter_v2/clinical_synopsis/_work_flow_id|type"?: string;
  "template_clinical_encounter_v2/clinical_synopsis/_guideline_id|id"?: string;
  "template_clinical_encounter_v2/clinical_synopsis/_guideline_id|id_scheme"?: string;
  "template_clinical_encounter_v2/clinical_synopsis/_guideline_id|namespace"?: string;
  "template_clinical_encounter_v2/clinical_synopsis/_guideline_id|type"?: string;

  // Medication Management (ACTION)
  "template_clinical_encounter_v2/medication_management/ism_transition/careflow_step|code"?: string;
  "template_clinical_encounter_v2/medication_management/ism_transition/careflow_step|terminology"?: string;
  "template_clinical_encounter_v2/medication_management/ism_transition/careflow_step|value"?: string;
  "template_clinical_encounter_v2/medication_management/ism_transition/current_state|terminology"?: string;
  "template_clinical_encounter_v2/medication_management/ism_transition/current_state|value"?: string;
  "template_clinical_encounter_v2/medication_management/ism_transition/current_state|code"?: string;
  "template_clinical_encounter_v2/medication_management/ism_transition/transition|terminology"?: string;
  "template_clinical_encounter_v2/medication_management/ism_transition/transition|value"?: string;
  "template_clinical_encounter_v2/medication_management/ism_transition/transition|code"?: string;
  "template_clinical_encounter_v2/medication_management/medication_item"?: string;
  "template_clinical_encounter_v2/medication_management/clinical_indication"?: string;
  "template_clinical_encounter_v2/medication_management/substitution|terminology"?: string;
  "template_clinical_encounter_v2/medication_management/substitution|value"?: string;
  "template_clinical_encounter_v2/medication_management/substitution|code"?: string;
  "template_clinical_encounter_v2/medication_management/substitution_reason"?: string;
  "template_clinical_encounter_v2/medication_management/original_scheduled_date_time"?: string;
  "template_clinical_encounter_v2/medication_management/restart_date_time"?: string;
  "template_clinical_encounter_v2/medication_management/restart_criterion"?: string;
  "template_clinical_encounter_v2/medication_management/reason:0"?: string;
  "template_clinical_encounter_v2/medication_management/administration_details/route"?: string;
  "template_clinical_encounter_v2/medication_management/administration_details/body_site"?: string;
  "template_clinical_encounter_v2/medication_management/administration_details/administration_method:0"?: string;
  "template_clinical_encounter_v2/medication_management/patient_guidance:0"?: string;
  "template_clinical_encounter_v2/medication_management/double-checked"?: boolean;
  "template_clinical_encounter_v2/medication_management/sequence_number"?: number;
  "template_clinical_encounter_v2/medication_management/comment"?: string;
  "template_clinical_encounter_v2/medication_management/order_id:0/identifier_value|id"?: string;
  "template_clinical_encounter_v2/medication_management/language|terminology"?: string;
  "template_clinical_encounter_v2/medication_management/language|code"?: string;
  "template_clinical_encounter_v2/medication_management/encoding|terminology"?: string;
  "template_clinical_encounter_v2/medication_management/encoding|code"?: string;
  "template_clinical_encounter_v2/medication_management/time"?: string;
  "template_clinical_encounter_v2/medication_management/_work_flow_id|id"?: string;
  "template_clinical_encounter_v2/medication_management/_work_flow_id|id_scheme"?: string;
  "template_clinical_encounter_v2/medication_management/_work_flow_id|namespace"?: string;
  "template_clinical_encounter_v2/medication_management/_work_flow_id|type"?: string;
  "template_clinical_encounter_v2/medication_management/_guideline_id|id"?: string;
  "template_clinical_encounter_v2/medication_management/_guideline_id|id_scheme"?: string;
  "template_clinical_encounter_v2/medication_management/_guideline_id|namespace"?: string;
  "template_clinical_encounter_v2/medication_management/_guideline_id|type"?: string;
  "template_clinical_encounter_v2/medication_management/_instruction_details|activity_id"?: string;
  "template_clinical_encounter_v2/medication_management/_instruction_details|path"?: string;
  "template_clinical_encounter_v2/medication_management/_instruction_details|composition_uid"?: string;

  // Top-level metadata
  "template_clinical_encounter_v2/language|code"?: string;
  "template_clinical_encounter_v2/language|terminology"?: string;
  "template_clinical_encounter_v2/territory|terminology"?: string;
  "template_clinical_encounter_v2/territory|code"?: string;
  "template_clinical_encounter_v2/composer|name"?: string;
}

/**
 * Create a clinical encounter composition in OpenEHR
 * @param ehrId - The EHR ID to create the composition for
 * @param composition - The composition data in FLAT format
 * @returns The composition UID
 */
export async function createClinicalEncounter(
  ehrId: string,
  composition: ClinicalEncounterComposition
): Promise<string> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/ehr/${ehrId}/composition`;
  const response = await axios.post(url, composition, {
    headers: {
      "X-API-Key": process.env.EHRBASE_API_KEY!,
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    params: {
      format: "FLAT",
      templateId: "template_clinical_encounter_v2",
    },
  });
  return response.data.compositionUid || response.data.uid?.value;
}

/**
 * Get clinical encounters list for a specific EHR
 * @param ehrId - The EHR ID to query
 * @returns Array of encounter compositions with metadata
 */
export async function listClinicalEncounters(
  ehrId: string
): Promise<EncounterListItem[]> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/query/aql`;
  const query = `SELECT c/uid/value AS composition_uid, c/name/value AS composition_name, c/context/start_time/value AS start_time FROM EHR e CONTAINS COMPOSITION c WHERE e/ehr_id/value = '${ehrId}' ORDER BY c/context/start_time/value DESC`;

  const response = await axios.post(
    url,
    { q: query },
    {
      headers: {
        "X-API-Key": process.env.EHRBASE_API_KEY!,
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
    }
  );

  const rows = response.data.rows || [];

  // Transform rows array to objects
  return rows.map((row: unknown[]) => ({
    composition_uid: row[0] as string,
    composition_name: row[1] as string,
    start_time: row[2] as string,
  }));
}

/**
 * Get clinical encounters for a specific EHR
 * @param ehrId - The EHR ID to query
 * @returns Array of encounter compositions
 */
export async function getClinicalEncounters(ehrId: string): Promise<unknown[]> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/query/aql`;
  const query = `SELECT c FROM EHR e[ehr_id/value='${ehrId}'] CONTAINS COMPOSITION c[openEHR-EHR-COMPOSITION.encounter.v1] ORDER BY c/context/start_time DESC`;

  const response = await axios.post(
    url,
    { q: query },
    {
      headers: {
        "X-API-Key": process.env.EHRBASE_API_KEY!,
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.rows || [];
}

export interface EncounterListItem {
  composition_uid: string;
  composition_name: string;
  start_time: string;
}
