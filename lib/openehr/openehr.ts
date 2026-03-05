/**
 * OpenEHR (EHRbase) client utilities
 * - Provides helpers to run AQL queries, list/create/update EHRs, list templates, fetch compositions.
 * - Auth: Basic auth built from EHRBASE_USER/EHRBASE_PASSWORD; optional X-API-Key if your deployment requires it.
 * - URL: Set EHRBASE_URL to the host base (e.g. http://localhost:8080). Functions add the `/ehrbase/rest/openehr/v1/...` path.
 * - All requests send JSON (Content-Type) and prefer JSON responses (Accept).
 */
import axios from "axios";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getOpenEHROrderStatus } from "@/lib/openehr-order-status";

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
        Accept: "application/json",
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
  description?: string;
  clinical_indication: string;
  urgency: string;
  requested_date?: string;
  requesting_provider?: string;
  receiving_provider?: string;
  request_status?: string;
  timing?: string;
  request_id?: string;
  narrative?: string;
  test_category?: string;
  is_package?: boolean;
  target_lab?: string;
  status?: string; // Order status: REQUESTED, IN_PROGRESS, COMPLETED, CANCELLED
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

// Referral records mapped from SERVICE_REQUEST inside clinical encounter compositions
export interface ReferralRecord {
  composition_uid: string;
  recorded_time: string;
  physician_department: string;
  receiving_physician?: string;
  clinical_indication: string;
  urgency: string; // "routine" | "urgent"
  comment?: string;
  referred_by: string;
  status: string;
}

// Helper to find a value by field name in OpenEHR INSTRUCTION structure
function findValueByName(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instruction: any,
  fieldName: string
): string | undefined {
  if (!instruction || typeof instruction !== "object") return undefined;

  // Check activities array for description items
  if (instruction.activities && Array.isArray(instruction.activities)) {
    for (const activity of instruction.activities) {
      if (
        activity.description?.items &&
        Array.isArray(activity.description.items)
      ) {
        for (const item of activity.description.items) {
          if (item.name?.value === fieldName) {
            // Handle DV_CODED_TEXT (coded values like urgency)
            if (item.value?.value) {
              // For coded text, convert to lowercase for consistency
              const value = item.value.value;
              return fieldName === "Urgency" ? value.toLowerCase() : value;
            }
            // Handle DV_TEXT (plain text)
            if (item.value?._type === "DV_TEXT" && item.value?.value) {
              return item.value.value;
            }
          }
        }
      }
    }
  }

  // Check narrative at instruction level
  if (fieldName === "narrative") {
    const narrative = instruction.narrative as { value?: string } | undefined;
    if (narrative?.value) {
      return narrative.value;
    }
    // Also check for narrative in the parent composition's service_request
    const parent = instruction._parent as { narrative?: { value?: string } } | undefined;
    if (parent?.narrative?.value) {
      return parent.narrative.value;
    }
  }

  // Check protocol items for request_id and Order Type marker
  const protocol = instruction.protocol as { items?: unknown[] } | undefined;
  if (
    protocol?.items &&
    Array.isArray(protocol.items)
  ) {
    for (const item of protocol.items) {
      const typedItem = item as { name?: { value?: string }; value?: { value?: string } };
      if (typedItem.name?.value === fieldName && typedItem.value?.value) {
        return typedItem.value.value;
      }
    }
  }

  // Special case: look for request_id in protocol section with name "Request ID"
  if (fieldName === "request_id") {
    const protocol2 = instruction.protocol as { items?: unknown[] } | undefined;
    if (
      protocol2?.items &&
      Array.isArray(protocol2.items)
    ) {
      for (const item of protocol2.items) {
        const typedItem = item as { name?: { value?: string }; value?: { value?: string } };
        if (typedItem.name?.value === "Request ID" && typedItem.value?.value) {
          return typedItem.value.value;
        }
      }
    }
  }

  return undefined;
}

// Define type for OpenEHR query results
interface OpenEHRResult {
  full_composition: {
    content?: unknown[];
    narrative?: unknown;
  };
  composition_uid: string;
  recorded_time: string;
}

