/**
 * OpenEHR Order Status Utilities
 * 
 * Computes order status for OpenEHR orders based on sample validation states
 * Since OpenEHR orders don't exist in lims_orders table, status is derived from samples
 */

import { db } from "@/lib/db";
import { accessionSamples, validationStates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type OpenEHROrderStatus = "REQUESTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

/**
 * Get the status of an OpenEHR order based on its samples' statuses and validation states
 * 
 * @param openehrrequestid - The OpenEHR request ID
 * @returns The computed order status
 */
export async function getOpenEHROrderStatus(openehrrequestid: string): Promise<OpenEHROrderStatus> {
  // Get all samples for this OpenEHR request
  const samples = await db
    .select()
    .from(accessionSamples)
    .where(eq(accessionSamples.openehrrequestid, openehrrequestid));

  if (samples.length === 0) {
    return "REQUESTED";
  }

  // Check both sample status and validation state for each sample
  let analyzedCount = 0;
  let inProgressCount = 0;
  let receivedCount = 0;

  for (const sample of samples) {
    const sampleStatus = sample.currentstatus;
    
    // Check if sample is ANALYZED (results released)
    if (sampleStatus === "ANALYZED") {
      analyzedCount++;
      continue;
    }
    
    // Check if sample is IN_PROCESS (being tested)
    if (sampleStatus === "IN_PROCESS") {
      inProgressCount++;
      continue;
    }
    
    // Check if sample is RECEIVED or IN_STORAGE (collected but not started)
    if (sampleStatus === "RECEIVED" || sampleStatus === "IN_STORAGE") {
      receivedCount++;
      continue;
    }
    
    // Also check validation state as fallback
    const validationState = await db
      .select()
      .from(validationStates)
      .where(eq(validationStates.sampleid, sample.sampleid))
      .limit(1);

    if (validationState.length > 0) {
      const state = validationState[0].currentstate;
      
      if (state === "RELEASED") {
        analyzedCount++;
      } else if (state === "TECH_VALIDATED" || state === "CLINICALLY_VALIDATED" || state === "PENDING_VALIDATION") {
        inProgressCount++;
      }
    }
  }

  // Determine overall status based on sample states
  if (analyzedCount === samples.length) {
    // All samples have released results
    return "COMPLETED";
  } else if (analyzedCount > 0 || inProgressCount > 0) {
    // Some samples are being processed or have results
    return "IN_PROGRESS";
  } else if (receivedCount > 0) {
    // Samples collected but not yet started processing
    // This should show as IN_PROGRESS since samples exist
    return "IN_PROGRESS";
  } else {
    // No samples or unknown state
    return "REQUESTED";
  }
}

/**
 * Get status for multiple OpenEHR orders
 * 
 * @param openehrrequestids - Array of OpenEHR request IDs
 * @returns Map of request ID to status
 */
export async function getOpenEHROrderStatuses(
  openehrrequestids: string[]
): Promise<Map<string, OpenEHROrderStatus>> {
  const statusMap = new Map<string, OpenEHROrderStatus>();

  for (const requestId of openehrrequestids) {
    const status = await getOpenEHROrderStatus(requestId);
    statusMap.set(requestId, status);
  }

  return statusMap;
}

/**
 * Update OpenEHR order status in the composition (via API call)
 * This would be called when all samples are analyzed
 * 
 * @param openehrrequestid - The OpenEHR request ID
 * @param status - The new status
 */
export async function updateOpenEHROrderStatusInComposition(
  openehrrequestid: string,
  status: OpenEHROrderStatus
): Promise<void> {
  // TODO: Implement OpenEHR API call to update the order/request status
  // This would involve:
  // 1. Fetching the composition from OpenEHR
  // 2. Updating the order status in the composition
  // 3. Committing the updated composition back to OpenEHR
  
  console.log(`📋 OpenEHR order ${openehrrequestid} status should be updated to: ${status}`);
  console.log("⚠️ OpenEHR API integration not yet implemented");
}
