/**
 * OpenEHR Laboratory Report V1 Template Integration
 * 
 * Provides functions to create laboratory reports using the laboratory_report_v1 template
 * This is the comprehensive template with full specimen tracking and protocol support
 */

import axios from "axios";

const username = process.env.EHRBASE_USER?.trim() || "";
const password = process.env.EHRBASE_PASSWORD?.trim() || "";
const credentials = `${username}:${password}`;
const basicAuth = Buffer.from(credentials, "utf-8").toString("base64");

// Template prefix for V1
const PREFIX = "laboratory_report_v1";

// ============================================================================
// Interfaces for V1 Template
// ============================================================================

export interface LabReportV1TestResult {
  testName: string;
  testCode?: string;
  resultValue: string | number;
  resultUnit?: string;
  referenceRange?: string;
  referenceMin?: number;
  referenceMax?: number;
  interpretation?: "normal" | "high" | "low" | "critical" | "abnormal";
  comment?: string;
  status?: "preliminary" | "final" | "amended" | "corrected";
}

export interface LabReportV1Specimen {
  specimenType: string;
  specimenId?: string;
  collectionDateTime?: string;
  collectionMethod?: string;
  containerType?: string;
  volume?: number;
  volumeUnit?: string;
  specimenQuality?: string;
  receivedDateTime?: string;
}

export interface LabReportV1Data {
  // Patient and Order Context
  ehrId: string;
  patientId: string;
  orderId?: string;
  
  // Report Metadata
  reportId?: string;
  reportDate: string;
  laboratory: string;
  composerName: string;
  
  // Clinical Context
  clinicalIndication?: string;
  orderingProvider?: string;
  
  // Test Information
  testName: string;
  testCategory?: string;
  testMethod?: string;
  
  // Specimen Information
  specimen: LabReportV1Specimen;
  
  // Test Results
  results: LabReportV1TestResult[];
  
  // Overall Interpretation
  overallStatus: "registered" | "partial" | "preliminary" | "final" | "amended" | "cancelled";
  conclusion?: string;
  
  // Protocol Information
  protocol?: string;
  requestDetails?: string;
}

// ============================================================================
// Build V1 Composition
// ============================================================================

