import axios from "axios";

const username = process.env.EHRBASE_USER?.trim() || "";
const password = process.env.EHRBASE_PASSWORD?.trim() || "";
const credentials = `${username}:${password}`;
const basicAuth = Buffer.from(credentials, "utf-8").toString("base64");

// ============================================================================
// Coded Value Types
// ============================================================================

export const TestStatusCodes = {
  Registered: { code: "at0006", value: "Registered", terminology: "local" },
  Partial: { code: "at0007", value: "Partial", terminology: "local" },
  Preliminary: { code: "at0008", value: "Preliminary", terminology: "local" },
  Final: { code: "at0009", value: "Final", terminology: "local" },
  Amended: { code: "at0010", value: "Amended", terminology: "local" },
  Cancelled: { code: "at0011", value: "Cancelled", terminology: "local" },
} as const;

export type TestStatusKey = keyof typeof TestStatusCodes;

export const InterpretationCodes = {
  Normal: { code: "at0017", value: "Normal", terminology: "local" },
  High: { code: "at0018", value: "High", terminology: "local" },
  Low: { code: "at0019", value: "Low", terminology: "local" },
  Abnormal: { code: "at0020", value: "Abnormal", terminology: "local" },
} as const;

export type InterpretationKey = keyof typeof InterpretationCodes;

export const SpecimenQualityIssueCodes = {
  Haemolysed: { code: "at0052", value: "Haemolysed", terminology: "local" },
  Lipaemic: { code: "at0053", value: "Lipaemic", terminology: "local" },
  Icteric: { code: "at0089", value: "Icteric", terminology: "local" },
  Clotted: { code: "at0094", value: "Clotted", terminology: "local" },
  IncorrectAdditive: { code: "at0054", value: "Incorrect additive", terminology: "local" },
  InsufficientAmount: { code: "at0055", value: "Insufficient amount", terminology: "local" },
  HandlingError: { code: "at0090", value: "Handling error", terminology: "local" },
  IncorrectlyLabelled: { code: "at0095", value: "Incorrectly labelled", terminology: "local" },
  Age: { code: "at0091", value: "Age", terminology: "local" },
  TechnicalFailure: { code: "at0092", value: "Technical failure", terminology: "local" },
} as const;

export type SpecimenQualityIssueKey = keyof typeof SpecimenQualityIssueCodes;

export const AdequacyForTestingCodes = {
  Satisfactory: { code: "at0062", value: "Satisfactory", terminology: "local" },
  UnsatisfactoryAnalysed: { code: "at0063", value: "Unsatisfactory - analysed", terminology: "local" },
  UnsatisfactoryNotAnalysed: { code: "at0064", value: "Unsatisfactory - not analysed", terminology: "local" },
} as const;

export type AdequacyForTestingKey = keyof typeof AdequacyForTestingCodes;

export const AnalyteResultStatusCodes = {
  Registered: { code: "at0015", value: "Registered", terminology: "local" },
  Partial: { code: "at0016", value: "Partial", terminology: "local" },
  Preliminary: { code: "at0017", value: "Preliminary", terminology: "local" },
  Final: { code: "at0018", value: "Final", terminology: "local" },
  Amended: { code: "at0020", value: "Amended", terminology: "local" },
  Corrected: { code: "at0019", value: "Corrected", terminology: "local" },
  Appended: { code: "at0021", value: "Appended", terminology: "local" },
  Cancelled: { code: "at0023", value: "Cancelled", terminology: "local" },
  EnteredInError: { code: "at0022", value: "Entered in error", terminology: "local" },
} as const;

export type AnalyteResultStatusKey = keyof typeof AnalyteResultStatusCodes;

// ============================================================================
// Structured Interfaces (for building compositions)
// ============================================================================

export interface CodedValue {
  code: string;
  value: string;
  terminology: string;
}

export interface LabTestResult {
  resultName: string;
  resultValue?: {
    magnitude: number;
    unit: string;
  };
  referenceRange?: string;
  interpretation?: CodedValue;
  comment?: string;
}

export interface LabTestEvent {
  testName: string;
  testStatus?: CodedValue;
  testResults?: LabTestResult[];
  overallInterpretation?: string;
  clinicalInformation?: string;
  time: string;
  width?: string;
  mathFunction?: CodedValue;
}