export async function getOpenEHRTestOrders(
  ehrId: string
): Promise<TestOrderRecord[]> {
  // Use only encounter compositions query since it finds all test orders
  const encounterQuery = `SELECT
    c/uid/value as composition_uid,
    c/context/start_time/value as recorded_time,
    c as full_composition
  FROM
    EHR e
    CONTAINS COMPOSITION c[openEHR-EHR-COMPOSITION.encounter.v1]
  WHERE
    e/ehr_id/value = '${ehrId}'
  ORDER BY
    c/context/start_time/value DESC`;

  try {
    // Get only encounter compositions (this finds all test orders)
    const encounterResults = await queryOpenEHR<OpenEHRResult>(encounterQuery);

    const testOrders: TestOrderRecord[] = [];

    // Process encounter compositions
    for (const row of encounterResults) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const composition = row.full_composition as any;

      // Look for service_request instructions within the composition
      if (composition?.content) {
        for (const item of composition.content) {
          if (
            item.archetype_node_id ===
            "openEHR-EHR-INSTRUCTION.service_request.v1"
          ) {
            const instruction = item;
           
            // Extract fields using the exact field names from OpenEHR structure
            const serviceName =
              findValueByName(instruction, "Service Name") || "";
            const description =
              findValueByName(instruction, "Description") || "";
            const clinicalIndication =
              findValueByName(instruction, "Clinical Indication") || "";
            const requestingProvider =
              findValueByName(instruction, "Requesting Provider") || "";
            const receivingProvider =
              findValueByName(instruction, "Receiving Provider") || "";
            const requestId = findValueByName(instruction, "request_id") || "";
            
            // Try to get narrative from multiple sources FIRST (before status extraction)
            let narrative = findValueByName(instruction, "narrative") || "";

            // Look for narrative in the service_request within composition content
            if (!narrative && composition.content) {
              for (const contentItem of composition.content) {
                if (
                  contentItem.archetype_node_id ===
                  "openEHR-EHR-INSTRUCTION.service_request.v1"
                ) {
                  // Check if this content item has the narrative at the top level
                  if (contentItem.narrative?.value) {
                    narrative = contentItem.narrative.value;
                    break;
                  }
                }
              }
            }

            // If still no narrative, check if there's a service_request element with narrative
            // This handles the case where narrative is stored at the service_request level
            if (!narrative && composition.content) {
              for (const contentItem of composition.content) {
                // Look for any service_request content that might have narrative
                if (
                  contentItem.archetype_node_id ===
                  "openEHR-EHR-INSTRUCTION.service_request.v1"
                ) {
                  // The narrative might be stored directly in the content item
                  if (contentItem.narrative && contentItem.narrative.value) {
                    narrative = contentItem.narrative.value;
                    break;
                  }
                  // Also check if there's a narrative field in the instruction structure
                  if (instruction.narrative?.value) {
                    narrative = instruction.narrative.value;
                    break;
                  }
                }
              }
            }

            // As a last resort, check if the narrative is stored in the composition's narrative field
            if (!narrative && composition.narrative?.value) {
              narrative = composition.narrative.value;
            }

            // NOW extract status - check narrative FIRST for [CANCELLED] marker, then description
            let status = "REQUESTED";
            
            // Priority 1: Check narrative for [CANCELLED] marker
            if (narrative && narrative.includes("[CANCELLED]")) {
              status = "CANCELLED";
            } 
            // Priority 2: Check description for status
            else if (description) {
              const statusMatch = description.match(/Status:\s*(REQUESTED|CANCELLED|IN_PROGRESS|COMPLETED)/);
              if (statusMatch) {
                status = statusMatch[1];
              }
            }

            // Skip vaccination requests (they have different request_id pattern or service names)
            if (
              requestId.startsWith("VACC-") ||
              serviceName.toLowerCase().includes("vaccin") ||
              description.toLowerCase().includes("vaccin") ||
              narrative.toLowerCase().includes("vaccin")
            ) {
              continue;
            }

            // Skip referral requests (they have REFERRAL marker)
            if (
              description === "REFERRAL_REQUEST" ||
              narrative.toLowerCase().includes("referral")
            ) {
              continue;
            }

            // Skip procedure/operation requests (they have PROCEDURE_REQUEST marker)
            if (
              description === "PROCEDURE_REQUEST" ||
              requestId.toLowerCase().includes("procedure") ||
              serviceName.toLowerCase().includes("surgery") ||
              narrative.toLowerCase().includes("procedure") ||
              narrative.toLowerCase().includes("operation")
            ) {
              continue;
            }

            // Include all remaining service requests as potential test orders
            // This includes orders with "testreq-" prefix and other lab test orders

            // Extract urgency from description or narrative
            let urgency = "routine";
            if (
              description &&
              description.toLowerCase().includes("urgency: urgent")
            ) {
              urgency = "urgent";
            } else if (
              narrative &&
              narrative.toLowerCase().includes("(urgent)")
            ) {
              urgency = "urgent";
            }

            // If still no narrative, create a meaningful one from other fields
            if (!narrative || narrative.length <= 2) {
              narrative = `${serviceName} test ordered due to ${clinicalIndication}${urgency !== "routine" ? ` (urgency: ${urgency})` : ""
                }${receivingProvider ? ` at ${receivingProvider}` : ""}`;
            }

            // Extract enhanced fields
            let testCategory = "";
            let targetLab = receivingProvider;

            if (description) {
              const categoryMatch = description.match(/Category:\s*([^|]+)/);
              if (categoryMatch) {
                testCategory = categoryMatch[1].trim();
              }

              const labMatch = description.match(/Laboratory:\s*([^|]+)/);
              if (labMatch) {
                targetLab = labMatch[1].trim();
              }
            }

            testOrders.push({
              composition_uid: row.composition_uid,
              recorded_time: row.recorded_time,
              service_name: serviceName,
              service_type_code: "",
              service_type_value: "",
              description: description,
              clinical_indication: clinicalIndication,
              urgency: urgency,
              requesting_provider: requestingProvider,
              receiving_provider: receivingProvider,
              request_id: requestId,
              narrative: narrative,
              test_category: testCategory,
              is_package: true,
              target_lab: targetLab,
              status: status, // Include status in the returned record
            });
          }
        }
      }
    }

    // Compute actual status based on collected samples for each order
    const ordersWithComputedStatus = await Promise.all(
      testOrders.map(async (order) => {
        if (order.request_id && order.status !== "CANCELLED") {
          try {
            const computedStatus = await getOpenEHROrderStatus(order.request_id);
            return { ...order, status: computedStatus };
          } catch (error) {
            // Keep original status if computation fails
            return order;
          }
        }
        return order;
      })
    );

    // Sort results by recorded_time descending
    ordersWithComputedStatus.sort(
      (a, b) =>
        new Date(b.recorded_time).getTime() -
        new Date(a.recorded_time).getTime()
    );

    return ordersWithComputedStatus;
  } catch (error) {
    console.error("Error fetching test orders via AQL:", error);
    return [];
  }
}

