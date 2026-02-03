// Script to cleanup duplicate imports and update existing tests with gender-specific ranges
// Run with: npx tsx scripts/cleanup-and-update-tests.ts

import { db } from "../lib/db";
import { testReferenceRanges } from "../lib/db/schema/test-reference-ranges";
import { eq, and, gte } from "drizzle-orm";
import fs from "fs";
import path from "path";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const USER_ID = "5037145a-971e-4348-8e44-f7a7ca96a35f";

// Parse range string
function parseRange(rangeStr: string) {
  if (!rangeStr || rangeStr === "—" || rangeStr === "") {
    return { min: null, max: null, text: null };
  }

  if (rangeStr.toLowerCase().includes("negative") || 
      rangeStr.toLowerCase().includes("non-reactive") ||
      rangeStr.toLowerCase().includes("no growth") ||
      rangeStr.toLowerCase().includes("no pathogen")) {
    return { min: null, max: null, text: rangeStr };
  }

  if (rangeStr.startsWith("<")) {
    const value = rangeStr.substring(1).trim();
    return { min: null, max: parseFloat(value) || null, text: rangeStr };
  }

  if (rangeStr.startsWith(">") || rangeStr.startsWith("≥")) {
    const value = rangeStr.substring(1).trim();
    return { min: parseFloat(value) || null, max: null, text: rangeStr };
  }

  const rangeParts = rangeStr.split(/[–-]/).map(s => s.trim());
  if (rangeParts.length === 2) {
    const min = parseFloat(rangeParts[0]);
    const max = parseFloat(rangeParts[1]);
    if (!isNaN(min) && !isNaN(max)) {
      return { min, max, text: null };
    }
  }

  return { min: null, max: null, text: rangeStr };
}

// Parse CSV
function parseCSV(content: string) {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    return record;
  });
}

async function cleanupAndUpdate() {
  console.log("🧹 Step 1: Cleaning up recently imported duplicates...\n");

  try {
    // Delete tests created in the last hour (the ones we just imported)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const deleted = await db
      .delete(testReferenceRanges)
      .where(
        and(
          eq(testReferenceRanges.workspaceid, WORKSPACE_ID),
          gte(testReferenceRanges.createdat, oneHourAgo)
        )
      );

    console.log(`✅ Deleted recently imported test ranges\n`);

    // Get current count
    const currentTests = await db
      .select()
      .from(testReferenceRanges)
      .where(eq(testReferenceRanges.workspaceid, WORKSPACE_ID));

    console.log(`📊 Current test count: ${currentTests.length}\n`);

    console.log("🔄 Step 2: Updating existing tests with gender-specific ranges...\n");

    // Read the Iraq CSV file
    const csvPath = path.join(process.cwd(), "data", "Iraq_All_Lab_Tests_Combined_FINAL.csv");
    const fileContent = fs.readFileSync(csvPath, "utf-8");
    const records = parseCSV(fileContent);

    let updateCount = 0;
    let notFoundCount = 0;
    const notFound: string[] = [];

    // For each CSV record, try to find matching test and update it
    for (const record of records) {
      const testName = record["Test Name"]?.trim();
      const units = record["Units"]?.trim();
      const maleRange = record["Male Range"]?.trim();
      const femaleRange = record["Female Range"]?.trim();
      const pediatricRange = record["Pediatric Range"]?.trim();
      const criticalLow = record["Critical Low"]?.trim();
      const criticalHigh = record["Critical High"]?.trim();

      if (!testName) continue;

      // Try to find existing test by name (case-insensitive partial match)
      const matchingTests = currentTests.filter(test => 
        test.testname.toLowerCase().includes(testName.toLowerCase()) ||
        testName.toLowerCase().includes(test.testname.toLowerCase())
      );

      if (matchingTests.length === 0) {
        notFound.push(testName);
        notFoundCount++;
        continue;
      }

      // Update each matching test with appropriate gender-specific range
      for (const test of matchingTests) {
        let rangeToUse = maleRange;
        
        // Determine which range to use based on test's sex
        if (test.sex === "F" && femaleRange && femaleRange !== "—") {
          rangeToUse = femaleRange;
        } else if (test.sex === "M" && maleRange && maleRange !== "—") {
          rangeToUse = maleRange;
        } else if (test.agegroup === "PED" && pediatricRange && pediatricRange !== "—") {
          rangeToUse = pediatricRange;
        } else if (maleRange === femaleRange && maleRange && maleRange !== "—") {
          rangeToUse = maleRange;
        }

        if (!rangeToUse || rangeToUse === "—") continue;

        const range = parseRange(rangeToUse);
        const panicLow = criticalLow && criticalLow !== "—" ? parseFloat(criticalLow) : null;
        const panicHigh = criticalHigh && criticalHigh !== "—" ? parseFloat(criticalHigh) : null;

        // Update the test
        await db
          .update(testReferenceRanges)
          .set({
            referencemin: range.min,
            referencemax: range.max,
            referencetext: range.text,
            paniclow: panicLow,
            panichigh: panicHigh,
            unit: units || test.unit,
            updatedby: USER_ID,
            updatedat: new Date(),
          })
          .where(eq(testReferenceRanges.rangeid, test.rangeid));

        updateCount++;
      }
    }

    console.log(`✅ Update completed!\n`);
    console.log(`📊 Summary:`);
    console.log(`   - Tests updated: ${updateCount}`);
    console.log(`   - Tests not found: ${notFoundCount}`);
    
    if (notFound.length > 0 && notFound.length <= 20) {
      console.log(`\n⚠️  Tests from CSV not found in database:`);
      notFound.forEach(test => console.log(`   - ${test}`));
    }

    console.log(`\n✅ All existing tests have been updated with gender-specific reference ranges!`);

  } catch (error) {
    console.error("❌ Error:", error);
  }

  process.exit(0);
}

cleanupAndUpdate();