export interface LabSpecimen {
  specimenType?: string;
  specimenLabel?: string;
  specimenDescription?: string;
  numberOfFragments?: number;
  laboratorySpecimenIdentifier?: string;
  externalIdentifiers?: string[];
  dateTimeReceived?: string;
  samplingContexts?: string[];
  collectionMethod?: string;
  collectionDescription?: string;
  sourceSite?: string;
  collectionDateTime?: string;
  hazardWarnings?: string[];
  collectionSetting?: string;
  specimenCollectorIdentifier?: string;
  numberOfContainers?: number;
  parentSpecimenIdentifiers?: string[];
  specimenQualityIssues?: CodedValue[];
  adequacyForTesting?: CodedValue;
  comment?: string;
}

export interface LabAnalyteResult {
  analyteResultSequence?: number;
  analyteName?: string;
  analyteResultText?: string;
  referenceRangeGuidance?: string;
  validationTime?: string;
  resultStatus?: CodedValue;
  resultStatusTime?: string;
  specimenIdentifier?: string;
  comments?: string[];
}

export interface LaboratoryReportData {
  // Context
  reportId?: string;
  status?: string;
  startTime: string;
  endTime?: string;
  healthCareFacility?: string;
  setting?: CodedValue;

  // Test events (array)
  testEvents: LabTestEvent[];

  // Test details
  testMethod?: string;
  laboratory?: string;
  specimenType?: string;

  // Specimen
  specimen?: LabSpecimen;

  // Analyte results
  analyteResult?: LabAnalyteResult;

  // Metadata
  composerName: string;
  language?: { code: string; terminology: string };
  territory?: { code: string; terminology: string };
}

// ============================================================================
// Helper Functions
// ============================================================================

const PREFIX = "template_laboratory_report_v2";

/**
 * Build a flat format laboratory report from structured data
 */