/**
 * Get all test orders including cancelled ones (for doctors/patient view)
 * This function does NOT filter out cancelled orders
 */
export async function getOpenEHRTestOrdersWithCancelled(
  ehrId: string
): Promise<TestOrderRecord[]> {
  // Use the same query as getOpenEHRTestOrders but without filtering cancelled orders
  const encounterQuery = `SELECT
    c/uid/value as composition_uid,
    c/context/start_time/value as recorded_time,
    c as full_composition
  FROM
    EHR e
    CONTAINS COMPOSITION c[openEHR-EHR-COMPOSITION.encounter.v1]
  WHERE
    e/ehr_id/value = '${ehrId}'
  ORDER BY
    c/context/start_time/value DESC`;

  try {
    const encounterResults = await queryOpenEHR<OpenEHRResult>(encounterQuery);
    const testOrders: TestOrderRecord[] = [];

    for (const row of encounterResults) {
      const composition = row.full_composition as any;

      if (composition?.content) {
        for (const item of composition.content) {
          if (
            item.archetype_node_id ===
            "openEHR-EHR-INSTRUCTION.service_request.v1"
          ) {
            const instruction = item;
           
            const serviceName = findValueByName(instruction, "Service Name") || "";
            const description = findValueByName(instruction, "Description") || "";
            const clinicalIndication = findValueByName(instruction, "Clinical Indication") || "";
            const requestingProvider = findValueByName(instruction, "Requesting Provider") || "";
            const receivingProvider = findValueByName(instruction, "Receiving Provider") || "";
            const requestId = findValueByName(instruction, "request_id") || "";

            // Skip non-test orders (vaccinations, referrals, procedures)
            if (
              requestId.startsWith("VACC-") ||
              serviceName.toLowerCase().includes("vaccin") ||
              description === "REFERRAL_REQUEST" ||
              description === "PROCEDURE_REQUEST" ||
              requestId.toLowerCase().includes("procedure")
            ) {
              continue;
            }

            let narrative = findValueByName(instruction, "narrative") || "";
            if (!narrative && composition.content) {
              for (const contentItem of composition.content) {
                if (
                  contentItem.archetype_node_id ===
                  "openEHR-EHR-INSTRUCTION.service_request.v1"
                ) {
                  if (contentItem.narrative?.value) {
                    narrative = contentItem.narrative.value;
                    break;
                  }
                }
              }
            }

            let urgency = "routine";
            if (description && description.toLowerCase().includes("urgency: urgent")) {
              urgency = "urgent";
            } else if (narrative && narrative.toLowerCase().includes("(urgent)")) {
              urgency = "urgent";
            }

            if (!narrative || narrative.length <= 2) {
              narrative = `${serviceName} test ordered due to ${clinicalIndication}${
                urgency !== "routine" ? ` (urgency: ${urgency})` : ""
              }${receivingProvider ? ` at ${receivingProvider}` : ""}`;
            }

            // Extract status - check narrative FIRST for [CANCELLED] marker, then description
            let status = "REQUESTED";
            
            // Priority 1: Check narrative for [CANCELLED] marker
            if (narrative && narrative.includes("[CANCELLED]")) {
              status = "CANCELLED";
            } 
            // Priority 2: Check description for status
            else if (description) {
              const statusMatch = description.match(/Status:\s*(REQUESTED|CANCELLED|IN_PROGRESS|COMPLETED)/);
              if (statusMatch) {
                status = statusMatch[1];
              }
            }

            let testCategory = "";
            let targetLab = receivingProvider;

            if (description) {
              const categoryMatch = description.match(/Category:\s*([^|]+)/);
              if (categoryMatch) {
                testCategory = categoryMatch[1].trim();
              }

              const labMatch = description.match(/Laboratory:\s*([^|]+)/);
              if (labMatch) {
                targetLab = labMatch[1].trim();
              }
            }

            testOrders.push({
              composition_uid: row.composition_uid,
              recorded_time: row.recorded_time,
              service_name: serviceName,
              service_type_code: "",
              service_type_value: "",
              description: description,
              clinical_indication: clinicalIndication,
              urgency: urgency,
              requesting_provider: requestingProvider,
              receiving_provider: receivingProvider,
              request_id: requestId,
              narrative: narrative,
              test_category: testCategory,
              is_package: true,
              target_lab: targetLab,
              status: status, // Include status (REQUESTED, CANCELLED, etc.)
            });
          }
        }
      }
    }

    testOrders.sort(
      (a, b) =>
        new Date(b.recorded_time).getTime() -
        new Date(a.recorded_time).getTime()
    );

    return testOrders;
  } catch (error) {
    console.error("Error fetching test orders (with cancelled) via AQL:", error);
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
function findDiagnosisValue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluation: any,
  fieldName: string
): string | undefined {
  if (!evaluation || typeof evaluation !== "object") return undefined;

  const data = evaluation.data as { items?: unknown[] } | undefined;
  if (data?.items && Array.isArray(data.items)) {
    for (const item of data.items) {
      const typedItem = item as { name?: { value?: string }; value?: { value?: string } };
      if (typedItem.name?.value === fieldName && typedItem.value?.value) {
        return typedItem.value.value;
      }
    }
  }

  return undefined;
}

function findDiagnosisValueFuzzy(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluation: any,
  fieldSubstring: string
): string | undefined {
  if (!evaluation || typeof evaluation !== "object") return undefined;

  const needle = fieldSubstring.toLowerCase();

  const data = evaluation.data as { items?: unknown[] } | undefined;
  if (data?.items && Array.isArray(data.items)) {
    for (const item of data.items) {
      const typedItem = item as { name?: { value?: string }; value?: { value?: string } };
      const label = typedItem.name?.value;
      if (label && label.toLowerCase().includes(needle) && typedItem.value?.value) {
        return typedItem.value.value;
      }
    }
  }

  return undefined;
}

export async function getOpenEHRDiagnoses(
  ehrId: string
): Promise<DiagnosisRecord[]> {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await queryOpenEHR<any>(query);

    const allDiagnoses = results.map((row) => {
      const evaluation = row.full_evaluation;

      // Extract fields using the exact field names from OpenEHR structure
      const problemDiagnosis =
        findDiagnosisValue(evaluation, "Problem/Diagnosis name") || "";
      const clinicalDescription =
        findDiagnosisValue(evaluation, "Clinical description") || "";
      const bodySite =
        findDiagnosisValue(evaluation, "Body site") ||
        findDiagnosisValue(evaluation, "Body site (qualifier)") ||
        findDiagnosisValueFuzzy(evaluation, "body site") ||
        "";
      const dateOfOnset =
        findDiagnosisValue(evaluation, "Date/time of onset") || "";
      const dateOfResolution =
        findDiagnosisValue(evaluation, "Date/time of resolution") || "";
      const comment = findDiagnosisValue(evaluation, "Comment") || "";
      const clinicalStatus =
        findDiagnosisValue(evaluation, "Variant") || "active";

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
        comment: comment,
      };
    });

    // Build a set of superseded composition UIDs
    const supersededUids = new Set<string>();
    allDiagnoses.forEach((diagnosis) => {
      if (diagnosis.comment?.includes("Supersedes:")) {
        const match = diagnosis.comment.match(/Supersedes:\s*([a-f0-9-:]+)/);
        if (match) {
          supersededUids.add(match[1]);
        }
      }
    });

    // Filter out care plans, referrals, vaccinations, clinical notes, and superseded versions
    return allDiagnoses.filter((diagnosis) => {
      // Filter out care plan compositions
      if (
        diagnosis.problem_diagnosis === "Care Plan - See Goal Section" ||
        diagnosis.clinical_description?.includes("This is a care plan composition")
      ) {
        return false;
      }
      
      // Filter out referral compositions (they start with "REFERRAL:")
      if (diagnosis.problem_diagnosis.startsWith("REFERRAL:")) {
        return false;
      }
      
      // Filter out vaccination compositions (they start with "VACCINATION:")
      if (diagnosis.problem_diagnosis.startsWith("VACCINATION:")) {
        return false;
      }
      
      // Filter out clinical note compositions (they start with "CLINICAL_NOTE:")
      if (diagnosis.problem_diagnosis.startsWith("CLINICAL_NOTE:")) {
        return false;
      }
      
      // Filter out superseded versions (old versions that have been updated)
      if (supersededUids.has(diagnosis.composition_uid)) {
        return false;
      }
      
      return true;
    });
  } catch (error) {
    console.error("Error fetching diagnoses via AQL:", error);
    return [];
  }
}

