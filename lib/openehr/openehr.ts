/**
 * OpenEHR (EHRbase) client utilities
 * - Provides helpers to run AQL queries, list/create/update EHRs, list templates, fetch compositions.
 * - Auth: Basic auth built from EHRBASE_USER/EHRBASE_PASSWORD; optional X-API-Key if your deployment requires it.
 * - URL: Set EHRBASE_URL to the host base (e.g. http://localhost:8080). Functions add the `/ehrbase/rest/openehr/v1/...` path.
 * - All requests send JSON (Content-Type) and prefer JSON responses (Accept).
 */
import axios from "axios";

const username = process.env.EHRBASE_USER?.trim() || "";
const password = process.env.EHRBASE_PASSWORD?.trim() || "";
const credentials = `${username}:${password}`;
const basicAuth = Buffer.from(credentials, "utf-8").toString("base64");

export async function queryOpenEHR<T = Record<string, unknown>>(
  aqlQuery: string
): Promise<T[]> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/query/aql`;
  const response = await axios.post(
    url,
    {
      q: aqlQuery,
    },
    {
      headers: {
        "X-API-Key": process.env.EHRBASE_API_KEY!,
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    }
  );

  const data = response.data as OpenEHRAAQLResponse;
  const { columns, rows } = data;

  // Map rows (arrays) to objects based on column names
  return rows.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, index) => {
      obj[col.name] = row[index];
    });
    return obj as T;
  });
}

export interface TestOrderRecord {
  composition_uid: string;
  recorded_time: string;
  service_name: string;
  service_type_code: string;
  service_type_value: string;
  description: string;
  clinical_indication: string;
  urgency: string;
  requesting_provider: string;
  receiving_provider: string;
  request_status: string;
  request_id: string;
  narrative: string;
}

export interface DiagnosisRecord {
  composition_uid: string;
  recorded_time: string;
  problem_diagnosis: string;
  clinical_status: string;
  clinical_description: string;
  body_site: string;
  date_of_onset: string;
  date_of_resolution: string;
  severity: string;
  comment: string;
}

// Helper to find a value by field name in OpenEHR INSTRUCTION structure
function findValueByName(instruction: any, fieldName: string): string | undefined {
  if (!instruction || typeof instruction !== 'object') return undefined;
  
  // Check activities array for description items
  if (instruction.activities && Array.isArray(instruction.activities)) {
    for (const activity of instruction.activities) {
      if (activity.description?.items && Array.isArray(activity.description.items)) {
        for (const item of activity.description.items) {
          if (item.name?.value === fieldName && item.value?.value) {
            return item.value.value;
          }
        }
      }
    }
  }
  
  // Check narrative at top level
  if (fieldName === 'narrative' && instruction.narrative?.value) {
    return instruction.narrative.value;
  }
  
  // Check protocol items for request_id
  if (instruction.protocol?.items && Array.isArray(instruction.protocol.items)) {
    for (const item of instruction.protocol.items) {
      if (item.name?.value === fieldName && item.value?.value) {
        return item.value.value;
      }
    }
  }
  
  return undefined;
}

export async function getOpenEHRTestOrders(ehrId: string): Promise<TestOrderRecord[]> {
  const query = `SELECT
    c/uid/value as composition_uid,
    c/context/start_time/value as recorded_time,
    i as full_instruction
FROM
    EHR e
    CONTAINS COMPOSITION c
    CONTAINS INSTRUCTION i[openEHR-EHR-INSTRUCTION.service_request.v1]
WHERE
    e/ehr_id/value = '${ehrId}'
