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
 * Create openEHR composition for lab order
 */
export function createLabOrderComposition(
  order: LimsOrder,
  testNames: string[],
  providerName: string
): OpenEHRLabOrderComposition {
  return {
    _type: "COMPOSITION",
    name: {
      _type: "DV_TEXT",
      value: "Laboratory Test Request",
    },
    archetype_details: {
      archetype_id: {
        value: "openEHR-EHR-COMPOSITION.request.v1",
      },
    },
    language: {
      terminology_id: { value: "ISO_639-1" },
      code_string: "en",
    },
    territory: {
      terminology_id: { value: "ISO_3166-1" },
      code_string: "US",
    },
    category: {
      value: "event",
      defining_code: {
        terminology_id: { value: "openehr" },
        code_string: "433",
      },
    },
    composer: {
      _type: "PARTY_IDENTIFIED",
      name: providerName || "Unknown Provider",
    },
    context: {
      _type: "EVENT_CONTEXT",
      start_time: {
        _type: "DV_DATE_TIME",
        value: order.createdat.toISOString(),
      },
      setting: {
        value: "laboratory",
        defining_code: {
          terminology_id: { value: "openehr" },
          code_string: "234",
        },
      },
    },
    content: [
      {
        _type: "INSTRUCTION",
        name: {
          _type: "DV_TEXT",
          value: "Laboratory Test Request",
        },
        archetype_details: {
          archetype_id: {
            value: "openEHR-EHR-INSTRUCTION.request-lab_test.v1",
          },
        },
        activities: [
          {
            _type: "ACTIVITY",
            name: {
              _type: "DV_TEXT",
              value: "Request",
            },
            description: {
              _type: "ITEM_TREE",
              items: [
                {
                  _type: "ELEMENT",
                  name: {
                    _type: "DV_TEXT",
                    value: "Service requested",
                  },
                  value: {
                    _type: "DV_TEXT",
                    value: testNames.join(", "),
                  },
                },
                {
                  _type: "ELEMENT",
                  name: {
                    _type: "DV_TEXT",
                    value: "Request ID",
                  },
                  value: {
                    _type: "DV_IDENTIFIER",
                    value: order.orderid,
                  },
                },
                {
                  _type: "ELEMENT",
                  name: {
                    _type: "DV_TEXT",
                    value: "Priority",
                  },
                  value: {
                    _type: "DV_CODED_TEXT",
                    value: order.priority,
                    defining_code: {
                      terminology_id: { value: "local" },
                      code_string: order.priority,
                    },
                  },
                },
                ...(order.clinicalindication
                  ? [
                      {
                        _type: "ELEMENT" as const,
                        name: {
                          _type: "DV_TEXT" as const,
                          value: "Clinical indication",
                        },
                        value: {
                          _type: "DV_TEXT" as const,
                          value: order.clinicalindication,
                        },
                      },
                    ]
                  : []),
              ],
            },
          },
        ],
      },
    ],
  };
}

/**
 * Submit composition to openEHR server
 * This is a stub - in production, this would call the actual openEHR REST API
 */
export async function submitCompositionToOpenEHR(
  ehrId: string,
  composition: OpenEHRLabOrderComposition
): Promise<{ compositionUid: string; timeCommitted: Date }> {
  // In production, this would be:
  // POST /ehr/{ehrId}/composition
  // with the composition as the request body
  
  // For now, return a mock response
  const compositionUid = `${crypto.randomUUID()}::local.ehrbase.org::1`;
  const timeCommitted = new Date();
  
  console.log("openEHR composition created:", {
    ehrId,
    compositionUid,
    timeCommitted,
    composition: JSON.stringify(composition, null, 2),
  });
  
  return {
    compositionUid,
    timeCommitted,
  };
}

/**
 * Create lab order composition and submit to openEHR
 */
export async function createAndSubmitLabOrder(
  order: LimsOrder,
  testNames: string[],
  providerName: string,
  ehrId?: string
): Promise<{ compositionUid: string; timeCommitted: Date } | null> {
  // If no EHR ID provided, skip openEHR integration
  if (!ehrId) {
    console.log("No EHR ID provided, skipping openEHR composition creation");
    return null;
  }
  
  try {
    // Create composition
    const composition = createLabOrderComposition(order, testNames, providerName);
    
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