export function buildLaboratoryReport(data: LaboratoryReportData): LaboratoryReportComposition {
  const flat: Record<string, unknown> = {};

  // Category (always event for lab reports)
  flat[`${PREFIX}/category|code`] = "433";
  flat[`${PREFIX}/category|terminology`] = "openehr";
  flat[`${PREFIX}/category|value`] = "event";

  // Context
  flat[`${PREFIX}/context/start_time`] = data.startTime;
  if (data.reportId) flat[`${PREFIX}/context/report_id`] = data.reportId;
  if (data.status) flat[`${PREFIX}/context/status`] = data.status;
  if (data.endTime) flat[`${PREFIX}/context/_end_time`] = data.endTime;
  if (data.healthCareFacility) flat[`${PREFIX}/context/_health_care_facility|name`] = data.healthCareFacility;
  if (data.setting) {
    flat[`${PREFIX}/context/setting|code`] = data.setting.code;
    flat[`${PREFIX}/context/setting|value`] = data.setting.value;
    flat[`${PREFIX}/context/setting|terminology`] = data.setting.terminology;
  }

  // Test events (array)
  data.testEvents.forEach((event, eventIdx) => {
    const eventPrefix = `${PREFIX}/laboratory_test_result/any_event:${eventIdx}`;

    flat[`${eventPrefix}/test_name`] = event.testName;
    flat[`${eventPrefix}/time`] = event.time;

    if (event.testStatus) {
      flat[`${eventPrefix}/test_status|code`] = event.testStatus.code;
      flat[`${eventPrefix}/test_status|value`] = event.testStatus.value;
      flat[`${eventPrefix}/test_status|terminology`] = event.testStatus.terminology;
    }

    if (event.overallInterpretation) flat[`${eventPrefix}/overall_interpretation`] = event.overallInterpretation;
    if (event.clinicalInformation) flat[`${eventPrefix}/clinical_information`] = event.clinicalInformation;
    if (event.width) flat[`${eventPrefix}/width`] = event.width;

    if (event.mathFunction) {
      flat[`${eventPrefix}/math_function|code`] = event.mathFunction.code;
      flat[`${eventPrefix}/math_function|value`] = event.mathFunction.value;
      flat[`${eventPrefix}/math_function|terminology`] = event.mathFunction.terminology;
    }

    // Test results within event (array)
    event.testResults?.forEach((result, resultIdx) => {
      const resultPrefix = `${eventPrefix}/test_result:${resultIdx}`;

      flat[`${resultPrefix}/result_name`] = result.resultName;

      if (result.resultValue) {
        flat[`${resultPrefix}/result_value/quantity_value|magnitude`] = result.resultValue.magnitude;
        flat[`${resultPrefix}/result_value/quantity_value|unit`] = result.resultValue.unit;
      }

      if (result.referenceRange) flat[`${resultPrefix}/reference_range`] = result.referenceRange;
      if (result.comment) flat[`${resultPrefix}/comment`] = result.comment;

      if (result.interpretation) {
        flat[`${resultPrefix}/interpretation|code`] = result.interpretation.code;
        flat[`${resultPrefix}/interpretation|value`] = result.interpretation.value;
        flat[`${resultPrefix}/interpretation|terminology`] = result.interpretation.terminology;
      }
    });
  });

  // Test details
  if (data.testMethod) flat[`${PREFIX}/laboratory_test_result/test_method`] = data.testMethod;
  if (data.laboratory) flat[`${PREFIX}/laboratory_test_result/laboratory`] = data.laboratory;
  if (data.specimenType) flat[`${PREFIX}/laboratory_test_result/specimen_type`] = data.specimenType;

  // Specimen
  if (data.specimen) {
    const spec = data.specimen;
    const specPrefix = `${PREFIX}/laboratory_test_result/specimen`;

    if (spec.specimenType) flat[`${specPrefix}/specimen_type`] = spec.specimenType;
    if (spec.specimenLabel) flat[`${specPrefix}/specimen_label`] = spec.specimenLabel;
    if (spec.specimenDescription) flat[`${specPrefix}/specimen_description`] = spec.specimenDescription;
    if (spec.numberOfFragments) flat[`${specPrefix}/number_of_fragments`] = spec.numberOfFragments;
    if (spec.laboratorySpecimenIdentifier) flat[`${specPrefix}/laboratory_specimen_identifier/identifier_value|id`] = spec.laboratorySpecimenIdentifier;
    if (spec.dateTimeReceived) flat[`${specPrefix}/date_time_received`] = spec.dateTimeReceived;
    if (spec.collectionMethod) flat[`${specPrefix}/collection_method`] = spec.collectionMethod;
    if (spec.collectionDescription) flat[`${specPrefix}/collection_description`] = spec.collectionDescription;
    if (spec.sourceSite) flat[`${specPrefix}/source_site`] = spec.sourceSite;
    if (spec.collectionDateTime) flat[`${specPrefix}/collection_date_time/date_time_value`] = spec.collectionDateTime;
    if (spec.collectionSetting) flat[`${specPrefix}/collection_setting`] = spec.collectionSetting;
    if (spec.specimenCollectorIdentifier) flat[`${specPrefix}/specimen_collector_identifier/identifier_value|id`] = spec.specimenCollectorIdentifier;
    if (spec.numberOfContainers) flat[`${specPrefix}/number_of_containers`] = spec.numberOfContainers;
    if (spec.comment) flat[`${specPrefix}/comment`] = spec.comment;

    // Arrays in specimen
    spec.externalIdentifiers?.forEach((id, idx) => {
      flat[`${specPrefix}/external_identifier:${idx}/identifier_value|id`] = id;
    });
    spec.samplingContexts?.forEach((ctx, idx) => {
      flat[`${specPrefix}/sampling_context:${idx}`] = ctx;
    });
    spec.hazardWarnings?.forEach((hw, idx) => {
      flat[`${specPrefix}/hazard_warning:${idx}`] = hw;
    });
    spec.parentSpecimenIdentifiers?.forEach((id, idx) => {
      flat[`${specPrefix}/parent_specimen_identifier:${idx}/identifier_value|id`] = id;
    });
    spec.specimenQualityIssues?.forEach((issue, idx) => {
      flat[`${specPrefix}/specimen_quality_issue:${idx}|code`] = issue.code;
      flat[`${specPrefix}/specimen_quality_issue:${idx}|value`] = issue.value;
      flat[`${specPrefix}/specimen_quality_issue:${idx}|terminology`] = issue.terminology;
    });

    if (spec.adequacyForTesting) {
      flat[`${specPrefix}/adequacy_for_testing|code`] = spec.adequacyForTesting.code;
      flat[`${specPrefix}/adequacy_for_testing|value`] = spec.adequacyForTesting.value;
      flat[`${specPrefix}/adequacy_for_testing|terminology`] = spec.adequacyForTesting.terminology;
    }
  }

  // Analyte result
  if (data.analyteResult) {
    const ar = data.analyteResult;
    const arPrefix = `${PREFIX}/laboratory_test_result/laboratory_analyte_result`;

    if (ar.analyteResultSequence) flat[`${arPrefix}/analyte_result_sequence`] = ar.analyteResultSequence;
    if (ar.analyteName) flat[`${arPrefix}/analyte_name`] = ar.analyteName;
    if (ar.analyteResultText) flat[`${arPrefix}/analyte_result:0/text_value`] = ar.analyteResultText;
    if (ar.referenceRangeGuidance) flat[`${arPrefix}/reference_range_guidance`] = ar.referenceRangeGuidance;
    if (ar.validationTime) flat[`${arPrefix}/validation_time`] = ar.validationTime;
    if (ar.resultStatusTime) flat[`${arPrefix}/result_status_time`] = ar.resultStatusTime;
    if (ar.specimenIdentifier) flat[`${arPrefix}/specimen/identifier_value|id`] = ar.specimenIdentifier;

    if (ar.resultStatus) {
      flat[`${arPrefix}/result_status|code`] = ar.resultStatus.code;
      flat[`${arPrefix}/result_status|value`] = ar.resultStatus.value;
      flat[`${arPrefix}/result_status|terminology`] = ar.resultStatus.terminology;
    }

    ar.comments?.forEach((comment, idx) => {
      flat[`${arPrefix}/comment:${idx}`] = comment;
    });
  }

  // Language and encoding for test result
  const lang = data.language || { code: "en", terminology: "ISO_639-1" };
  flat[`${PREFIX}/laboratory_test_result/language|code`] = lang.code;
  flat[`${PREFIX}/laboratory_test_result/language|terminology`] = lang.terminology;
  flat[`${PREFIX}/laboratory_test_result/encoding|code`] = "UTF-8";
  flat[`${PREFIX}/laboratory_test_result/encoding|terminology`] = "IANA_character-sets";

  // Top-level metadata
  flat[`${PREFIX}/language|code`] = lang.code;
  flat[`${PREFIX}/language|terminology`] = lang.terminology;

  const territory = data.territory || { code: "SE", terminology: "ISO_3166-1" };
  flat[`${PREFIX}/territory|code`] = territory.code;
  flat[`${PREFIX}/territory|terminology`] = territory.terminology;

  flat[`${PREFIX}/composer|name`] = data.composerName;

  return flat as LaboratoryReportComposition;
}

