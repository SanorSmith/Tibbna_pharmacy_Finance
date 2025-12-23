import axios from "axios";

const basicAuth = Buffer.from(
  `${process.env.EHRBASE_USER}:${process.env.EHRBASE_PASSWORD}`
).toString("base64");

export interface ReferralComposition {
  "template_referral_v1/language|code"?: string;
  "template_referral_v1/language|terminology"?: string;
  "template_referral_v1/territory|code"?: string;
  "template_referral_v1/territory|terminology"?: string;
  "template_referral_v1/composer|name"?: string;
  "template_referral_v1/context/start_time"?: string;
  "template_referral_v1/context/setting|code"?: string;
  "template_referral_v1/context/setting|value"?: string;
  "template_referral_v1/context/setting|terminology"?: string;
  "template_referral_v1/category|code"?: string;
  "template_referral_v1/category|value"?: string;
  "template_referral_v1/category|terminology"?: string;

  "template_referral_v1/referral/physician_department"?: string;
  "template_referral_v1/referral/receiving_physician"?: string;
  "template_referral_v1/referral/clinical_indication"?: string;
  "template_referral_v1/referral/urgency"?: string;
  "template_referral_v1/referral/comment"?: string;
  "template_referral_v1/referral/referred_by"?: string;
  "template_referral_v1/referral/status"?: string;
}

export interface ReferralListItem {
  composition_uid: string;
  composition_name: string;
  start_time: string;
}

export async function createReferral(
  ehrId: string,
  composition: ReferralComposition
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
        templateId: "template_referral_v1",
      },
    });

    return response.data.compositionUid || response.data.uid?.value;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("openEHR Referral Creation Error:");
      console.error("Status:", error.response.status);
      console.error("Response Data:", JSON.stringify(error.response.data, null, 2));
      console.error("Sent Composition:", JSON.stringify(composition, null, 2));
    }
    throw error;
  }
}

export async function listReferrals(ehrId: string): Promise<ReferralListItem[]> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/query/aql`;
  const query = `SELECT c/uid/value AS composition_uid, c/name/value AS composition_name, c/context/start_time/value AS start_time FROM EHR e CONTAINS COMPOSITION c WHERE e/ehr_id/value = '${ehrId}' AND c/archetype_details/template_id/value = 'template_referral_v1' ORDER BY c/context/start_time/value DESC`;

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

export async function getReferral(
  ehrId: string,
  compositionId: string
): Promise<ReferralComposition> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/ehr/${ehrId}/composition/${compositionId}?format=FLAT`;
  const response = await axios.get(url, {
    headers: {
      "X-API-Key": process.env.EHRBASE_API_KEY!,
      Authorization: `Basic ${basicAuth}`,
      Accept: "application/json",
    },
  });
  return response.data as ReferralComposition;
}
