// Re-export all functions and types from openehr.ts
export {
  queryOpenEHR,
  getOpenEHRTemplates,
  createOpenEHREHR,
  updateOpenEHREHR,
  getOpenEHREHRs,
  getOpenEHREHRBySubjectId,
  getOpenEHRCompositions,
  getOpenEHRComposition,
} from "./openehr";

// Re-export types
export type {
  OpenEHRCompositionResponse,
  OpenEHRAAQLResponse,
  OpenEHREHRResponse,
  OpenEHRCompositionsResponse,
  OpenEHRTemplateResponse,
  OpenEHREHRNewRequest,
} from "./openehr";

// Re-export from encounter.ts
export * from "./encounter";

// Re-export from radiology.ts
export * from "./radiology";

// Re-export from careplan.ts
export * from "./careplan";

// Re-export from laboratory.ts
export * from "./laboratory";

// Re-export from referral.ts
export * from "./referral";

// Re-export from vaccination.ts
export * from "./vaccination";

// Re-export from clinical-notes.ts
export * from "./clinical-notes";