ORDER BY
    c/context/start_time/value DESC`;

  try {
    const results = await queryOpenEHR<any>(query);
    
    return results.map(row => {
      const instruction = row.full_instruction;
      
      // Extract fields using the exact field names from OpenEHR structure
      const serviceName = findValueByName(instruction, 'Service Name') || "";
      const description = findValueByName(instruction, 'Description') || "";
      const clinicalIndication = findValueByName(instruction, 'Clinical Indication') || "";
      const requestingProvider = findValueByName(instruction, 'Requesting Provider') || "";
      const receivingProvider = findValueByName(instruction, 'Receiving Provider') || "";
      const requestId = findValueByName(instruction, 'Request ID') || "";
      const narrative = findValueByName(instruction, 'narrative') || "";
      
      // Parse test type from description (format: "Test Type: X (Code: Y) | Urgency: Z")
      let testType = "";
      const testTypeMatch = description.match(/Test Type:\s*([^(]+)/);
      if (testTypeMatch) {
        testType = testTypeMatch[1].trim();
      }
      
      // Extract urgency from description
      let urgency = "routine";
      const urgencyMatch = description.match(/Urgency:\s*(\w+)/);
      if (urgencyMatch) {
        urgency = urgencyMatch[1].toLowerCase();
      }
      
      return {
        composition_uid: row.composition_uid,
        recorded_time: row.recorded_time,
        service_name: serviceName,
        service_type_code: "",
        service_type_value: testType,
        description: description,
        clinical_indication: clinicalIndication,
        urgency: urgency,
        requesting_provider: requestingProvider,
        receiving_provider: receivingProvider,
        request_status: "ordered",
        request_id: requestId,
        narrative: narrative
      };
    });
  } catch (error) {
    console.error("Error fetching test orders via AQL:", error);
    return [];
  }
}

export interface VitalSignsRecord {
  composition_uid: string;
  recorded_time: string;
  temperature?: number;
  systolic?: number;
  diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  spo2?: number;
}

// Helper to find a value by field name in OpenEHR EVALUATION structure
function findDiagnosisValue(evaluation: any, fieldName: string): string | undefined {
  if (!evaluation || typeof evaluation !== 'object') return undefined;
  
  // Check data.items array for elements
  if (evaluation.data?.items && Array.isArray(evaluation.data.items)) {
    for (const item of evaluation.data.items) {
      if (item.name?.value === fieldName && item.value?.value) {
        return item.value.value;
      }
    }
  }
  
  return undefined;
}

export async function getOpenEHRDiagnoses(ehrId: string): Promise<DiagnosisRecord[]> {
  const query = `SELECT
    c/uid/value as composition_uid,
    c/context/start_time/value as recorded_time,
    eval as full_evaluation
FROM
    EHR e
    CONTAINS COMPOSITION c
    CONTAINS EVALUATION eval[openEHR-EHR-EVALUATION.problem_diagnosis.v1]
WHERE
    e/ehr_id/value = '${ehrId}'
ORDER BY
    c/context/start_time/value DESC`;

  try {
    const results = await queryOpenEHR<any>(query);
    
    return results.map(row => {
      const evaluation = row.full_evaluation;
      
      // Extract fields using the exact field names from OpenEHR structure
      const problemDiagnosis = findDiagnosisValue(evaluation, 'Problem/Diagnosis name') || "";
      const clinicalDescription = findDiagnosisValue(evaluation, 'Clinical description') || "";
      const bodySite = findDiagnosisValue(evaluation, 'Body site') || "";
      const dateOfOnset = findDiagnosisValue(evaluation, 'Date/time of onset') || "";
      const dateOfResolution = findDiagnosisValue(evaluation, 'Date/time of resolution') || "";
      const comment = findDiagnosisValue(evaluation, 'Comment') || "";
      const clinicalStatus = findDiagnosisValue(evaluation, 'Variant') || "active";
      
      return {
        composition_uid: row.composition_uid,
        recorded_time: row.recorded_time,
        problem_diagnosis: problemDiagnosis,
        clinical_status: clinicalStatus,
        clinical_description: clinicalDescription,
        body_site: bodySite,
        date_of_onset: dateOfOnset,
        date_of_resolution: dateOfResolution,
        severity: "",
        comment: comment
      };
    });
  } catch (error) {
    console.error("Error fetching diagnoses via AQL:", error);
    return [];
  }
}

// Helper to recursively find a magnitude value for a specific archetype node ID (at-code)
function findMagnitude(node: any, atCode: string): number | undefined {
  if (!node || typeof node !== 'object') return undefined;
  // Check if this node matches the atCode and has a magnitude
  if (node.archetype_node_id === atCode && node.value?.magnitude !== undefined) {
    return node.value.magnitude;
  }
  // Traverse children (arrays or objects)
  for (const key of Object.keys(node)) {
    // Optimization: skip non-structural keys
    if (key === 'value' || typeof node[key] !== 'object') continue;
    const res = findMagnitude(node[key], atCode);
    if (res !== undefined) return res;
  }
  return undefined;
}

export async function getOpenEHRVitalSigns(ehrId: string): Promise<VitalSignsRecord[]> {
  const query = `SELECT
    c/uid/value as composition_uid,
    c/context/start_time/value as recorded_time,
    o as full_obs
FROM
    EHR e
    CONTAINS COMPOSITION c
    CONTAINS OBSERVATION o
WHERE
    e/ehr_id/value = '${ehrId}'
