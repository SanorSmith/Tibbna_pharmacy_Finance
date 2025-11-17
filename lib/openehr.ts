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
       //"X-API-Key": process.env.EHRBASE_API_KEY!,
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
