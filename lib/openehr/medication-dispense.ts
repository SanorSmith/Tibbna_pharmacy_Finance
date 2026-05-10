/**
 * OpenEHR Medication Dispense Template Interface
 * 
 * Template ID: template_medication_dispense_v1
 * Archetype: openEHR-EHR-ACTION.medication_dispense.v1
 */

export interface MedicationDispenseComposition {
  // Composition metadata
  "template_medication_dispense_v1/category|code": string;
  "template_medication_dispense_v1/category|terminology": string;
  "template_medication_dispense_v1/category|value": string;

  // Context
  "template_medication_dispense_v1/context/start_time": string;
  "template_medication_dispense_v1/context/setting|code": string;
  "template_medication_dispense_v1/context/setting|terminology": string;
  "template_medication_dispense_v1/context/setting|value": string;

  // Medication Action - Core fields
  "template_medication_dispense_v1/medication_action/action_state|code": string;
  "template_medication_dispense_v1/action_state|terminology": string;
  "template_medication_dispense_v1/action_state|value": string;
  "template_medication_dispense_v1/medication_action/medication_item": string;
  "template_medication_dispense_v1/medication_action/route:0": string;

  // Quantity and Amount
  "template_medication_dispense_v1/medication_action/amount/quantity_dispensed|magnitude": number;
  "template_medication_dispense_v1/medication_action/amount/quantity_dispensed|unit": string;

  // Batch and Expiry
  "template_medication_dispense_v1/medication_action/batch_number": string;
  "template_medication_dispense_v1/medication_action/expiry_date": string;

  // Substitution
  "template_medication_dispense_v1/medication_action/substitution/substitution_performed|code": string;
  "template_medication_dispense_v1/medication_action/substitution/substitution_performed|terminology": string;
  "template_medication_dispense_v1/medication_action/substitution/substitution_performed|value": string;
  "template_medication_dispense_v1/medication_action/substitution/substitution_reason": string;

  // Additional fields
  "template_medication_dispense_v1/medication_action/comment": string;
  "template_medication_dispense_v1/medication_action/timing": string;

  // Composer
  "template_medication_dispense_v1/composer|name": string;

  // Language and encoding
  "template_medication_dispense_v1/language|code": string;
  "template_medication_dispense_v1/language|terminology": string;
  "template_medication_dispense_v1/encoding|code": string;
  "template_medication_dispense_v1/encoding|terminology": string;
  
  // Index signature for compatibility
  [key: string]: string | number;
}

/**
 * Action State Codes for Medication Dispense
 */
export const MEDICATION_DISPENSE_ACTION_STATES = {
  PRESCRIPTION_ISSUED: "at0002",
  PRESCRIPTION_DISPENSED: "at0003", 
  MEDICATION_COURSE_COMMENCED: "at0004",
  MEDICATION_REASSESSED: "at0005",
  DOSE_ADMINISTERED: "at0006",
  MEDICATION_COURSE_COMPLETED: "at0007",
  PRESCRIPTION_SUPPLY_DELAYED: "at0008",
  ADMINISTRATIONS_SUSPENDED: "at0009",
} as const;

/**
 * Substitution Codes
 */
export const SUBSTITUTION_CODES = {
  SUBSTITUTION_PERFORMED: "at0138",
  SUBSTITUTION_NOT_PERFORMED: "at0139",
} as const;

/**
 * Helper function to create a medication dispense composition
 */
export function createMedicationDispenseComposition(params: {
  medicationItem: string;
  quantityDispensed: number;
  quantityUnit: string;
  batchNumber: string;
  expiryDate: string;
  route: string;
  substitutionPerformed: keyof typeof SUBSTITUTION_CODES;
  substitutionReason?: string;
  actionState: keyof typeof MEDICATION_DISPENSE_ACTION_STATES;
  comment?: string;
  timing?: string;
  composerName: string;
}): MedicationDispenseComposition {
  const now = new Date().toISOString();
  
  return {
    // Composition metadata
    "template_medication_dispense_v1/category|code": "433",
    "template_medication_dispense_v1/category|terminology": "openehr",
    "template_medication_dispense_v1/category|value": "event",

    // Context
    "template_medication_dispense_v1/context/start_time": now,
    "template_medication_dispense_v1/context/setting|code": "228",
    "template_medication_dispense_v1/context/setting|terminology": "openehr",
    "template_medication_dispense_v1/context/setting|value": "other care",

    // Medication Action
    "template_medication_dispense_v1/medication_action/action_state|code": MEDICATION_DISPENSE_ACTION_STATES[params.actionState],
    "template_medication_dispense_v1/action_state|terminology": "openehr",
    "template_medication_dispense_v1/action_state|value": params.actionState.replace(/_/g, ' ').toLowerCase(),
    "template_medication_dispense_v1/medication_action/medication_item": params.medicationItem,
    "template_medication_dispense_v1/medication_action/route:0": params.route,

    // Quantity and Amount
    "template_medication_dispense_v1/medication_action/amount/quantity_dispensed|magnitude": params.quantityDispensed,
    "template_medication_dispense_v1/medication_action/amount/quantity_dispensed|unit": params.quantityUnit,

    // Batch and Expiry
    "template_medication_dispense_v1/medication_action/batch_number": params.batchNumber,
    "template_medication_dispense_v1/medication_action/expiry_date": params.expiryDate,

    // Substitution
    "template_medication_dispense_v1/medication_action/substitution/substitution_performed|code": SUBSTITUTION_CODES[params.substitutionPerformed],
    "template_medication_dispense_v1/medication_action/substitution/substitution_performed|terminology": "openehr",
    "template_medication_dispense_v1/medication_action/substitution/substitution_performed|value": params.substitutionPerformed.replace(/_/g, ' ').toLowerCase(),
    "template_medication_dispense_v1/medication_action/substitution/substitution_reason": params.substitutionReason || "",

    // Additional fields
    "template_medication_dispense_v1/medication_action/comment": params.comment || "",
    "template_medication_dispense_v1/medication_action/timing": params.timing || "",

    // Composer
    "template_medication_dispense_v1/composer|name": params.composerName,

    // Language and encoding
    "template_medication_dispense_v1/language|code": "en",
    "template_medication_dispense_v1/language|terminology": "ISO_639-1",
    "template_medication_dispense_v1/encoding|code": "UTF-8",
    "template_medication_dispense_v1/encoding|terminology": "IANA_character-sets",
  };
}