ORDER BY
    c/context/start_time/value DESC`;

  try {
    const results = await queryOpenEHR<any>(query);
    const grouped = new Map<string, VitalSignsRecord>();

    for (const row of results) {
      const compId = row.composition_uid;
      if (!grouped.has(compId)) {
        grouped.set(compId, {
          composition_uid: compId,
          recorded_time: row.recorded_time,
        });
      }
      
      const record = grouped.get(compId)!;
      const obs = row.full_obs;
      
      if (!obs || !obs.archetype_node_id) continue;

      const archId = (obs.archetype_node_id as string).toLowerCase();

      // Handle composite vital_signs archetype (contains all vitals in one observation)
      if (archId.includes("vital_signs") || archId.includes("vitals")) {
        // Mapping for openEHR-EHR-OBSERVATION.vital_signs.v1:
        const sys = findMagnitude(obs, "at0004");  // Systolic BP
        const dia = findMagnitude(obs, "at0005");  // Diastolic BP
        const hr = findMagnitude(obs, "at0006");   // Heart Rate
        const temp = findMagnitude(obs, "at0007"); // Body Temperature
        const rr = findMagnitude(obs, "at0008");   // Respiratory Rate
        const spo2 = findMagnitude(obs, "at0009"); // SpO2
        
        if (sys !== undefined) record.systolic = sys;
        if (dia !== undefined) record.diastolic = dia;
        if (hr !== undefined) record.heart_rate = hr;
        if (temp !== undefined) record.temperature = temp;
        if (rr !== undefined) record.respiratory_rate = rr;
        if (spo2 !== undefined) record.spo2 = spo2;
      }
      // Handle individual vital sign archetypes
      else if (archId.includes("temp")) {
        const val = findMagnitude(obs, "at0004");
        if (val !== undefined) record.temperature = val;
      } 
      else if (archId.includes("pressure")) {
        const sys = findMagnitude(obs, "at0004");
        const dia = findMagnitude(obs, "at0005");
        if (sys !== undefined) record.systolic = sys;
        if (dia !== undefined) record.diastolic = dia;
      } 
      else if ((archId.includes("pulse") || archId.includes("heart")) && !archId.includes("oximetry")) {
        const val = findMagnitude(obs, "at0004");
        if (val !== undefined) record.heart_rate = val;
      } 
      else if (archId.includes("respiration") || archId.includes("breathing")) {
        const val = findMagnitude(obs, "at0004");
        if (val !== undefined) record.respiratory_rate = val;
      } 
      else if (archId.includes("oximetry") || archId.includes("saturation") || archId.includes("spo2")) {
        const val = findMagnitude(obs, "at0006");
        if (val !== undefined) record.spo2 = val;
      }
    }

    return Array.from(grouped.values()).filter(r => 
      r.temperature !== undefined || 
      r.systolic !== undefined || 
      r.diastolic !== undefined || 
      r.heart_rate !== undefined || 
      r.respiratory_rate !== undefined || 
      r.spo2 !== undefined
    );
  } catch (error) {
    console.error("Error fetching vital signs via AQL:", error);
    return [];
  }
}

export async function getOpenEHRTemplates(): Promise<
  OpenEHRTemplateResponse[]
> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/definition/template/adl1.4`;
  const response = await axios.get(url, {
    headers: {
      "X-API-Key": process.env.EHRBASE_API_KEY!,
      Authorization: `Basic ${basicAuth}`,
    },
  });
  return response.data as OpenEHRTemplateResponse[];
}