// Helper to recursively find a magnitude value for a specific archetype node ID (at-code)
function findMagnitude(node: Record<string, unknown>, atCode: string): number | undefined {
  if (!node || typeof node !== "object") return undefined;
  // Check if this node matches the atCode and has a magnitude
  const value = node.value as { magnitude?: number } | undefined;
  if (
    node.archetype_node_id === atCode &&
    value?.magnitude !== undefined
  ) {
    return value.magnitude;
  }
  // Traverse children (arrays or objects)
  for (const key of Object.keys(node)) {
    // Optimization: skip non-structural keys
    const child = node[key];
    if (key === "value" || typeof child !== "object" || child === null) continue;
    const res = findMagnitude(child as Record<string, unknown>, atCode);
    if (res !== undefined) return res;
  }
  return undefined;
}

export async function getOpenEHRVitalSigns(
  ehrId: string
): Promise<VitalSignsRecord[]> {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        const sys = findMagnitude(obs, "at0004"); // Systolic BP
        const dia = findMagnitude(obs, "at0005"); // Diastolic BP
        const hr = findMagnitude(obs, "at0006"); // Heart Rate
        const temp = findMagnitude(obs, "at0007"); // Body Temperature
        const rr = findMagnitude(obs, "at0008"); // Respiratory Rate
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
      } else if (archId.includes("pressure")) {
        const sys = findMagnitude(obs, "at0004");
        const dia = findMagnitude(obs, "at0005");
        if (sys !== undefined) record.systolic = sys;
        if (dia !== undefined) record.diastolic = dia;
      } else if (
        (archId.includes("pulse") || archId.includes("heart")) &&
        !archId.includes("oximetry")
      ) {
        const val = findMagnitude(obs, "at0004");
        if (val !== undefined) record.heart_rate = val;
      } else if (
        archId.includes("respiration") ||
        archId.includes("breathing")
      ) {
        const val = findMagnitude(obs, "at0004");
        if (val !== undefined) record.respiratory_rate = val;
      } else if (
        archId.includes("oximetry") ||
        archId.includes("saturation") ||
        archId.includes("spo2")
      ) {
        const val = findMagnitude(obs, "at0006");
        if (val !== undefined) record.spo2 = val;
      }
    }

    return Array.from(grouped.values()).filter(
      (r) =>
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

export interface PrescriptionRecord {
  composition_uid: string;
  recorded_time: string;
  medication_item: string;
  product_name?: string;
  active_ingredient?: string;
  usage?: string;
  valid_until?: string;
  instructions?: string;
  issued_from?: string;
  dose_amount?: string;
  dose_unit?: string;
  direction_duration?: string;
  route: string;
  timing_directions: string;
  additional_instruction?: string;
  clinical_indication?: string;
  comment?: string;
  prescribed_by: string;
  status: string;
}

// Helper to find a value by field name in OpenEHR medication_order INSTRUCTION structure
function findMedicationValue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instruction: any,
  fieldName: string
): string | undefined {
  if (!instruction || typeof instruction !== "object") return undefined;

  if (instruction.activities && Array.isArray(instruction.activities)) {
    for (const activity of instruction.activities) {
      const items = activity.description?.items;
      if (!items || !Array.isArray(items)) continue;
      for (const item of items) {
        if (item.name?.value === fieldName && item.value?.value) {
          return item.value.value as string;
        }
      }
    }
  }

  return undefined;
}

