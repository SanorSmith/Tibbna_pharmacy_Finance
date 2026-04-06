/**
 * Create missing EHR for patient ALI id 2 Azziz id 2 Smith
 * Run with: npx tsx create-missing-ehr.ts
 */

import { db } from "./lib/db";
import { patients } from "./lib/db/schema";
import { eq, ilike, or } from "drizzle-orm";
import { getOpenEHREHRBySubjectId, createOpenEHREHR } from "./lib/openehr/openehr";

async function createMissingEHR() {
  try {
    console.log("=== Creating Missing EHR for ALI id 2 Azziz id 2 Smith ===\n");

    // 1. Find the patient
    console.log("1. Finding patient...");
    const [patient] = await db
      .select()
      .from(patients)
      .where(
        or(
          ilike(patients.firstname, "%ALI%"),
          ilike(patients.firstname, "%Azziz%")
        )
      )
      .limit(1);

    if (!patient) {
      console.log("❌ Patient not found in database!");
      return;
    }

    console.log("✅ Found patient:");
    console.log(`   - ID: ${patient.patientid}`);
    console.log(`   - Name: ${patient.firstname} ${patient.middlename || ''} ${patient.lastname}`);
    console.log(`   - Stored EHR ID: ${patient.ehrid || 'NULL'}`);
    console.log(`   - National ID: ${patient.nationalid || 'NULL'}\n`);

    // 2. Check if EHR actually exists in EHRbase
    console.log("2. Checking if EHR exists in EHRbase...");
    let ehrExists = false;
    
    if (patient.ehrid) {
      try {
        // Try to find EHR by stored ID
        const testEHR = await getOpenEHREHRBySubjectId(patient.ehrid);
        if (testEHR === patient.ehrid) {
          ehrExists = true;
          console.log(`✅ EHR exists in EHRbase: ${patient.ehrid}`);
        }
      } catch (error) {
        console.log(`❌ EHR not found in EHRbase: ${patient.ehrid}`);
      }
    }

    // 3. If EHR doesn't exist, create it
    if (!ehrExists) {
      console.log("3. Creating new EHR in EHRbase...");
      
      let subjectId: string;
      if (patient.nationalid) {
        subjectId = patient.nationalid;
        console.log(`   Using National ID as subject: ${subjectId}`);
      } else {
        subjectId = patient.patientid;
        console.log(`   Using Patient ID as subject: ${subjectId}`);
      }

      try {
        const newEhrId = await createOpenEHREHR(subjectId);
        console.log(`✅ Successfully created EHR: ${newEhrId}`);

        // 4. Update patient record with new EHR ID
        console.log("4. Updating patient record...");
        await db
          .update(patients)
          .set({ ehrid: newEhrId })
          .where(eq(patients.patientid, patient.patientid));
        
        console.log(`✅ Updated patient.ehrid to: ${newEhrId}`);
        console.log("\n=== SUCCESS ===");
        console.log("Patient now has a valid EHR in EHRbase.");
        console.log("You can now create test orders and prescriptions.");
        
      } catch (ehrError) {
        console.error("❌ Failed to create EHR:", ehrError);
        console.log("\nPossible causes:");
        console.log("- EHRbase is not running");
        console.log("- Invalid EHRbase URL or credentials");
        console.log("- Network connectivity issues");
      }
    } else {
      console.log("✅ EHR already exists, no action needed.");
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

createMissingEHR();