export async function createOpenEHREHR(subjectId: string): Promise<string> {
  const newEHRRequest: OpenEHREHRNewRequest = {
    archetype_node_id: "openEHR-EHR-EHR_STATUS.generic.v1",
    name: { value: "EHR Status" },
    subject: {
      _type: "PARTY_SELF",
      external_ref: {
        id: {
          _type: "GENERIC_ID",
          value: subjectId,
          scheme: "USER_ID",
        },
        namespace: "HOSPITAL",
        type: "PERSON",
      },
    },
    is_queryable: true,
    is_modifiable: true,
    _type: "EHR_STATUS",
  };
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/ehr`;
  const response = await axios.post(url, newEHRRequest, {
    headers: {
      "X-API-Key": process.env.EHRBASE_API_KEY!,
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  });
  return response.data.ehr_id.value;
}

export async function updateOpenEHREHR(
  ehrId: string,
  subjectId: string
): Promise<string> {
  const newEHRRequest: OpenEHREHRNewRequest = {
    archetype_node_id: "openEHR-EHR-EHR_STATUS.generic.v1",
    name: { value: "EHR Status" },
    subject: {
      _type: "PARTY_SELF",
      external_ref: {
        id: {
          _type: "GENERIC_ID",
          value: subjectId,
          scheme: "USER_ID",
        },
        namespace: "HOSPITAL",
        type: "PERSON",
      },
    },
    is_queryable: true,
    is_modifiable: true,
    _type: "EHR_STATUS",
  };
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/ehr/${ehrId}`;
  const response = await axios.put(url, newEHRRequest, {
    headers: {
      "X-API-Key": process.env.EHRBASE_API_KEY!,
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  });
  return response.data.ehr_id.value;
}

export async function deleteOpenEHREHR(ehrId: string): Promise<void> {
  // Try Admin API first as standard API typically doesn't allow full EHR deletion
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/admin/ehr/${ehrId}`;
  await axios.delete(url, {
    headers: {
      "X-API-Key": process.env.EHRBASE_API_KEY!,
      Authorization: `Basic ${basicAuth}`,
    },
  });
}

export async function getOpenEHREHRs(): Promise<OpenEHREHRResponse[]> {
  const query =
    "SELECT e/ehr_id/value AS ehr_id, e/ehr_status/subject/external_ref/id/value AS subject_id, e/time_created/value AS created_time FROM EHR e";
  return queryOpenEHR<OpenEHREHRResponse>(query);
}

export async function getOpenEHREHRBySubjectId(subjectId: string): Promise<string | null> {
  const query = `SELECT e/ehr_id/value AS ehr_id FROM EHR e WHERE e/ehr_status/subject/external_ref/id/value = '${subjectId}'`;
  const results = await queryOpenEHR<{ ehr_id: string }>(query);
  return results.length > 0 ? results[0].ehr_id : null;
}

export async function getOpenEHRCompositions(
  ehrId: string
): Promise<OpenEHRCompositionsResponse[]> {
  const query = `SELECT c/uid/value AS composition_uid, c/name/value AS composition_name, c/context/start_time/value AS start_time FROM EHR e CONTAINS COMPOSITION c WHERE e/ehr_id/value = '${ehrId}' ORDER BY c/context/start_time/value DESC`;
  return queryOpenEHR<OpenEHRCompositionsResponse>(query);
}

/**
 * Get clinical compositions for a patient by their National ID (or any subject_id)
 * This is a convenience function that first finds the EHR by subject_id, then fetches compositions
 */
export async function getOpenEHRCompositionsByNationalId(
  nationalId: string
): Promise<OpenEHRCompositionsResponse[]> {
  // First, find the EHR ID for this National ID
  const ehrId = await getOpenEHREHRBySubjectId(nationalId);
  if (!ehrId) {
    return []; // No EHR found for this National ID
  }
  // Then fetch all compositions for that EHR
  return getOpenEHRCompositions(ehrId);
}

export async function getOpenEHRComposition(
  ehrId: string,
  compositionId: string
): Promise<unknown> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/ehr/${ehrId}/composition/${compositionId}?format=FLAT`;
  const response = await axios.get(url, {
    headers: {
      "X-API-Key": process.env.EHRBASE_API_KEY!,
      Authorization: `Basic ${basicAuth}`,
      Accept: "application/json",
    },
  });
  return response.data;
}

/**
 * Create a new composition (clinical document) in OpenEHR
 * @param ehrId - The EHR ID to create the composition in
 * @param templateId - The template ID to use (e.g., "template_clinical_encounter_v1")
 * @param compositionData - The composition data in FLAT format
 * @returns The created composition UID
 */
export async function createOpenEHRComposition(
  ehrId: string,
  templateId: string,
  compositionData: Record<string, unknown>
): Promise<string> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/ehr/${ehrId}/composition?format=FLAT&templateId=${templateId}`;
  
  console.log("Creating composition with data:", JSON.stringify(compositionData, null, 2));
  
  try {
    const response = await axios.post(url, compositionData, {
      headers: {
        "X-API-Key": process.env.EHRBASE_API_KEY!,
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        Prefer: "return=representation",
      },
    });
    return response.data.uid?.value || response.data.composition_uid || response.data.uid;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("EHRbase error response:", error.response.status);
      console.error("EHRbase error data:", JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

export type OpenEHRCompositionResponse = Record<string, unknown>;
// AQL Response Types
export interface OpenEHRAAQLResponse {
  meta: {
    _type: string;
    _schema_version: string;
    _created: string;
    _executed_aql: string;
    resultsize: number;
  };
  q: string;
  columns: Array<{
    path: string;
    name: string;
  }>;
  rows: Array<Array<unknown>>;
}

export interface OpenEHREHRResponse {
  ehr_id: string;
  subject_id: string;
  created_time: string;
}

export interface OpenEHRCompositionsResponse {
  composition_uid: string;
  composition_name: string;
  start_time: string;
}

export interface OpenEHRTemplateResponse {
  template_id: string;
  version: string;
  concept: string;
  archetype_id: string;
  created_timestamp: string;
}

export interface OpenEHREHRNewRequest {
  archetype_node_id: string;
  name: {
    value: string;
  };
  subject: {
    _type: string;
    external_ref: {
      id: {
        _type: string;
        value: string;
        scheme: string;
      };
      namespace: string;
      type: string;
    };
  };
  is_queryable: boolean;
  is_modifiable: boolean;
  _type: string;
}
