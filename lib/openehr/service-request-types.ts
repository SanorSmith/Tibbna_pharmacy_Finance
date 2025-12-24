/**
 * Centralized Service Request Type Markers
 * Used to distinguish different types of service requests in OpenEHR compositions
 */

export const SERVICE_REQUEST_MARKERS = {
  REFERRAL: "REFERRAL_REQUEST",
  PROCEDURE: "PROCEDURE_REQUEST",
  TEST_ORDER: "TEST_ORDER_REQUEST",
  IMAGING: "IMAGING_REQUEST",
  CONSULTATION: "CONSULTATION_REQUEST",
  LAB_TEST: "LAB_TEST_REQUEST",
} as const;

export type ServiceRequestMarker = typeof SERVICE_REQUEST_MARKERS[keyof typeof SERVICE_REQUEST_MARKERS];

/**
 * Helper to check if a composition is a specific service request type
 */
export function isServiceRequestType(
  description: string | undefined,
  type: ServiceRequestMarker
): boolean {
  return description === type;
}

/**
 * Get human-readable name for a service request marker
 */
export function getServiceRequestTypeName(marker: ServiceRequestMarker): string {
  const names: Record<ServiceRequestMarker, string> = {
    [SERVICE_REQUEST_MARKERS.REFERRAL]: "Referral",
    [SERVICE_REQUEST_MARKERS.PROCEDURE]: "Surgical Procedure",
    [SERVICE_REQUEST_MARKERS.TEST_ORDER]: "Test Order",
    [SERVICE_REQUEST_MARKERS.IMAGING]: "Imaging Request",
    [SERVICE_REQUEST_MARKERS.CONSULTATION]: "Consultation",
    [SERVICE_REQUEST_MARKERS.LAB_TEST]: "Laboratory Test",
  };
  return names[marker] || "Unknown Request";
}
