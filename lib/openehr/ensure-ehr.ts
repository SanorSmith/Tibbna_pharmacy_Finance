/**
 * Ensure patient has a valid EHR in OpenEHR
 * If patient.ehrid exists in database but not in OpenEHR, create EHR with same ID
 * If patient has no ehrid, create a new one and update database
 */

import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getOpenEHREHRBySubjectId, createOpenEHREHR, checkEHRExists } from "./openehr";

export interface EnsureEHROptions {
  /**
   * Force recreate EHR even if it exists
   */
  forceRecreate?: boolean;
  /**
   * Subject ID to use when creating new EHR (defaults to patient.nationalid or patient.patientid)
   */
  subjectId?: string;
}

/**
 * Ensure patient has a valid EHR in OpenEHR
 * 
 * @param patientId - Patient UUID from database
 * @param options - Optional configuration
 * @returns The valid EHR ID
 */
export async function ensurePatientEHR(
  patientId: string,
  options: EnsureEHROptions = {}
): Promise<string> {
  const { forceRecreate = false, subjectId } = options;

  // 1. Get patient from database
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.patientid, patientId))
    .limit(1);

  if (!patient) {
    throw new Error(`Patient ${patientId} not found in database`);
  }

  console.log(`[EnsureEHR] Processing patient: ${patient.firstname} ${patient.lastname}`);
  console.log(`[EnsureEHR] Database EHR ID: ${patient.ehrid || 'NULL'}`);
  console.log(`[EnsureEHR] National ID: ${patient.nationalid || 'NULL'}`);

  let ehrId: string | null = null;

  // 2. If patient has stored ehrid, check if it exists in OpenEHR by direct EHR lookup
  if (patient.ehrid && !forceRecreate) {
    try {
      console.log(`[EnsureEHR] Checking if EHR exists in OpenEHR: ${patient.ehrid}`);
      
      // Check if EHR exists by making a direct request to the EHR endpoint
      // This is more reliable than searching by subject ID
      const ehrExists = await checkEHRExists(patient.ehrid);
      
      if (ehrExists) {
        console.log(`[EnsureEHR] ✅ EHR exists in OpenEHR: ${patient.ehrid}`);
        return patient.ehrid;
      } else {
        console.log(`[EnsureEHR] ❌ EHR not found in OpenEHR: ${patient.ehrid}`);
        console.log(`[EnsureEHR] Will create new EHR`);
      }
    } catch (error) {
      console.log(`[EnsureEHR] ❌ Error checking EHR existence: ${error}`);
      console.log(`[EnsureEHR] Will create new EHR`);
    }
  }

  // 3. If no EHR exists or force recreate, create a new one
  const subjectToUse = subjectId || patient.nationalid || patient.patientid;
  console.log(`[EnsureEHR] Creating new EHR with subject: ${subjectToUse}`);
  
  try {
    ehrId = await createOpenEHREHR(subjectToUse);
    console.log(`[EnsureEHR] ✅ Created new EHR: ${ehrId}`);
    
    // Update patient record with new EHR ID
    await db
      .update(patients)
      .set({ ehrid: ehrId })
      .where(eq(patients.patientid, patientId));
    
    console.log(`[EnsureEHR] ✅ Updated patient.ehrid to: ${ehrId}`);
    return ehrId;
    
  } catch (error) {
    // Handle 409 conflict - EHR with this subject already exists
    if (error instanceof Error && error.message.includes('409')) {
      console.log(`[EnsureEHR] ⚠️ EHR with subject ${subjectToUse} already exists (409 conflict)`);
      console.log(`[EnsureEHR] Trying to find existing EHR by subject ID`);
      
      try {
        // Try to find the existing EHR by subject ID
        const existingEhrId = await getOpenEHREHRBySubjectId(subjectToUse);
        if (existingEhrId) {
          console.log(`[EnsureEHR] ✅ Found existing EHR: ${existingEhrId}`);
          
          // Update patient record with the existing EHR ID
          await db
            .update(patients)
            .set({ ehrid: existingEhrId })
            .where(eq(patients.patientid, patientId));
          
          console.log(`[EnsureEHR] ✅ Updated patient.ehrid to existing EHR: ${existingEhrId}`);
          return existingEhrId;
        }
      } catch (findError) {
        console.error(`[EnsureEHR] ❌ Failed to find existing EHR: ${findError}`);
      }
    }
    
    console.error(`[EnsureEHR] ❌ Failed to create EHR: ${error}`);
    throw new Error(`Failed to create EHR for patient ${patientId}: ${error}`);
  }
}

/**
 * Batch ensure EHRs for multiple patients
 * 
 * @param patientIds - Array of patient UUIDs
 * @param options - Optional configuration
 * @returns Map of patientId to ehrId
 */
export async function ensurePatientsEHRs(
  patientIds: string[],
  options: EnsureEHROptions = {}
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const errors: string[] = [];

  console.log(`[EnsureEHR] Processing ${patientIds.length} patients`);

  for (const patientId of patientIds) {
    try {
      const ehrId = await ensurePatientEHR(patientId, options);
      results.set(patientId, ehrId);
    } catch (error) {
      const errorMsg = `Failed to ensure EHR for patient ${patientId}: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  if (errors.length > 0) {
    console.log(`[EnsureEHR] Completed with ${errors.length} errors`);
    errors.forEach(error => console.log(`[EnsureEHR] - ${error}`));
  } else {
    console.log(`[EnsureEHR] ✅ Successfully processed all ${patientIds.length} patients`);
  }

  return results;
}
