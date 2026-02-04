// Script to update sample types and container types for existing tests
// Run with: npx tsx scripts/update-sample-types.ts

import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";
import { eq, and } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";

interface CSVRow {
  labtype: string;
  grouptests: string;
  testname: string;
  testcode: string;
  sampletype: string;
  unit: string;
  containertype: string;
}

function parseCSV(filePath: string): CSVRow[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      const values = line.split(",");
      if (values.length >= 7) {
        rows.push({
          labtype: values[0].trim(),
          grouptests: values[1].trim(),
          testname: values[2].trim(),
          testcode: values[3].trim(),
          sampletype: values[4].trim(),
          unit: values[5].trim(),
          containertype: values[6].trim(),
        });
      }
    }
  }

  return rows;
}

async function updateSampleTypes() {
  console.log("🚀 Starting update of sample types and container types...\n");

  try {
    // Read CSV file
    const csvPath = path.join(process.cwd(), "data", "complete-test-references.csv");
    console.log(`📄 Reading CSV file: ${csvPath}`);
    
    const rows = parseCSV(csvPath);
    console.log(`✅ Found ${rows.length} tests in CSV\n`);

    let successCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        // Find existing test by testcode
        const existingTests = await db
          .select()
          .from(testReferenceRanges)
          .where(
            and(
              eq(testReferenceRanges.testcode, row.testcode),
              eq(testReferenceRanges.workspaceid, WORKSPACE_ID)
            )
          );

        if (existingTests.length === 0) {
          notFoundCount++;
          continue;
        }

        // Update sample type and container type
        await db
          .update(testReferenceRanges)
          .set({
            sampletype: row.sampletype || null,
            containertype: row.containertype || null,
          })
          .where(
            and(
              eq(testReferenceRanges.testcode, row.testcode),
              eq(testReferenceRanges.workspaceid, WORKSPACE_ID)
            )
          );

        successCount++;
        
        if (successCount % 50 === 0) {
          console.log(`✅ Updated ${successCount} tests...`);
        }
      } catch (error) {
        console.error(`Error updating test ${row.testcode}:`, error);
        errors.push(`Failed to update ${row.testcode}: ${error}`);
        errorCount++;
      }
    }

    console.log("\n📊 Update Summary:");
    console.log(`   ✅ Successfully updated: ${successCount}`);
    console.log(`   ⚠️  Not found in database: ${notFoundCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.log("\n⚠️  Errors encountered:");
      errors.slice(0, 10).forEach((error) => console.log(`   - ${error}`));
    }

    console.log("\n✅ Sample type update completed!");
  } catch (error) {
    console.error("❌ Error during update:", error);
  }
}

updateSampleTypes();