// ============================================================================
// Raw Flat Format Type (for direct API usage)
// ============================================================================

export type LaboratoryReportComposition = Record<string, unknown>;

// ============================================================================
// API Functions
// ============================================================================

/**
 * Create a laboratory report composition in OpenEHR
 * @param ehrId - The EHR ID to create the composition for
 * @param data - The structured laboratory report data
 * @returns The composition UID
 */
export async function createLaboratoryReport(
  ehrId: string,
  data: LaboratoryReportData | LaboratoryReportComposition
): Promise<string> {
  // Check if it's structured data or already flat
  const composition = "testEvents" in data ? buildLaboratoryReport(data as LaboratoryReportData) : data;

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
      templateId: "template_laboratory_report_v2",
    },
  });
  return response.data.compositionUid || response.data.uid?.value;
}

/**
 * Get laboratory reports list for a specific EHR
 * @param ehrId - The EHR ID to query
 * @returns Array of laboratory report compositions with metadata
 */
export async function listLaboratoryReports(
  ehrId: string
): Promise<LaboratoryReportListItem[]> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/query/aql`;
  const query = `SELECT c/uid/value AS composition_uid, c/name/value AS composition_name, c/context/start_time/value AS start_time FROM EHR e CONTAINS COMPOSITION c WHERE e/ehr_id/value = '${ehrId}' AND c/archetype_details/template_id/value = 'template_laboratory_report_v2' ORDER BY c/context/start_time/value DESC`;

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
  return rows.map((row: unknown[]) => ({
    composition_uid: row[0] as string,
    composition_name: row[1] as string,
    start_time: row[2] as string,
  }));
}

/**
 * Get a single laboratory report composition
 * @param ehrId - The EHR ID
 * @param compositionId - The composition UID
 * @returns The composition data in FLAT format
 */
export async function getLaboratoryReport(
  ehrId: string,
  compositionId: string
): Promise<LaboratoryReportComposition> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/ehr/${ehrId}/composition/${compositionId}?format=FLAT`;
  const response = await axios.get(url, {
    headers: {
      "X-API-Key": process.env.EHRBASE_API_KEY!,
      Authorization: `Basic ${basicAuth}`,
      Accept: "application/json",
    },
  });
  return response.data as LaboratoryReportComposition;
}

export interface LaboratoryReportListItem {
  composition_uid: string;
  composition_name: string;
  start_time: string;
}
