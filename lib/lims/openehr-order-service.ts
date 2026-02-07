/**
 * openEHR Order Service
 * 
 * Handles creation of openEHR compositions for lab test orders
 * Maps LIMS orders to openEHR-EHR-INSTRUCTION.request-lab-test.v1
 */

import { LimsOrder } from "@/lib/db/schema";

/**
 * openEHR Composition for Lab Order
 * Based on openEHR-EHR-INSTRUCTION.request-lab-test.v1
 */
export interface OpenEHRLabOrderComposition {
  _type: "COMPOSITION";
  archetype_node_id: string;
  name: {
    _type: "DV_TEXT";
    value: string;
  };
  archetype_details: {
    archetype_id: {
      value: string;
    };
  };
  language: {
    terminology_id: { value: string };
    code_string: string;
  };
  territory: {
    terminology_id: { value: string };
    code_string: string;
  };
  category: {
    value: string;
    defining_code: {
      terminology_id: { value: string };
      code_string: string;
    };
  };
  composer: {
    _type: "PARTY_IDENTIFIED";
    name: string;
  };
  context: {
    _type: "EVENT_CONTEXT";
    start_time: {
      _type: "DV_DATE_TIME";
      value: string;
    };
    setting: {
      value: string;
      defining_code: {
        terminology_id: { value: string };
        code_string: string;
      };
    };
  };
  content: Array<{
    _type: "INSTRUCTION";
    name: {
      _type: "DV_TEXT";
      value: string;
    };
    archetype_details: {
      archetype_id: {
        value: string;
      };
    };
    activities: Array<{
      _type: "ACTIVITY";
      name: {
        _type: "DV_TEXT";
        value: string;
      };
      description: {
        _type: "ITEM_TREE";
        items: Array<{
          _type: "ELEMENT";
          name: {
            _type: "DV_TEXT";
            value: string;
          };
          value: {
            _type: string;
            value?: string;
            magnitude?: number;
            units?: string;
            defining_code?: {
              terminology_id: { value: string };
              code_string: string;
            };
          };
        }>;
      };
    }>;
  }>;
}

/**
 * Create openEHR composition for lab order using FLAT format
 */
export function createLabOrderComposition(
  order: LimsOrder,
  testNames: string[],
  providerName: string,
  metadata?: { category?: string; labName?: string }
): any {
  const eventTime = order.createdat.toISOString();
  const serviceName = testNames.join(", ");
  const category = metadata?.category || "";
  const labName = metadata?.labName || "Laboratory";
  // Build structured description matching Patient Dashboard format so the parser can extract Category/Laboratory
  const description = `Status: REQUESTED | Category: ${category || "General"} | Laboratory: ${labName} | Selected Tests (${testNames.length}): ${serviceName}${order.clinicalnotes ? ` | Notes: ${order.clinicalnotes}` : ''} | Urgency: ${order.priority || 'routine'}`;
  const clinicalIndication = order.clinicalindication || "";
  const narrative = `${serviceName} ordered${clinicalIndication ? ` due to ${clinicalIndication}` : ''}`;

  return {
    "template_clinical_encounter_v1/language|code": "en",
    "template_clinical_encounter_v1/language|terminology": "ISO_639-1",
    "template_clinical_encounter_v1/territory|code": "US",
    "template_clinical_encounter_v1/territory|terminology": "ISO_3166-1",
    "template_clinical_encounter_v1/composer|name": providerName || "Unknown",
    "template_clinical_encounter_v1/context/start_time": eventTime,
    "template_clinical_encounter_v1/context/setting|code": "238",
    "template_clinical_encounter_v1/context/setting|value": "other care",
    "template_clinical_encounter_v1/context/setting|terminology": "openehr",
    "template_clinical_encounter_v1/category|code": "433",
    "template_clinical_encounter_v1/category|value": "event",
    "template_clinical_encounter_v1/category|terminology": "openehr",

    // Service request for lab order
    "template_clinical_encounter_v1/service_request/request/service_name|other": serviceName,
    "template_clinical_encounter_v1/service_request/request/description": description,
    "template_clinical_encounter_v1/service_request/request/clinical_indication": clinicalIndication,
    "template_clinical_encounter_v1/service_request/request/requested_date": eventTime,
    "template_clinical_encounter_v1/service_request/request/requesting_provider": providerName || "Unknown",
    "template_clinical_encounter_v1/service_request/request/receiving_provider": labName,
    "template_clinical_encounter_v1/service_request/request/timing": eventTime,
    "template_clinical_encounter_v1/service_request/request_id": order.orderid,
    "template_clinical_encounter_v1/service_request/narrative": narrative,
    "template_clinical_encounter_v1/service_request/language|code": "en",
    "template_clinical_encounter_v1/service_request/language|terminology": "ISO_639-1",
    "template_clinical_encounter_v1/service_request/encoding|code": "UTF-8",
    "template_clinical_encounter_v1/service_request/encoding|terminology": "IANA_character-sets",
  };
}

/**
 * Submit composition to openEHR server
 * Creates the lab order composition in OpenEHR using FLAT format
 */
export async function submitCompositionToOpenEHR(
  ehrId: string,
  composition: any
): Promise<{ compositionUid: string; timeCommitted: Date }> {
  try {
    const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/ehr/${ehrId}/composition?format=FLAT&templateId=template_clinical_encounter_v1`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.EHRBASE_API_KEY!,
        'Authorization': `Basic ${Buffer.from(`${process.env.EHRBASE_USER}:${process.env.EHRBASE_PASSWORD}`).toString('base64')}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(composition),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to submit composition to OpenEHR: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    const compositionUid = result.compositionUid || result.uid?.value;
    const timeCommitted = new Date();

    console.log("openEHR composition created successfully:", {
      ehrId,
      compositionUid,
      timeCommitted,
    });

    return {
      compositionUid,
      timeCommitted,
    };
  } catch (error) {
    console.error("Error submitting composition to OpenEHR:", error);
    throw error;
  }
}

/**
 * Create lab order composition and submit to openEHR
 */
export async function createAndSubmitLabOrder(
  order: LimsOrder,
  testNames: string[],
  providerName: string,
  ehrId?: string,
  metadata?: { category?: string; labName?: string }
): Promise<{ compositionUid: string; timeCommitted: Date } | null> {
  // If no EHR ID provided, skip openEHR integration
  if (!ehrId) {
    console.log("No EHR ID provided, skipping openEHR composition creation");
    return null;
  }
  
  try {
    // Create composition
    const composition = createLabOrderComposition(order, testNames, providerName, metadata);
    
    // Submit to openEHR
    const result = await submitCompositionToOpenEHR(ehrId, composition);
    
    return result;
  } catch (error) {
    console.error("Failed to create openEHR composition:", error);
    // Don't fail the order creation if openEHR integration fails
    // Log the error and continue
    return null;
  }
}