export function buildLaboratoryReportV1(data: LabReportV1Data): Record<string, unknown> {
  const flat: Record<string, unknown> = {};

  // Category (always event for lab reports)
  flat[`${PREFIX}/category|code`] = "433";
  flat[`${PREFIX}/category|terminology`] = "openehr";
  flat[`${PREFIX}/category|value`] = "event";

  // Context
  flat[`${PREFIX}/context/start_time`] = data.reportDate;
  if (data.reportId) {
    flat[`${PREFIX}/context/report_id`] = data.reportId;
  }

  // Content - Laboratory Test Result Observation with archetype ID
  const obsPrefix = `${PREFIX}/content[openEHR-EHR-OBSERVATION.laboratory_test_result.v1]`;
  
  // Test name at observation level
  flat[`${obsPrefix}/data[at0001]/events[at0002]/data[at0003]/items[at0005]`] = data.testName;

  // Overall test status
  flat[`${obsPrefix}/data[at0001]/events[at0002]/data[at0003]/items[at0073]|code`] = getStatusCode(data.overallStatus);
  flat[`${obsPrefix}/data[at0001]/events[at0002]/data[at0003]/items[at0073]|value`] = data.overallStatus;
  flat[`${obsPrefix}/data[at0001]/events[at0002]/data[at0003]/items[at0073]|terminology`] = "local";

  // Event time
  flat[`${obsPrefix}/data[at0001]/events[at0002]/time`] = data.reportDate;

  // Clinical information
  if (data.clinicalIndication) {
    flat[`${obsPrefix}/data[at0001]/events[at0002]/data[at0003]/items[at0065]`] = data.clinicalIndication;
  }

  // Overall interpretation/conclusion
  if (data.conclusion) {
    flat[`${obsPrefix}/data[at0001]/events[at0002]/data[at0003]/items[at0057]`] = data.conclusion;
  }

  // Test Results (Analytes) - using CLUSTER.laboratory_test_analyte.v1
  data.results.forEach((result, idx) => {
    const analytePrefix = `${obsPrefix}/data[at0001]/events[at0002]/data[at0003]/items[openEHR-EHR-CLUSTER.laboratory_test_analyte.v1]:${idx}`;
    
    // Analyte name
    flat[`${analytePrefix}/items[at0024]`] = result.testName;
    
    // Result value
    if (typeof result.resultValue === 'number') {
      flat[`${analytePrefix}/items[at0001]|magnitude`] = result.resultValue;
      if (result.resultUnit) {
        flat[`${analytePrefix}/items[at0001]|unit`] = result.resultUnit;
      }
    } else {
      flat[`${analytePrefix}/items[at0001]`] = result.resultValue;
    }

    // Reference range
    if (result.referenceRange) {
      flat[`${analytePrefix}/items[at0004]`] = result.referenceRange;
    } else if (result.referenceMin !== undefined && result.referenceMax !== undefined) {
      flat[`${analytePrefix}/items[at0004]`] = `${result.referenceMin}-${result.referenceMax}${result.resultUnit ? ' ' + result.resultUnit : ''}`;
    }

    // Comment
    if (result.comment) {
      flat[`${analytePrefix}/items[at0003]`] = result.comment;
    }

    // Result status
    if (result.status) {
      const statusCode = getAnalyteStatusCode(result.status);
      flat[`${analytePrefix}/items[at0005]|code`] = statusCode.code;
      flat[`${analytePrefix}/items[at0005]|value`] = statusCode.value;
      flat[`${analytePrefix}/items[at0005]|terminology`] = "local";
    }
  });

  // Protocol Section with Specimen - using CLUSTER.specimen.v1
  const specimenPrefix = `${obsPrefix}/protocol[at0024]/items[openEHR-EHR-CLUSTER.specimen.v1]`;
  
  // Specimen type
  flat[`${specimenPrefix}/items[at0029]`] = data.specimen.specimenType;
  
  // Laboratory specimen identifier
  if (data.specimen.specimenId) {
    flat[`${specimenPrefix}/items[at0088]`] = data.specimen.specimenId;
  }

  // Collection date/time
  if (data.specimen.collectionDateTime) {
    flat[`${specimenPrefix}/items[at0015]`] = data.specimen.collectionDateTime;
  }

  // Collection method
  if (data.specimen.collectionMethod) {
    flat[`${specimenPrefix}/items[at0007]`] = data.specimen.collectionMethod;
  }

  // Received date/time
  if (data.specimen.receivedDateTime) {
    flat[`${specimenPrefix}/items[at0034]`] = data.specimen.receivedDateTime;
  }

  // Test method in protocol
  if (data.testMethod) {
    flat[`${obsPrefix}/protocol[at0024]/items[at0062]`] = data.testMethod;
  }

  // Language and encoding for observation
  flat[`${obsPrefix}/language|code`] = "en";
  flat[`${obsPrefix}/language|terminology`] = "ISO_639-1";
  flat[`${obsPrefix}/encoding|code`] = "UTF-8";
  flat[`${obsPrefix}/encoding|terminology`] = "IANA_character-sets";

  // Top-level metadata
  flat[`${PREFIX}/language|code`] = "en";
  flat[`${PREFIX}/language|terminology`] = "ISO_639-1";
  flat[`${PREFIX}/territory|code`] = "SE";
  flat[`${PREFIX}/territory|terminology`] = "ISO_3166-1";
  flat[`${PREFIX}/composer|name`] = data.composerName;

  return flat;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getStatusCode(status: string): string {
  const statusMap: Record<string, string> = {
    registered: "at0006",
    partial: "at0007",
    preliminary: "at0008",
    final: "at0009",
    amended: "at0010",
    cancelled: "at0011",
  };
  return statusMap[status] || "at0009";
}

function getAnalyteStatusCode(status: string): { code: string; value: string } {
  const statusMap: Record<string, { code: string; value: string }> = {
    preliminary: { code: "at0017", value: "Preliminary" },
    final: { code: "at0018", value: "Final" },
    amended: { code: "at0020", value: "Amended" },
    corrected: { code: "at0019", value: "Corrected" },
  };
  return statusMap[status] || { code: "at0018", value: "Final" };
}

function getInterpretationCode(interpretation: string): { code: string; value: string } {
  const interpMap: Record<string, { code: string; value: string }> = {
    normal: { code: "at0017", value: "Normal" },
    high: { code: "at0018", value: "High" },
    low: { code: "at0019", value: "Low" },
    critical: { code: "at0020", value: "Critical" },
    abnormal: { code: "at0020", value: "Abnormal" },
  };
  return interpMap[interpretation] || { code: "at0017", value: "Normal" };
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Create a laboratory report composition in OpenEHR using V1 template
 */
export async function createLaboratoryReportV1(
  data: LabReportV1Data
): Promise<string> {
  const composition = buildLaboratoryReportV1(data);

  // Debug logging
  console.log("=== OpenEHR V1 Composition ===");
  console.log("EHR ID:", data.ehrId);
  console.log("Template ID: laboratory_report_v1");
  console.log("Composition Keys:", Object.keys(composition).slice(0, 10));
  console.log("Full Composition:", JSON.stringify(composition, null, 2));

  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/ehr/${data.ehrId}/composition`;
  
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
        templateId: "laboratory_report_v1",
      },
    });

    return response.data.compositionUid || response.data.uid?.value;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("OpenEHR Validation Error:", JSON.stringify(error.response.data, null, 2));
      console.error("Submitted Composition:", JSON.stringify(composition, null, 2));
      throw new Error(`OpenEHR validation failed: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Get laboratory reports list for a specific EHR using V1 template
 */
export async function listLaboratoryReportsV1(
  ehrId: string
): Promise<Array<{ composition_uid: string; composition_name: string; start_time: string }>> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/query/aql`;
  const query = `SELECT c/uid/value AS composition_uid, c/name/value AS composition_name, c/context/start_time/value AS start_time FROM EHR e CONTAINS COMPOSITION c WHERE e/ehr_id/value = '${ehrId}' AND c/archetype_details/template_id/value = 'laboratory_report_v1' ORDER BY c/context/start_time/value DESC`;

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