export async function getOpenEHRPrescriptions(
  ehrId: string
): Promise<PrescriptionRecord[]> {
  const query = `SELECT
    c/uid/value as composition_uid,
    c/context/start_time/value as recorded_time,
    c/composer/name as composer_name,
    i as full_instruction
  FROM
    EHR e
      CONTAINS COMPOSITION c[openEHR-EHR-COMPOSITION.encounter.v1]
      CONTAINS INSTRUCTION i
  WHERE
    e/ehr_id/value = '${ehrId}'
  ORDER BY
    c/context/start_time/value DESC`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await queryOpenEHR<any>(query);

    const prescriptions: PrescriptionRecord[] = [];

    for (const row of results) {
      const instruction = row.full_instruction;
      const archId = (
        instruction?.archetype_node_id as string | undefined
      )?.toLowerCase();
      if (!archId || !archId.includes("medication_order")) {
        continue; // skip non-medication instructions in the encounter template
      }

      const medicationItem =
        findMedicationValue(instruction, "Medication item") || "";
      const route = findMedicationValue(instruction, "Route") || "";
      const timing = findMedicationValue(instruction, "Timing - daily") || "";
      const overallDirections =
        findMedicationValue(instruction, "Overall directions description") ||
        timing;

      const additionalInstruction =
        findMedicationValue(instruction, "Additional instruction") || "";
      const clinicalIndication =
        findMedicationValue(instruction, "Clinical indication") || "";
      const comment = findMedicationValue(instruction, "Comment") || "";

      // Parse structured comment for additional metadata encoded by the API
      let productName: string | undefined;
      let activeIngredient: string | undefined;
      let usage: string | undefined;
      let validUntil: string | undefined;
      let instructions: string | undefined;
      let issuedFrom: string | undefined;
      if (comment) {
        const productMatch = comment.match(/Product name:\s*([^|]+)/i);
        if (productMatch) {
          productName = productMatch[1].trim();
        }
        const activeMatch = comment.match(/Active ingredient:\s*([^|]+)/i);
        if (activeMatch) {
          activeIngredient = activeMatch[1].trim();
        }
        const usageMatch = comment.match(/Usage:\s*([^|]+)/i);
        if (usageMatch) {
          usage = usageMatch[1].trim();
        }
        const validMatch = comment.match(/Valid until:\s*([^|]+)/i);
        if (validMatch) {
          validUntil = validMatch[1].trim();
        }
        const instrMatch = comment.match(/Instructions:\s*([^|]+)/i);
        if (instrMatch) {
          instructions = instrMatch[1].trim();
        }
        const issuedMatch = comment.match(/Issued from:\s*([^|]+)/i);
        if (issuedMatch) {
          issuedFrom = issuedMatch[1].trim();
        }
      }

      // Derive structured dosage fields from our own overallDirections format:
      // "<doseAmount> <doseUnit>, <Route>, for <Duration>, PRN ..."
      let doseAmountText: string | undefined;
      let doseUnit: string | undefined;
      let directionDuration: string | undefined;
      if (overallDirections) {
        const parts = overallDirections.split(",").map((p) => p.trim());
        if (parts.length > 0) {
          const first = parts[0]; // e.g. "500 mg"
          const tokens = first.split(/\s+/);
          if (tokens.length >= 2) {
            doseUnit = tokens[tokens.length - 1];
            doseAmountText = tokens.slice(0, -1).join(" ");
          } else {
            doseAmountText = first;
          }
        }
        const durationPart = parts.find((p) =>
          p.toLowerCase().startsWith("for ")
        );
        if (durationPart) {
          directionDuration = durationPart.slice(4).trim();
        }
      }

      // Determine status based on validity
      let status = "active";
      if (validUntil) {
        try {
          const today = new Date();
          const todayDateOnly = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
          );
          const validDate = new Date(validUntil);
          const validDateOnly = new Date(
            validDate.getFullYear(),
            validDate.getMonth(),
            validDate.getDate()
          );
          if (validDateOnly < todayDateOnly) {
            status = "expired";
          }
        } catch {
          // if parsing fails, keep status as 'active'
        }
      }

      prescriptions.push({
        composition_uid: row.composition_uid,
        recorded_time: row.recorded_time,
        medication_item: medicationItem,
        product_name: productName,
        active_ingredient: activeIngredient,
        usage,
        valid_until: validUntil,
        instructions,
        issued_from: issuedFrom,
        // Structured fields derived from overall_directions_description
        dose_amount: doseAmountText || overallDirections || undefined,
        dose_unit: doseUnit,
        direction_duration: directionDuration,
        route,
        timing_directions: timing || overallDirections,
        additional_instruction: additionalInstruction || undefined,
        clinical_indication: clinicalIndication || undefined,
        comment: comment || undefined,
        prescribed_by: row.composer_name || "Unknown",
        status,
      });
    }

    return prescriptions;
  } catch (error) {
    console.error("Error fetching prescriptions via AQL:", error);
    return [];
  }
}

