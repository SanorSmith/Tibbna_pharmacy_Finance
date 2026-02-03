import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";
import fs from "fs";
import path from "path";

// Parse range string like "0.4–4.0" or "<0.04" or "Negative"
function parseRange(rangeStr: string) {
  if (!rangeStr || rangeStr === "—" || rangeStr === "") {
    return { min: null, max: null, text: null };
  }

  // Handle qualitative values
  if (rangeStr.toLowerCase().includes("negative") || 
      rangeStr.toLowerCase().includes("non-reactive") ||
      rangeStr.toLowerCase().includes("no growth") ||
      rangeStr.toLowerCase().includes("no pathogen")) {
    return { min: null, max: null, text: rangeStr };
  }

  // Handle less than values like "<0.04"
  if (rangeStr.startsWith("<")) {
    const value = rangeStr.substring(1).trim();
    return { min: null, max: parseFloat(value) || null, text: rangeStr };
  }

  // Handle greater than values like ">40"
  if (rangeStr.startsWith(">") || rangeStr.startsWith("≥")) {
    const value = rangeStr.substring(1).trim();
    return { min: parseFloat(value) || null, max: null, text: rangeStr };
  }

  // Handle range like "0.4–4.0" or "0.4-4.0"
  const rangeParts = rangeStr.split(/[–-]/).map(s => s.trim());
  if (rangeParts.length === 2) {
    const min = parseFloat(rangeParts[0]);
    const max = parseFloat(rangeParts[1]);
    if (!isNaN(min) && !isNaN(max)) {
      return { min, max, text: null };
    }
  }

  // If can't parse as numeric, treat as text
  return { min: null, max: null, text: rangeStr };
}

// Parse CSV manually
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

// Generate test code from test name
function generateTestCode(testName: string): string {
  // Remove special characters and take first letters
  const words = testName.replace(/[^\w\s]/g, '').split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 6).toUpperCase();
  }
  return words.map(w => w[0]).join('').toUpperCase().substring(0, 10);
}

