import axios from "axios";

const username = process.env.EHRBASE_USER?.trim() || "";
const password = process.env.EHRBASE_PASSWORD?.trim() || "";
const credentials = `${username}:${password}`;
const basicAuth = Buffer.from(credentials, "utf-8").toString("base64");

// Care Plan Composition Type - STRICT FLAT FORMAT
export interface CarePlanComposition {
  // Category
  "template_care_plan_v1/category|code"?: string;
  "template_care_plan_v1/category|terminology"?: string;
  "template_care_plan_v1/category|value"?: string;

  // Context
  "template_care_plan_v1/context/start_time"?: string;
  "template_care_plan_v1/context/setting|code"?: string;
  "template_care_plan_v1/context/setting|value"?: string;
  "template_care_plan_v1/context/setting|terminology"?: string;
  "template_care_plan_v1/context/_end_time"?: string;
  "template_care_plan_v1/context/_health_care_facility|name"?: string;

  // Problem Diagnosis
  "template_care_plan_v1/problem_diagnosis/problem_diagnosis_name"?: string;
  "template_care_plan_v1/problem_diagnosis/variant:0"?: string;
  "template_care_plan_v1/problem_diagnosis/clinical_description"?: string;
  "template_care_plan_v1/problem_diagnosis/body_site:0"?: string;
  "template_care_plan_v1/problem_diagnosis/cause:0"?: string;
  "template_care_plan_v1/problem_diagnosis/date_time_of_onset"?: string;
  "template_care_plan_v1/problem_diagnosis/date_time_clinically_recognised"?: string;
  "template_care_plan_v1/problem_diagnosis/severity|terminology"?: string;
  "template_care_plan_v1/problem_diagnosis/severity|code"?: string;
  "template_care_plan_v1/problem_diagnosis/severity|value"?: string;
  "template_care_plan_v1/problem_diagnosis/course_description"?: string;
  "template_care_plan_v1/problem_diagnosis/date_time_of_resolution"?: string;
  "template_care_plan_v1/problem_diagnosis/diagnostic_certainty|code"?: string;
  "template_care_plan_v1/problem_diagnosis/diagnostic_certainty|value"?: string;
  "template_care_plan_v1/problem_diagnosis/diagnostic_certainty|terminology"?: string;
  "template_care_plan_v1/problem_diagnosis/comment"?: string;
  "template_care_plan_v1/problem_diagnosis/last_updated"?: string;
  "template_care_plan_v1/problem_diagnosis/language|terminology"?: string;
  "template_care_plan_v1/problem_diagnosis/language|code"?: string;
  "template_care_plan_v1/problem_diagnosis/encoding|terminology"?: string;
  "template_care_plan_v1/problem_diagnosis/encoding|code"?: string;
  "template_care_plan_v1/problem_diagnosis/_work_flow_id|id"?: string;
  "template_care_plan_v1/problem_diagnosis/_work_flow_id|id_scheme"?: string;
  "template_care_plan_v1/problem_diagnosis/_work_flow_id|namespace"?: string;
  "template_care_plan_v1/problem_diagnosis/_work_flow_id|type"?: string;
  "template_care_plan_v1/problem_diagnosis/_guideline_id|id"?: string;
  "template_care_plan_v1/problem_diagnosis/_guideline_id|id_scheme"?: string;
  "template_care_plan_v1/problem_diagnosis/_guideline_id|namespace"?: string;
  "template_care_plan_v1/problem_diagnosis/_guideline_id|type"?: string;

