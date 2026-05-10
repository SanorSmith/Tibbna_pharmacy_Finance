/**
 * OpenEHR Medication Summary Template Interface
 * 
 * Template ID: template_medication_summary_v1
 * Archetype: openEHR-EHR-COMPOSITION.medication_summary.v1
 */

export interface MedicationSummaryComposition {
  // Composition metadata
  "template_medication_summary_v1/category|code": string;
  "template_medication_summary_v1/category|terminology": string;
  "template_medication_summary_v1/category|value": string;

  // Context
  "template_medication_summary_v1/context/start_time": string;
  "template_medication_summary_v1/context/setting|code": string;
  "template_medication_summary_v1/context/setting|terminology": string;
  "template_medication_summary_v1/context/setting|value": string;
  "template_medication_summary_v1/context/_end_time"?: string;

  // Composer
  "template_medication_summary_v1/composer|name": string;

  // Language and encoding
  "template_medication_summary_v1/language|code": string;
  "template_medication_summary_v1/language|terminology": string;
  "template_medication_summary_v1/encoding|code": string;
  "template_medication_summary_v1/encoding|terminology": string;

  // Dynamic medication fields (using index signature)
  [key: string]: string | number | undefined;
}

/**
 * Medication Status Codes
 */
export const MEDICATION_STATUS_CODES = {
  ACTIVE: "at0004",
  SUSPENDED: "at0005",
  CANCELLED: "at0006",
  COMPLETED: "at0007",
  PROPOSED: "at0008",
  UNKNOWN: "at0009",
} as const;

/**
 * Interface for individual medication item
 */
export interface MedicationItem {
  medicationName: string;
  doseAmount?: number;
  doseUnit?: string;
  route: string;
  frequency: string;
  duration: string;
  clinicalIndication: string;
  prescribingReason: string;
  dateStarted: string;
  dateStopped?: string;
  status: keyof typeof MEDICATION_STATUS_CODES;
  comment?: string;
}

/**
 * Helper function to create a medication summary composition
 */
export function createMedicationSummaryComposition(params: {
  medications: MedicationItem[];
  composerName: string;
  endTime?: string;
}): MedicationSummaryComposition {
  const now = new Date().toISOString();
  
  const composition: MedicationSummaryComposition = {
    // Composition metadata
    "template_medication_summary_v1/category|code": "433",
    "template_medication_summary_v1/category|terminology": "openehr",
    "template_medication_summary_v1/category|value": "event",

    // Context
    "template_medication_summary_v1/context/start_time": now,
    "template_medication_summary_v1/context/setting|code": "228",
    "template_medication_summary_v1/context/setting|terminology": "openehr",
    "template_medication_summary_v1/context/setting|value": "other care",
    "template_medication_summary_v1/context/_end_time": params.endTime,

    // Composer
    "template_medication_summary_v1/composer|name": params.composerName,

    // Language and encoding
    "template_medication_summary_v1/language|code": "en",
    "template_medication_summary_v1/language|terminology": "ISO_639-1",
    "template_medication_summary_v1/encoding|code": "UTF-8",
    "template_medication_summary_v1/encoding|terminology": "IANA_character-sets",
  };

  // Add medications to composition
  params.medications.forEach((med, index) => {
    const prefix = `template_medication_summary_v1/medication_list/medication_item:${index}`;
    composition[`${prefix}/medication_name`] = med.medicationName;
    composition[`${prefix}/route`] = med.route;
    composition[`${prefix}/frequency`] = med.frequency;
    composition[`${prefix}/duration`] = med.duration;
    composition[`${prefix}/clinical_indication`] = med.clinicalIndication;
    composition[`${prefix}/prescribing_reason`] = med.prescribingReason;
    composition[`${prefix}/date_started`] = med.dateStarted;
    composition[`${prefix}/status|code`] = MEDICATION_STATUS_CODES[med.status];
    composition[`${prefix}/status|terminology`] = "openehr";
    composition[`${prefix}/status|value`] = med.status.toLowerCase();
    composition[`${prefix}/comment`] = med.comment || "";

    if (med.doseAmount !== undefined) {
      composition[`${prefix}/dose_amount|magnitude`] = med.doseAmount;
    }
    if (med.doseUnit) {
      composition[`${prefix}/dose_amount|unit`] = med.doseUnit;
    }
    if (med.dateStopped) {
      composition[`${prefix}/date_stopped`] = med.dateStopped;
    }
  });

  return composition;
}
