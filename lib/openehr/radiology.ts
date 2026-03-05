import axios from "axios";

const username = process.env.EHRBASE_USER?.trim() || "";
const password = process.env.EHRBASE_PASSWORD?.trim() || "";
const credentials = `${username}:${password}`;
const basicAuth = Buffer.from(credentials, "utf-8").toString("base64");

// Radiology Report Composition Type - STRICT FLAT FORMAT
export interface RadiologyReportComposition {
  // Category
  "template_radiology_report_v1/category|code"?: string;
  "template_radiology_report_v1/category|terminology"?: string;
  "template_radiology_report_v1/category|value"?: string;

  // Context
  "template_radiology_report_v1/context/report_id"?: string;
  "template_radiology_report_v1/context/status"?: string;
  "template_radiology_report_v1/context/start_time"?: string;
  "template_radiology_report_v1/context/setting|value"?: string;
  "template_radiology_report_v1/context/setting|code"?: string;
  "template_radiology_report_v1/context/setting|terminology"?: string;
  "template_radiology_report_v1/context/_end_time"?: string;
  "template_radiology_report_v1/context/_health_care_facility|name"?: string;

  // Imaging Examination Result - any_event:0
  "template_radiology_report_v1/imaging_examination_result/any_event:0/study_name"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/modality:0"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/target_body_site"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/study_date"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/overall_result_status:0|code"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/overall_result_status:0|value"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/overall_result_status:0|terminology"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/status_timestamp"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/clinical_indication"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/clinical_summary"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/imaging_findings"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/comparison_findings"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/imaging_quality"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/imaging_quality_description"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/overall_impression"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/imaging_differential_diagnosis:0"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/imaging_diagnosis:0"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/recommendation:0"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/comment:0"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/confounding_factors"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/position"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/time"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/width"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/math_function|value"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/math_function|code"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:0/math_function|terminology"?: string;

  // Imaging Examination Result - any_event:1
  "template_radiology_report_v1/imaging_examination_result/any_event:1/study_name"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/modality:0"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/target_body_site"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/study_date"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/overall_result_status:0|terminology"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/overall_result_status:0|value"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/overall_result_status:0|code"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/status_timestamp"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/clinical_indication"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/clinical_summary"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/imaging_findings"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/comparison_findings"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/imaging_quality"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/imaging_quality_description"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/overall_impression"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/imaging_differential_diagnosis:0"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/imaging_diagnosis:0"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/recommendation:0"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/comment:0"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/confounding_factors"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/position"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:1/time"?: string;

  // Imaging Examination Result - any_event:2
  "template_radiology_report_v1/imaging_examination_result/any_event:2/study_name"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/modality:0"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/target_body_site"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/study_date"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/overall_result_status:0|code"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/overall_result_status:0|value"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/overall_result_status:0|terminology"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/status_timestamp"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/clinical_indication"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/clinical_summary"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/imaging_findings"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/comparison_findings"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/imaging_quality"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/imaging_quality_description"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/overall_impression"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/imaging_differential_diagnosis:0"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/imaging_diagnosis:0"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/recommendation:0"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/comment:0"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/confounding_factors"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/position"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/time"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/width"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/math_function|value"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/math_function|code"?: string;
  "template_radiology_report_v1/imaging_examination_result/any_event:2/math_function|terminology"?: string;

  // Imaging Examination Result - Study identifiers and details
  "template_radiology_report_v1/imaging_examination_result/study_instance_identifier/identifier_value|id"?: string;
  "template_radiology_report_v1/imaging_examination_result/study_description"?: string;
  "template_radiology_report_v1/imaging_examination_result/report_identifier/identifier_value|id"?: string;
  "template_radiology_report_v1/imaging_examination_result/study_status|code"?: string;
  "template_radiology_report_v1/imaging_examination_result/study_status|terminology"?: string;
  "template_radiology_report_v1/imaging_examination_result/study_status|value"?: string;
  "template_radiology_report_v1/imaging_examination_result/study_end_point/text_value"?: string;
  "template_radiology_report_v1/imaging_examination_result/image_details:0"?: string;
  "template_radiology_report_v1/imaging_examination_result/technique:0"?: string;
  "template_radiology_report_v1/imaging_examination_result/technique_summary"?: string;
  "template_radiology_report_v1/imaging_examination_result/procedure:0"?: string;
  "template_radiology_report_v1/imaging_examination_result/procedure_summary"?: string;

