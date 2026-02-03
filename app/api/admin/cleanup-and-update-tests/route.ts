import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";
import { eq, and, gte } from "drizzle-orm";
import fs from "fs";
import path from "path";

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

export async function POST(request: NextRequest) {
  try {
    const { workspaceid, userid } = await request.json();

    if (!workspaceid || !userid) {
      return NextResponse.json(
        { error: "Missing workspaceid or userid" },
        { status: 400 }
      );
    }

    console.log("Step 1: Cleaning up recently imported duplicates...");

    // Delete tests created in the last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await db
      .delete(testReferenceRanges)
      .where(
        and(
          eq(testReferenceRanges.workspaceid, workspaceid),
          gte(testReferenceRanges.createdat, twoHoursAgo)
        )
      );

    console.log("Deleted recently imported test ranges");

    // Get current tests
    const currentTests = await db
      .select()
      .from(testReferenceRanges)
      .where(eq(testReferenceRanges.workspaceid, workspaceid));

    console.log(`Current test count: ${currentTests.length}`);

    console.log("Step 2: Updating existing tests with gender-specific ranges...");

    // Read the Iraq CSV file
    const csvPath = path.join(process.cwd(), "data", "Iraq_All_Lab_Tests_Combined_FINAL.csv");
    const fileContent = fs.readFileSync(csvPath, "utf-8");
    const records = parseCSV(fileContent);

    let updateCount = 0;
    let notFoundCount = 0;
    const notFound: string[] = [];
    const updated: string[] = [];

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

      // Try to find existing test by multiple criteria
      const matchingTests = currentTests.filter(test => {
        const testNameLower = test.testname.toLowerCase();
        const csvNameLower = testName.toLowerCase();
        const testUnitLower = test.unit?.toLowerCase() || '';
        const csvUnitLower = units?.toLowerCase() || '';
        
        // Exact match
        if (testNameLower === csvNameLower) return true;
        
        // Partial match (either direction)
        if (testNameLower.includes(csvNameLower) || csvNameLower.includes(testNameLower)) return true;
        
        // Match by unit if names are similar
        if (csvUnitLower && testUnitLower === csvUnitLower) {
          // Check if key words match
          const testWords = testNameLower.split(/\s+/);
          const csvWords = csvNameLower.split(/\s+/);
          const commonWords = testWords.filter(w => csvWords.includes(w) && w.length > 3);
          if (commonWords.length >= 1) return true;
        }
        
        // Match common abbreviations
        const abbrevMap: Record<string, string[]> = {
          'tsh': ['thyroid stimulating hormone', 'thyroid-stimulating hormone'],
          'creatinine': ['cre', 'creat'],
          'hemoglobin': ['hb', 'hgb'],
          'glucose': ['glu', 'fbs', 'rbs'],
          'cholesterol': ['chol'],
          'triglyceride': ['trig', 'tg'],
          'bilirubin': ['bili'],
          'albumin': ['alb'],
          'calcium': ['ca'],
          'potassium': ['k'],
          'sodium': ['na'],
          'chloride': ['cl'],
        };
        
        for (const [full, abbrevs] of Object.entries(abbrevMap)) {
          if (testNameLower.includes(full) && abbrevs.some(a => csvNameLower.includes(a))) return true;
          if (csvNameLower.includes(full) && abbrevs.some(a => testNameLower.includes(a))) return true;
        }
        
        return false;
      });

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

        // Update the test - clear referencetext if we have numeric ranges
        const updateData: any = {
          unit: units || test.unit,
          updatedby: userid,
          updatedat: new Date(),
        };

        // If we have numeric min/max, use those and clear text
        if (range.min !== null || range.max !== null) {
          updateData.referencemin = range.min;
          updateData.referencemax = range.max;
          updateData.referencetext = null; // Clear old "Within normal limits" text
        } else if (range.text) {
          // Only use text for qualitative results
          updateData.referencetext = range.text;
          updateData.referencemin = null;
          updateData.referencemax = null;
        }

        // Update panic values
        updateData.paniclow = panicLow;
        updateData.panichigh = panicHigh;

        await db
          .update(testReferenceRanges)
          .set(updateData)
          .where(eq(testReferenceRanges.rangeid, test.rangeid));

        updateCount++;
        updated.push(`${test.testname} (${test.sex}/${test.agegroup})`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup and update completed: ${updateCount} tests updated, ${notFoundCount} not found`,
      currentTestCount: currentTests.length,
      updateCount,
      notFoundCount,
      notFound: notFound.slice(0, 20),
      updated: updated.slice(0, 50),
    });
  } catch (error) {
    console.error("Cleanup and update error:", error);
    return NextResponse.json(
      { error: "Failed to cleanup and update", details: String(error) },
      { status: 500 }
    );
  }
}