  // Goal
  "template_care_plan_v1/goal/goal_name"?: string;
  "template_care_plan_v1/goal/goal_description"?: string;
  "template_care_plan_v1/goal/clinical_indication:0"?: string;
  "template_care_plan_v1/goal/goal_start_date"?: string;
  "template_care_plan_v1/goal/goal_proposed_date"?: string;
  "template_care_plan_v1/goal/goal_end_date"?: string;
  "template_care_plan_v1/goal/goal_outcome|other"?: string;
  "template_care_plan_v1/goal/goal_comment"?: string;
  "template_care_plan_v1/goal/target:0/target_name"?: string;
  "template_care_plan_v1/goal/target:0/target/interval<dv_count>_value/upper"?: number;
  "template_care_plan_v1/goal/target:0/target/interval<dv_count>_value/lower"?: number;
  "template_care_plan_v1/goal/target:0/target/interval<dv_count>_value|lower_included"?: boolean;
  "template_care_plan_v1/goal/target:0/target/interval<dv_count>_value|upper_included"?: boolean;
  "template_care_plan_v1/goal/target:0/target/interval<dv_quantity>_value/upper"?: number;
  "template_care_plan_v1/goal/target:0/target/interval<dv_quantity>_value/lower"?: number;
  "template_care_plan_v1/goal/target:0/target/interval<dv_quantity>_value|lower_included"?: boolean;
  "template_care_plan_v1/goal/target:0/target/interval<dv_quantity>_value|upper_included"?: boolean;
  "template_care_plan_v1/goal/target:0/target_description"?: string;
  "template_care_plan_v1/goal/target:0/target_path"?: string;
  "template_care_plan_v1/goal/target:0/target_proposed_date"?: string;
  "template_care_plan_v1/goal/target:0/target_end_date"?: string;
  "template_care_plan_v1/goal/target:0/target_outcome|other"?: string;
  "template_care_plan_v1/goal/target:0/target_comment"?: string;
  "template_care_plan_v1/goal/last_updated"?: string;
  "template_care_plan_v1/goal/language|terminology"?: string;
  "template_care_plan_v1/goal/language|code"?: string;
  "template_care_plan_v1/goal/encoding|code"?: string;
  "template_care_plan_v1/goal/encoding|terminology"?: string;
  "template_care_plan_v1/goal/_work_flow_id|id"?: string;
  "template_care_plan_v1/goal/_work_flow_id|id_scheme"?: string;
  "template_care_plan_v1/goal/_work_flow_id|namespace"?: string;
  "template_care_plan_v1/goal/_work_flow_id|type"?: string;
  "template_care_plan_v1/goal/_guideline_id|id"?: string;
  "template_care_plan_v1/goal/_guideline_id|id_scheme"?: string;
  "template_care_plan_v1/goal/_guideline_id|namespace"?: string;
  "template_care_plan_v1/goal/_guideline_id|type"?: string;

  // Service Request
  "template_care_plan_v1/service_request/request/service_name|other"?: string;
  "template_care_plan_v1/service_request/request/service_type|code"?: string;
  "template_care_plan_v1/service_request/request/service_type|value"?: string;
  "template_care_plan_v1/service_request/request/service_type|terminology"?: string;
  "template_care_plan_v1/service_request/request/description"?: string;
  "template_care_plan_v1/service_request/request/clinical_indication"?: string;
  "template_care_plan_v1/service_request/request/urgency|terminology"?: string;
  "template_care_plan_v1/service_request/request/urgency|code"?: string;
  "template_care_plan_v1/service_request/request/urgency|value"?: string;
  "template_care_plan_v1/service_request/request/requested_date"?: string;
  "template_care_plan_v1/service_request/request/requesting_provider"?: string;
  "template_care_plan_v1/service_request/request/receiving_provider"?: string;
  "template_care_plan_v1/service_request/request/request_status|code"?: string;
  "template_care_plan_v1/service_request/request/request_status|terminology"?: string;
  "template_care_plan_v1/service_request/request/request_status|value"?: string;
  "template_care_plan_v1/service_request/request/special_requirements"?: string;
  "template_care_plan_v1/service_request/request/timing"?: string;
  "template_care_plan_v1/service_request/request/timing|formalism"?: string;
  "template_care_plan_v1/service_request/request/action_archetype_id"?: string;
  "template_care_plan_v1/service_request/request_id"?: string;
  "template_care_plan_v1/service_request/narrative"?: string;
  "template_care_plan_v1/service_request/language|code"?: string;
  "template_care_plan_v1/service_request/language|terminology"?: string;
  "template_care_plan_v1/service_request/encoding|code"?: string;
  "template_care_plan_v1/service_request/encoding|terminology"?: string;
  "template_care_plan_v1/service_request/_work_flow_id|id"?: string;
  "template_care_plan_v1/service_request/_work_flow_id|id_scheme"?: string;
  "template_care_plan_v1/service_request/_work_flow_id|namespace"?: string;
  "template_care_plan_v1/service_request/_work_flow_id|type"?: string;
  "template_care_plan_v1/service_request/_guideline_id|id"?: string;
  "template_care_plan_v1/service_request/_guideline_id|id_scheme"?: string;
  "template_care_plan_v1/service_request/_guideline_id|namespace"?: string;
  "template_care_plan_v1/service_request/_guideline_id|type"?: string;
  "template_care_plan_v1/service_request/_wf_definition|value"?: string;
  "template_care_plan_v1/service_request/_wf_definition|formalism"?: string;