  // Comparison Study Details
  "template_radiology_report_v1/imaging_examination_result/comparison_study_details:0/study_name"?: string;
  "template_radiology_report_v1/imaging_examination_result/comparison_study_details:0/study_identifier/identifier_value|id"?: string;
  "template_radiology_report_v1/imaging_examination_result/comparison_study_details:0/study_date"?: string;
  "template_radiology_report_v1/imaging_examination_result/comparison_study_details:0/study_end_point:0/text_value"?: string;

  // Examination Request Details
  "template_radiology_report_v1/imaging_examination_result/examination_request_details:0/receiver_order_identifier/identifier_value|id"?: string;
  "template_radiology_report_v1/imaging_examination_result/examination_request_details:0/requester_order_identifier/identifier_value|id"?: string;
  "template_radiology_report_v1/imaging_examination_result/examination_request_details:0/examination_requested_name:0"?: string;

  // Language and Encoding
  "template_radiology_report_v1/imaging_examination_result/language|terminology"?: string;
  "template_radiology_report_v1/imaging_examination_result/language|code"?: string;
  "template_radiology_report_v1/imaging_examination_result/encoding|code"?: string;
  "template_radiology_report_v1/imaging_examination_result/encoding|terminology"?: string;

  // Workflow and Guideline IDs
  "template_radiology_report_v1/imaging_examination_result/_work_flow_id|id"?: string;
  "template_radiology_report_v1/imaging_examination_result/_work_flow_id|id_scheme"?: string;
  "template_radiology_report_v1/imaging_examination_result/_work_flow_id|namespace"?: string;
  "template_radiology_report_v1/imaging_examination_result/_work_flow_id|type"?: string;
  "template_radiology_report_v1/imaging_examination_result/_guideline_id|id"?: string;
  "template_radiology_report_v1/imaging_examination_result/_guideline_id|id_scheme"?: string;
  "template_radiology_report_v1/imaging_examination_result/_guideline_id|namespace"?: string;
  "template_radiology_report_v1/imaging_examination_result/_guideline_id|type"?: string;

  // Top-level metadata
  "template_radiology_report_v1/language|code"?: string;
  "template_radiology_report_v1/language|terminology"?: string;
  "template_radiology_report_v1/territory|code"?: string;
  "template_radiology_report_v1/territory|terminology"?: string;
  "template_radiology_report_v1/composer|name"?: string;
}

/**
 * Create a radiology report composition in OpenEHR
 * @param ehrId - The EHR ID to create the composition for
 * @param composition - The composition data in FLAT format
 * @returns The composition UID
 */
export async function createRadiologyReport(
  ehrId: string,
  composition: RadiologyReportComposition
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
        templateId: "template_radiology_report_v1",
      },
    });
    return response.data.compositionUid || response.data.uid?.value;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("openEHR Radiology Report Creation Error:");
      console.error("Status:", error.response.status);
      console.error("Response Data:", JSON.stringify(error.response.data, null, 2));
      console.error("Sent Composition:", JSON.stringify(composition, null, 2));
    }
    throw error;
  }
}

/**
 * Get radiology reports list for a specific EHR
 * @param ehrId - The EHR ID to query
 * @returns Array of radiology report compositions with metadata
 */
export async function listRadiologyReports(
  ehrId: string
): Promise<RadiologyReportListItem[]> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/query/aql`;
  const query = `SELECT c/uid/value AS composition_uid, c/name/value AS composition_name, c/context/start_time/value AS start_time FROM EHR e CONTAINS COMPOSITION c WHERE e/ehr_id/value = '${ehrId}' AND c/archetype_details/template_id/value = 'template_radiology_report_v1' ORDER BY c/context/start_time/value DESC`;

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
 * Get a single radiology report composition
 * @param ehrId - The EHR ID
 * @param compositionId - The composition UID
 * @returns The composition data in FLAT format
 */
export async function getRadiologyReport(
  ehrId: string,
  compositionId: string
): Promise<RadiologyReportComposition> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/ehr/${ehrId}/composition/${compositionId}?format=FLAT`;
  const response = await axios.get(url, {
    headers: {
      "X-API-Key": process.env.EHRBASE_API_KEY!,
      Authorization: `Basic ${basicAuth}`,
      Accept: "application/json",
    },
  });
  return response.data as RadiologyReportComposition;
}

export interface RadiologyReportListItem {
  composition_uid: string;
  composition_name: string;
  start_time: string;
}