// Map category to lab type
function mapCategoryToLabType(category: string): string {
  if (category.includes("Endocrinology")) return "Endocrinology";
  if (category.includes("Chemistry") || category.includes("Renal") || category.includes("Liver") || category.includes("Diabetes") || category.includes("Enzymes")) return "Biochemistry";
  if (category.includes("Hematology") || category.includes("Coagulation")) return "Hematology";
  if (category.includes("Cardiac")) return "Biochemistry";
  if (category.includes("Serology")) return "Serology";
  if (category.includes("Immunology")) return "Immunology";
  if (category.includes("Microbiology")) return "Microbiology";
  if (category.includes("Histopathology") || category.includes("Cytology")) return "Histopathology";
  if (category.includes("Tumor")) return "Immunology";
  if (category.includes("Lipids") || category.includes("Electrolytes")) return "Biochemistry";
  if (category.includes("Vitamins") || category.includes("Iron")) return "Biochemistry";
  if (category.includes("Proteins")) return "Biochemistry";
  if (category.includes("Inflammation")) return "Immunology";
  return "Biochemistry";
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

    // Read the CSV file
    const csvPath = path.join(process.cwd(), "data", "Iraq_All_Lab_Tests_Combined_FINAL.csv");
    const fileContent = fs.readFileSync(csvPath, "utf-8");

    // Parse CSV
    const records = parseCSV(fileContent);

    console.log(`Found ${records.length} tests to import`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const imported: string[] = [];

    // Process each record - create separate entries for Male, Female, and Pediatric
    for (const record of records) {
      try {
        const testName = record["Test Name"]?.trim();
        const category = record["Category"]?.trim();
        const units = record["Units"]?.trim();
        const maleRange = record["Male Range"]?.trim();
        const femaleRange = record["Female Range"]?.trim();
        const pediatricRange = record["Pediatric Range"]?.trim();
        const criticalLow = record["Critical Low"]?.trim();
        const criticalHigh = record["Critical High"]?.trim();
        const notes = record["Notes"]?.trim();

        if (!testName || !category) {
          errors.push(`Skipping row: missing test name or category`);
          errorCount++;
          continue;
        }

        const testCode = generateTestCode(testName);
        const labType = mapCategoryToLabType(category);

        // Import Male range
        if (maleRange && maleRange !== "—") {
          const range = parseRange(maleRange);
          const panicLow = criticalLow && criticalLow !== "—" ? parseFloat(criticalLow) : null;
          const panicHigh = criticalHigh && criticalHigh !== "—" ? parseFloat(criticalHigh) : null;

          await db.insert(testReferenceRanges).values({
            workspaceid,
            testcode: testCode,
            testname: testName,
            unit: units || "N/A",
            agegroup: "ADULT",
            sex: "M",
            referencemin: range.min,
            referencemax: range.max,
            referencetext: range.text,
            paniclow: panicLow,
            panichigh: panicHigh,
            panictext: null,
            labtype: labType,
            grouptests: category,
            sampletype: null,
            containertype: null,
            bodysite: null,
            clinicalindication: null,
            additionalinformation: notes || null,
            notes: null,
            isactive: "Y",
            createdby: userid,
            updatedby: userid,
          });
          successCount++;
          imported.push(`${testCode} (Male)`);
        }

        // Import Female range
        if (femaleRange && femaleRange !== "—" && femaleRange !== maleRange) {
          const range = parseRange(femaleRange);
          const panicLow = criticalLow && criticalLow !== "—" ? parseFloat(criticalLow) : null;
          const panicHigh = criticalHigh && criticalHigh !== "—" ? parseFloat(criticalHigh) : null;

          await db.insert(testReferenceRanges).values({
            workspaceid,
            testcode: testCode,
            testname: testName,
            unit: units || "N/A",
            agegroup: "ADULT",
            sex: "F",
            referencemin: range.min,
            referencemax: range.max,
            referencetext: range.text,
            paniclow: panicLow,
            panichigh: panicHigh,
            panictext: null,
            labtype: labType,
            grouptests: category,
            sampletype: null,
            containertype: null,
            bodysite: null,
            clinicalindication: null,
            additionalinformation: notes || null,
            notes: null,
            isactive: "Y",
            createdby: userid,
            updatedby: userid,
          });
          successCount++;
          imported.push(`${testCode} (Female)`);
        } else if (femaleRange === maleRange && maleRange && maleRange !== "—") {
          // If male and female ranges are the same, create one entry for ANY sex
          const range = parseRange(maleRange);
          const panicLow = criticalLow && criticalLow !== "—" ? parseFloat(criticalLow) : null;
          const panicHigh = criticalHigh && criticalHigh !== "—" ? parseFloat(criticalHigh) : null;

          await db.insert(testReferenceRanges).values({
            workspaceid,
            testcode: testCode,
            testname: testName,
            unit: units || "N/A",
            agegroup: "ADULT",
            sex: "ANY",
            referencemin: range.min,
            referencemax: range.max,
            referencetext: range.text,
            paniclow: panicLow,
            panichigh: panicHigh,
            panictext: null,
            labtype: labType,
            grouptests: category,
            sampletype: null,
            containertype: null,
            bodysite: null,
            clinicalindication: null,
            additionalinformation: notes || null,
            notes: null,
            isactive: "Y",
            createdby: userid,
            updatedby: userid,
          });
          successCount++;
          imported.push(`${testCode} (Any)`);
        }

        // Import Pediatric range
        if (pediatricRange && pediatricRange !== "—") {
          const range = parseRange(pediatricRange);
          const panicLow = criticalLow && criticalLow !== "—" ? parseFloat(criticalLow) : null;
          const panicHigh = criticalHigh && criticalHigh !== "—" ? parseFloat(criticalHigh) : null;

          await db.insert(testReferenceRanges).values({
            workspaceid,
            testcode: testCode,
            testname: testName,
            unit: units || "N/A",
            agegroup: "PED",
            sex: "ANY",
            referencemin: range.min,
            referencemax: range.max,
            referencetext: range.text,
            paniclow: panicLow,
            panichigh: panicHigh,
            panictext: null,
            labtype: labType,
            grouptests: category,
            sampletype: null,
            containertype: null,
            bodysite: null,
            clinicalindication: null,
            additionalinformation: notes || null,
            notes: null,
            isactive: "Y",
            createdby: userid,
            updatedby: userid,
          });
          successCount++;
          imported.push(`${testCode} (Pediatric)`);
        }

      } catch (error) {
        console.error(`Error importing test:`, error);
        errors.push(`Failed to import: ${error}`);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed: ${successCount} test ranges imported, ${errorCount} errors`,
      successCount,
      errorCount,
      errors: errors.slice(0, 20),
      imported: imported.slice(0, 50),
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { error: "Failed to import CSV", details: String(error) },
      { status: 500 }
    );
  }
}
