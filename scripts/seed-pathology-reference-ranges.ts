/**
 * Seed Reference Ranges for Pathology and Cytology Tests
 * Run with: npx tsx scripts/seed-pathology-reference-ranges.ts
 */

import { db } from "../lib/db";
import { testReferenceRanges } from "../lib/db/schema";
import { eq, and } from "drizzle-orm";

const pathologyReferenceRanges = [
  {
    testcode: "BIOPSY",
    testname: "Biopsy Examination",
    category: "Pathology",
    unit: "N/A",
    agegroup: "ALL",
    sex: "ANY",
    referencetext: "Normal tissue architecture with no evidence of malignancy",
    notes: "Descriptive pathology report required",
  },
  {
    testcode: "PAP_SMEAR",
    testname: "Cervical Cancer Screening (Pap Smear)",
    category: "Cytology",
    unit: "N/A",
    agegroup: "ALL",
    sex: "F",
    referencetext: "Negative for intraepithelial lesion or malignancy (NILM)",
    notes: "Bethesda System classification",
  },
  {
    testcode: "FNAC",
    testname: "FNAC",
    category: "Cytology",
    unit: "N/A",
    agegroup: "ALL",
    sex: "ANY",
    referencetext: "Benign cytology with no evidence of malignancy",
    notes: "Fine Needle Aspiration Cytology - descriptive report",
  },
  {
    testcode: "HISTOPATH",
    testname: "Histopathology",
    category: "Pathology",
    unit: "N/A",
    agegroup: "ALL",
    sex: "ANY",
    referencetext: "Normal histological findings",
    notes: "Microscopic examination of tissue",
  },
  {
    testcode: "FROZEN_SECTION",
    testname: "Frozen Section",
    category: "Pathology",
    unit: "N/A",
    agegroup: "ALL",
    sex: "ANY",
    referencetext: "Benign tissue",
    notes: "Intraoperative consultation",
  },
];

async function seedPathologyReferenceRanges() {
  console.log("Starting to seed pathology reference ranges...");

  // Use a default workspace ID - you should replace this with your actual workspace ID
  const defaultWorkspaceId = "fa9fb036-a7eb-49af-890c-54406dad139d";
  // Use a default user ID - you should replace this with your actual user ID
  const defaultUserId = "00000000-0000-0000-0000-000000000000";

  for (const range of pathologyReferenceRanges) {
    try {
      // Check if reference range already exists
      const existing = await db
        .select()
        .from(testReferenceRanges)
        .where(
          and(
            eq(testReferenceRanges.testcode, range.testcode),
            eq(testReferenceRanges.workspaceid, defaultWorkspaceId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.log(`Reference range for ${range.testname} already exists, skipping...`);
        continue;
      }

      // Insert new reference range
      await db.insert(testReferenceRanges).values({
        workspaceid: defaultWorkspaceId,
        testcode: range.testcode,
        testname: range.testname,
        category: range.category,
        unit: range.unit,
        agegroup: range.agegroup,
        sex: range.sex,
        referencetext: range.referencetext,
        notes: range.notes,
        isactive: "Y",
        createdby: defaultUserId,
      });

      console.log(`✓ Added reference range for ${range.testname}`);
    } catch (error) {
      console.error(`Error adding reference range for ${range.testname}:`, error);
    }
  }

  console.log("\nPathology reference ranges seeding completed!");
}

// Run the seed function
seedPathologyReferenceRanges()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error seeding pathology reference ranges:", error);
    process.exit(1);
  });