  // Medication Order
  "template_care_plan_v1/medication_order/order:0/medication_item"?: string;
  "template_care_plan_v1/medication_order/order:0/route:0"?: string;
  "template_care_plan_v1/medication_order/order:0/body_site"?: string;
  "template_care_plan_v1/medication_order/order:0/administration_method:0"?: string;
  "template_care_plan_v1/medication_order/order:0/overall_directions_description"?: string;
  "template_care_plan_v1/medication_order/order:0/parsable_directions"?: string;
  "template_care_plan_v1/medication_order/order:0/parsable_directions|formalism"?: string;
  "template_care_plan_v1/medication_order/order:0/specific_directions_description:0"?: string;
  "template_care_plan_v1/medication_order/order:0/dosage_justification:0"?: string;
  "template_care_plan_v1/medication_order/order:0/medication_safety/exceptional_safety_override"?: boolean;
  "template_care_plan_v1/medication_order/order:0/medication_safety/safety_override:0/overriden_safety_advice"?: string;
  "template_care_plan_v1/medication_order/order:0/medication_safety/safety_override:0/override_reason:0"?: string;
  "template_care_plan_v1/medication_order/order:0/medication_safety/maximum_dose:0/maximum_amount|magnitude"?: number;
  "template_care_plan_v1/medication_order/order:0/medication_safety/maximum_dose:0/maximum_amount|unit"?: string;
  "template_care_plan_v1/medication_order/order:0/medication_safety/maximum_dose:0/allowed_period"?: string;
  "template_care_plan_v1/medication_order/order:0/medication_safety/total_daily_effective_dose/purpose"?: string;
  "template_care_plan_v1/medication_order/order:0/medication_safety/total_daily_effective_dose/total_daily_amount|magnitude"?: number;
  "template_care_plan_v1/medication_order/order:0/medication_safety/total_daily_effective_dose/total_daily_amount|unit"?: string;
  "template_care_plan_v1/medication_order/order:0/additional_instruction:0"?: string;
  "template_care_plan_v1/medication_order/order:0/patient_information:0"?: string;
  "template_care_plan_v1/medication_order/order:0/monitoring_instruction:0"?: string;
  "template_care_plan_v1/medication_order/order:0/clinical_indication:0"?: string;
  "template_care_plan_v1/medication_order/order:0/therapeutic_intent:0"?: string;
  "template_care_plan_v1/medication_order/order:0/clinician_guidance"?: string;
  "template_care_plan_v1/medication_order/order:0/order_details/order_start_date_time"?: string;
  "template_care_plan_v1/medication_order/order:0/order_details/order_stop_date_time"?: string;
  "template_care_plan_v1/medication_order/order:0/order_details/order_start_criterion:0"?: string;
  "template_care_plan_v1/medication_order/order:0/order_details/order_stop_criterion:0"?: string;
  "template_care_plan_v1/medication_order/order:0/order_details/administrations_completed"?: number;
  "template_care_plan_v1/medication_order/order:0/order_details/duration_of_order_completed"?: string;
  "template_care_plan_v1/medication_order/order:0/dispense_directions/dispense_instruction:0"?: string;
  "template_care_plan_v1/medication_order/order:0/dispense_directions/substitution_direction|code"?: string;
  "template_care_plan_v1/medication_order/order:0/dispense_directions/substitution_direction|terminology"?: string;
  "template_care_plan_v1/medication_order/order:0/dispense_directions/substitution_direction|value"?: string;
  "template_care_plan_v1/medication_order/order:0/dispense_directions/non-substitution_reason"?: string;
  "template_care_plan_v1/medication_order/order:0/dispense_directions/priority"?: string;
  "template_care_plan_v1/medication_order/order:0/dispense_directions/dispensing_start_date"?: string;
  "template_care_plan_v1/medication_order/order:0/dispense_directions/dispensing_expiry_date"?: string;
  "template_care_plan_v1/medication_order/order:0/comment"?: string;
  "template_care_plan_v1/medication_order/order:0/timing|formalism"?: string;
  "template_care_plan_v1/medication_order/order:0/timing"?: string;
  "template_care_plan_v1/medication_order/order:0/action_archetype_id"?: string;
  "template_care_plan_v1/medication_order/order_identifier:0|id"?: string;
  "template_care_plan_v1/medication_order/narrative"?: string;
  "template_care_plan_v1/medication_order/language|code"?: string;
  "template_care_plan_v1/medication_order/language|terminology"?: string;
  "template_care_plan_v1/medication_order/encoding|terminology"?: string;
  "template_care_plan_v1/medication_order/encoding|code"?: string;
  "template_care_plan_v1/medication_order/_work_flow_id|id"?: string;
  "template_care_plan_v1/medication_order/_work_flow_id|id_scheme"?: string;
  "template_care_plan_v1/medication_order/_work_flow_id|namespace"?: string;
  "template_care_plan_v1/medication_order/_work_flow_id|type"?: string;
  "template_care_plan_v1/medication_order/_guideline_id|id"?: string;
  "template_care_plan_v1/medication_order/_guideline_id|id_scheme"?: string;
  "template_care_plan_v1/medication_order/_guideline_id|namespace"?: string;
  "template_care_plan_v1/medication_order/_guideline_id|type"?: string;
  "template_care_plan_v1/medication_order/_wf_definition|value"?: string;
  "template_care_plan_v1/medication_order/_wf_definition|formalism"?: string;