export async function getOpenEHRReferrals(
  ehrId: string
): Promise<ReferralRecord[]> {
  const compositions = await getOpenEHRCompositions(ehrId);

  const allReferrals = await Promise.all(
    compositions.map(async (comp) => {
      try {
        const fullComposition = await getOpenEHRComposition(
          ehrId,
          comp.composition_uid
        );

        const details = fullComposition as Record<string, unknown>;

        const description =
          (details[
            "template_clinical_encounter_v2/service_request/request/description"
          ] as string) || "";

        // Only keep SERVICE_REQUESTs created by the referrals API
        // (distinguished by description marker "REFERRAL_REQUEST")
        if (description !== "REFERRAL_REQUEST") {
          return null;
        }

        const narrative =
          (details[
            "template_clinical_encounter_v2/service_request/narrative"
          ] as string) || "";

        const physician_department =
          (details[
            "template_clinical_encounter_v2/service_request/request/receiving_provider"
          ] as string) || "";

        const receiving_physician =
          (details[
            "template_clinical_encounter_v2/service_request/request/service_name|other"
          ] as string) || undefined;

        const clinical_indication =
          (details[
            "template_clinical_encounter_v2/service_request/request/clinical_indication"
          ] as string) || "";

        const urgencyValue =
          (details[
            "template_clinical_encounter_v2/service_request/request/urgency|value"
          ] as string) || "Routine";

        const requesting_provider =
          (details[
            "template_clinical_encounter_v2/service_request/request/requesting_provider"
          ] as string) || "Unknown";

        const request_status_value =
          (details[
            "template_clinical_encounter_v2/service_request/request/request_status|value"
          ] as string) || "Requested";

        // Normalize urgency to "routine" | "urgent" for UI
        const urgencyText = urgencyValue.toLowerCase();
        const urgency = urgencyText === "urgent" ? "urgent" : "routine";

        const status = request_status_value;

        const referral: ReferralRecord = {
          composition_uid: comp.composition_uid,
          recorded_time: comp.start_time,
          physician_department,
          receiving_physician,
          clinical_indication,
          urgency,
          comment: narrative || undefined,
          referred_by: requesting_provider,
          status,
        };

        return referral;
      } catch (error) {
        console.error(
          `Failed to fetch or parse referral composition ${comp.composition_uid}:`,
          error
        );
        return null;
      }
    })
  );

  // Filter out non-referral compositions and nulls
  return allReferrals.filter((r): r is ReferralRecord => r !== null);
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

export async function updateOpenEHRComposition(
  ehrId: string,
  compositionId: string,
  templateId: string,
  compositionData: Record<string, unknown>
): Promise<string> {
  // Extract just the UUID part from versioned UID (format: uuid::domain::version)
  // OpenEHR API expects only the UUID in the URL path
  const compositionUuid = compositionId.split("::")[0];
  
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/ehr/${ehrId}/composition/${compositionUuid}`;
  try {
    const response = await axios.put(url, compositionData, {
      headers: {
        "X-API-Key": process.env.EHRBASE_API_KEY!,
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        Prefer: "return=representation",
        "If-Match": compositionId, // Use the full versioned UID for version matching
      },
      params: {
        format: "FLAT",
        templateId: templateId,
      },
    });
    
    // Handle different response formats
    if (response.data?.uid?.value) {
      return response.data.uid.value;
    } else if (response.data?._uid) {
      return response.data._uid;
    } else if (typeof response.data === 'string') {
      return response.data;
    }
    
    // If update succeeded but no UID in response, return the original compositionId
    return compositionId;
  } catch (error: unknown) {
    const err = error as { response?: { status?: unknown; data?: unknown } };
    console.error(
      "OpenEHR composition update error:",
      err.response?.status,
      err.response?.data
    );
    console.error("Request URL:", url);
    console.error("Request data:", JSON.stringify(compositionData, null, 2));
    throw error;
  }
}

export async function deleteOpenEHRComposition(
  ehrId: string,
  compositionUid: string
): Promise<void> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/ehr/${ehrId}/composition/${compositionUid}`;
  await axios.delete(url, {
    headers: {
      "X-API-Key": process.env.EHRBASE_API_KEY!,
      Authorization: `Basic ${basicAuth}`,
    },
  });
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

export async function getOpenEHREHRBySubjectId(
  subjectId: string
): Promise<string | null> {
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
  // Extract just the UUID part from versioned UID (format: uuid::domain::version)
  const compositionUuid = compositionId.split("::")[0];
  
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/ehr/${ehrId}/composition/${compositionUuid}?format=FLAT`;
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
 * @param templateId - The template ID to use (e.g., "template_clinical_encounter_v2")
 * @param compositionData - The composition data in FLAT format
 * @returns The created composition UID
 */
export async function createOpenEHRComposition(
  ehrId: string,
  templateId: string,
  compositionData: Record<string, unknown>
): Promise<string> {
  const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/ehr/${ehrId}/composition?format=FLAT&templateId=${templateId}`;

  console.log(
    "Creating composition with data:",
    JSON.stringify(compositionData, null, 2)
  );

  try {
    const startTime = Date.now();

    const response = await axios.post(url, compositionData, {
      headers: {
        "X-API-Key": process.env.EHRBASE_API_KEY!,
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        Prefer: "return=representation",
      },
      timeout: 30000, // 30 second timeout
    });

    const duration = Date.now() - startTime;
    console.log(`EHRBase composition created in ${duration}ms`);
    console.log(
      "EHRBase response structure:",
      JSON.stringify(response.data, null, 2)
    );

    // Handle different response formats from EHRBase
    let compositionId: string | undefined;

    if (response.data?.uid?.value) {
      compositionId = response.data.uid.value;
    } else if (response.data?.composition_uid) {
      compositionId = response.data.composition_uid;
    } else if (response.data?.uid) {
      compositionId = response.data.uid;
    } else if (typeof response.data === "string") {
      compositionId = response.data;
    } else {
      // EHRBase returns the composition in the response data itself
      // Look for _uid field in any of the template entries
      for (const [key, value] of Object.entries(response.data)) {
        if (key.endsWith("/_uid") && typeof value === "string") {
          compositionId = value;
          break;
        }
      }
    }

    if (!compositionId) {
      console.error(
        "Unexpected EHRBase response structure:",
        JSON.stringify(response.data, null, 2)
      );
      throw new Error("Unable to extract composition ID from EHRBase response");
    }

    console.log(`Successfully created composition with ID: ${compositionId}`);
    return compositionId;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED") {
        console.error("EHRBase request timed out after 30 seconds");
        throw new Error(
          "EHRBase server is taking too long to respond. Please try again."
        );
      }
      if (error.response) {
        console.error("EHRbase error response:", error.response.status);
        console.error(
          "EHRbase error data:",
          JSON.stringify(error.response.data, null, 2)
        );
      }
      if (error.response?.status === 500) {
        console.error(
          "EHRBase server error - possibly template validation issue"
        );
      }
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
