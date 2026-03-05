/**
 * LIMS Order Validation Layer
 * 
 * Implements strict server-side validation using Zod
 * Following healthcare standards and business rules
 */

import { z } from "zod";
import { ORDER_PRIORITY, SUBJECT_TYPE } from "@/lib/db/schema";

/**
 * Order Creation Schema
 * Validates incoming order requests
 */
export const createOrderSchema = z.object({
  // Subject information (required)
  subjectType: z.enum([SUBJECT_TYPE.PATIENT, SUBJECT_TYPE.RESEARCH_SUBJECT]),
  subjectIdentifier: z.string().min(1, "Subject identifier is required"),
  
  // Clinical context (conditional)
  encounterId: z.string().optional(),
  studyProtocolId: z.string().optional(),
  
  // Requested tests (required, at least one)
  requestedTests: z.array(z.string()).min(1, "At least one test must be requested"),
  
  // Priority (required)
  priority: z.enum([ORDER_PRIORITY.ROUTINE, ORDER_PRIORITY.URGENT, ORDER_PRIORITY.STAT, ORDER_PRIORITY.ASAP]),
  
  // Ordering provider (required)
  orderingProviderId: z.string().uuid("Invalid ordering provider ID"),
  orderingProviderName: z.string().optional(),
  
  // Clinical information
  clinicalIndication: z.string().optional(),
  clinicalNotes: z.string().optional(),
  
  // STAT justification (required for STAT orders)
  statJustification: z.string().optional(),
  
  // Source system
  sourceSystem: z.string().default("LIMS_UI"),
  
  // openEHR/FHIR integration
  ehrId: z.string().optional(),
  fhirServiceRequestId: z.string().optional(),
  
  // Workspace
  workspaceId: z.string().min(1, "Workspace ID is required"),
}).refine(
  (data) => {
    // If subject type is patient, encounterId should be provided
    if (data.subjectType === SUBJECT_TYPE.PATIENT && !data.encounterId) {
      return false;
    }
    return true;
  },
  {
    message: "Encounter ID is required for patient orders",
    path: ["encounterId"],
  }
).refine(
  (data) => {
    // If subject type is research_subject, studyProtocolId is required
    if (data.subjectType === SUBJECT_TYPE.RESEARCH_SUBJECT && !data.studyProtocolId) {
      return false;
    }
    return true;
  },
  {
    message: "Study Protocol ID is required for research orders",
    path: ["studyProtocolId"],
  }
).refine(
  (data) => {
    // STAT orders require justification
    if (data.priority === ORDER_PRIORITY.STAT && !data.statJustification) {
      return false;
    }
    return true;
  },
  {
    message: "STAT orders require justification",
    path: ["statJustification"],
  }
);

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * FHIR ServiceRequest Schema
 * Validates incoming FHIR ServiceRequest resources
 */
export const fhirServiceRequestSchema = z.object({
  resourceType: z.literal("ServiceRequest"),
  id: z.string().optional(),
  status: z.enum(["draft", "active", "on-hold", "revoked", "completed", "entered-in-error", "unknown"]),
  intent: z.enum(["proposal", "plan", "directive", "order", "original-order", "reflex-order", "filler-order", "instance-order", "option"]),
  priority: z.enum(["routine", "urgent", "asap", "stat"]).optional(),
  code: z.object({
    coding: z.array(z.object({
      system: z.string(),
      code: z.string(),
      display: z.string().optional(),
    })),
    text: z.string().optional(),
  }),
  subject: z.object({
    reference: z.string(),
    display: z.string().optional(),
  }),
  encounter: z.object({
    reference: z.string(),
  }).optional(),
  authoredOn: z.string().optional(),
  requester: z.object({
    reference: z.string(),
    display: z.string().optional(),
  }).optional(),
  reasonCode: z.array(z.object({
    coding: z.array(z.object({
      system: z.string(),
      code: z.string(),
      display: z.string().optional(),
    })),
    text: z.string().optional(),
  })).optional(),
  note: z.array(z.object({
    text: z.string(),
  })).optional(),
});

export type FHIRServiceRequest = z.infer<typeof fhirServiceRequestSchema>;

/**
 * Validation Error Response
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate order creation data
 */
export function validateOrderCreation(data: unknown): {
  success: boolean;
  data?: CreateOrderInput;
  errors?: ValidationError[];
} {
  try {
    const validated = createOrderSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.issues.map((err: z.ZodIssue) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return { success: false, errors };
    }
    return {
      success: false,
      errors: [{ field: "unknown", message: "Validation failed" }],
    };
  }
}

/**
 * Validate FHIR ServiceRequest
 */
export function validateFHIRServiceRequest(data: unknown): {
  success: boolean;
  data?: FHIRServiceRequest;
  errors?: ValidationError[];
} {
  try {
    const validated = fhirServiceRequestSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.issues.map((err: z.ZodIssue) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return { success: false, errors };
    }
    return {
      success: false,
      errors: [{ field: "unknown", message: "FHIR validation failed" }],
    };
  }
}

/**
 * Convert FHIR ServiceRequest to internal order format
 */
export function convertFHIRToOrder(fhir: FHIRServiceRequest, workspaceId: string): Partial<CreateOrderInput> {
  // Extract priority
  const priorityMap: Record<string, typeof ORDER_PRIORITY[keyof typeof ORDER_PRIORITY]> = {
    routine: ORDER_PRIORITY.ROUTINE,
    urgent: ORDER_PRIORITY.URGENT,
    asap: ORDER_PRIORITY.ASAP,
    stat: ORDER_PRIORITY.STAT,
  };
  
  const priority = fhir.priority ? priorityMap[fhir.priority] : ORDER_PRIORITY.ROUTINE;
  
  // Extract subject identifier from reference
  const subjectIdentifier = fhir.subject.reference.split("/").pop() || "";
  
  // Extract test codes from coding
  const requestedTests = fhir.code.coding.map((coding) => coding.code);
  
  // Extract clinical indication from reasonCode
  const clinicalIndication = fhir.reasonCode?.[0]?.text || fhir.reasonCode?.[0]?.coding[0]?.display;
  
  // Extract notes
  const clinicalNotes = fhir.note?.map((n) => n.text).join("; ");
  
  // Extract encounter ID
  const encounterId = fhir.encounter?.reference.split("/").pop();
  
  // Extract requester
  const orderingProviderId = fhir.requester?.reference.split("/").pop() || "";
  const orderingProviderName = fhir.requester?.display;
  
  return {
    subjectType: SUBJECT_TYPE.PATIENT, // Default to patient for FHIR
    subjectIdentifier,
    requestedTests,
    priority,
    clinicalIndication,
    clinicalNotes,
    encounterId,
    orderingProviderId,
    orderingProviderName,
    sourceSystem: "FHIR",
    fhirServiceRequestId: fhir.id,
    workspaceId,
  };
}

/**
 * Business rule: Check if user has permission to create order
 */
export function checkOrderPermission(
  userRole: string,
  subjectType: string
): { allowed: boolean; reason?: string } {
  // Clinicians can create clinical orders
  if (userRole === "clinician" && subjectType === SUBJECT_TYPE.PATIENT) {
    return { allowed: true };
  }
  
  // Researchers can create research orders
  if (userRole === "researcher" && subjectType === SUBJECT_TYPE.RESEARCH_SUBJECT) {
    return { allowed: true };
  }
  
  // System/Admin can create any order
  if (userRole === "admin" || userRole === "system") {
    return { allowed: true };
  }
  
  return {
    allowed: false,
    reason: `Role '${userRole}' is not authorized to create '${subjectType}' orders`,
  };
}