  // Top-level metadata
  "template_care_plan_v1/language|code"?: string;
  "template_care_plan_v1/language|terminology"?: string;
  "template_care_plan_v1/territory|code"?: string;
  "template_care_plan_v1/territory|terminology"?: string;
  "template_care_plan_v1/composer|name"?: string;
}

/**
 * Create a care plan composition in OpenEHR
 * @param ehrId - The EHR ID to create the composition for
 * @param composition - The composition data in FLAT format
 * @returns The composition UID
 */
export async function createCarePlan(
  ehrId: string,
  composition: CarePlanComposition
): Promise<string> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/ehr/${ehrId}/composition`;
  
  try {
    const response = await axios.post(url, composition, {
      headers: {
        "X-API-Key": process.env.EHRBASE_API_KEY!,
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      params: {
        format: "FLAT",
        templateId: "template_care_plan_v1",
      },
    });
    return response.data.compositionUid || response.data.uid?.value;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("openEHR Care Plan Creation Error:");
      console.error("Status:", error.response.status);
      console.error("Response Data:", JSON.stringify(error.response.data, null, 2));
      console.error("Sent Composition:", JSON.stringify(composition, null, 2));
    }
    throw error;
  }
}

/**
 * Get care plans list for a specific EHR
 * @param ehrId - The EHR ID to query
 * @returns Array of care plan compositions with metadata
 */
export async function listCarePlans(
  ehrId: string
): Promise<CarePlanListItem[]> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/query/aql`;
  const query = `SELECT c/uid/value AS composition_uid, c/name/value AS composition_name, c/context/start_time/value AS start_time FROM EHR e CONTAINS COMPOSITION c WHERE e/ehr_id/value = '${ehrId}' AND c/archetype_details/template_id/value = 'template_care_plan_v1' ORDER BY c/context/start_time/value DESC`;

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
 * Get a single care plan composition
 * @param ehrId - The EHR ID
 * @param compositionId - The composition UID
 * @returns The composition data in FLAT format
 */
export async function getCarePlan(
  ehrId: string,
  compositionId: string
): Promise<CarePlanComposition> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/ehr/${ehrId}/composition/${compositionId}?format=FLAT`;
  const response = await axios.get(url, {
    headers: {
      "X-API-Key": process.env.EHRBASE_API_KEY!,
      Authorization: `Basic ${basicAuth}`,
      Accept: "application/json",
    },
  });
  return response.data as CarePlanComposition;
}

export interface CarePlanListItem {
  composition_uid: string;
  composition_name: string;
  start_time: string;
}
