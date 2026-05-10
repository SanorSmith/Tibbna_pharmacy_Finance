import axios from "axios";

const basicAuth = Buffer.from(
  `${process.env.EHRBASE_USER}:${process.env.EHRBASE_PASSWORD}`
).toString("base64");

export interface ClinicalNoteComposition {
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

  // Use problem_diagnosis fields to store clinical note data with CLINICAL_NOTE prefix
  "template_clinical_encounter_v1/problem_diagnosis/problem_diagnosis_name"?: string;
  "template_clinical_encounter_v1/problem_diagnosis/clinical_description"?: string;
  "template_clinical_encounter_v1/problem_diagnosis/body_site:0"?: string;
  "template_clinical_encounter_v1/problem_diagnosis/variant:0"?: string;
  "template_clinical_encounter_v1/problem_diagnosis/comment"?: string;
}

export interface ClinicalNoteListItem {
  composition_uid: string;
  composition_name: string;
  start_time: string;
}

export async function createClinicalNote(
  ehrId: string,
  composition: ClinicalNoteComposition
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
        templateId: "template_clinical_encounter_v1",
      },
    });

    return response.data.compositionUid || response.data.uid?.value;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("openEHR Clinical Note Creation Error:");
      console.error("Status:", error.response.status);
      console.error("Response Data:", JSON.stringify(error.response.data, null, 2));
      console.error("Sent Composition:", JSON.stringify(composition, null, 2));
    }
    throw error;
  }
}

export async function listClinicalNotes(ehrId: string): Promise<ClinicalNoteListItem[]> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/query/aql`;
  // Query for clinical encounters using template_clinical_encounter_v1
  const query = `SELECT c/uid/value AS composition_uid, c/name/value AS composition_name, c/context/start_time/value AS start_time FROM EHR e CONTAINS COMPOSITION c CONTAINS EVALUATION eval[openEHR-EHR-EVALUATION.problem_diagnosis.v1] WHERE e/ehr_id/value = '${ehrId}' AND c/archetype_details/template_id/value = 'template_clinical_encounter_v1' ORDER BY c/context/start_time/value DESC`;

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

export async function getClinicalNote(
  ehrId: string,
  compositionId: string
): Promise<ClinicalNoteComposition> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/ehr/${ehrId}/composition/${compositionId}?format=FLAT`;
  const response = await axios.get(url, {
    headers: {
      "X-API-Key": process.env.EHRBASE_API_KEY!,
      Authorization: `Basic ${basicAuth}`,
      Accept: "application/json",
    },
  });
  return response.data as ClinicalNoteComposition;
}

// Helper functions to parse SOAP data from clinical_description field
export function parseSOAPData(clinicalDescription: string): {
  synopsis: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  clinical_context?: string;
  comment?: string;
} {
  const lines = clinicalDescription.split('\n').filter(line => line.trim());
  
  const result: {
    synopsis: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    clinical_context?: string;
    comment?: string;
  } = {
    synopsis: '',
  };

  let currentSection = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check for section headers
    if (trimmedLine.toUpperCase().startsWith('SYNOPSIS:')) {
      currentSection = 'synopsis';
      result.synopsis = trimmedLine.substring(9).trim();
    } else if (trimmedLine.toUpperCase().startsWith('SUBJECTIVE:')) {
      currentSection = 'subjective';
      result.subjective = trimmedLine.substring(11).trim();
    } else if (trimmedLine.toUpperCase().startsWith('OBJECTIVE:')) {
      currentSection = 'objective';
      result.objective = trimmedLine.substring(10).trim();
    } else if (trimmedLine.toUpperCase().startsWith('ASSESSMENT:')) {
      currentSection = 'assessment';
      result.assessment = trimmedLine.substring(12).trim();
    } else if (trimmedLine.toUpperCase().startsWith('PLAN:')) {
      currentSection = 'plan';
      result.plan = trimmedLine.substring(6).trim();
    } else if (trimmedLine.toUpperCase().startsWith('CONTEXT:')) {
      currentSection = 'clinical_context';
      result.clinical_context = trimmedLine.substring(9).trim();
    } else if (trimmedLine.toUpperCase().startsWith('COMMENT:')) {
      currentSection = 'comment';
      result.comment = trimmedLine.substring(9).trim();
    } else if (currentSection && trimmedLine) {
      // Continue adding to current section
      const key = currentSection as keyof typeof result;
      if (result[key]) {
        result[key] = (result[key] as string) + '\n' + trimmedLine;
      } else {
        (result[key] as string | undefined) = trimmedLine;
      }
    }
  }

  return result;
}

// Helper function to format SOAP data into clinical_description string
export function formatSOAPData(data: {
  synopsis: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  clinical_context?: string;
  comment?: string;
}): string {
  const sections = [
    `SYNOPSIS: ${data.synopsis}`,
  ];

  if (data.subjective) sections.push(`SUBJECTIVE: ${data.subjective}`);
  if (data.objective) sections.push(`OBJECTIVE: ${data.objective}`);
  if (data.assessment) sections.push(`ASSESSMENT: ${data.assessment}`);
  if (data.plan) sections.push(`PLAN: ${data.plan}`);
  if (data.clinical_context) sections.push(`CONTEXT: ${data.clinical_context}`);
  if (data.comment) sections.push(`COMMENT: ${data.comment}`);

  return sections.join('\n');
}
