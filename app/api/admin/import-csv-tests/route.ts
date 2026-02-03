import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";
import fs from "fs";
import path from "path";

// Simple CSV parser
function parseCSV(content: string) {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index]?.trim() || '';
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

    // Read the CSV file
    const csvPath = path.join(process.cwd(), "data", "test-references-import.csv");
    const fileContent = fs.readFileSync(csvPath, "utf-8");

    // Parse CSV
    const records = parseCSV(fileContent);

    console.log(`Found ${records.length} tests to import`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each record
    for (const record of records) {
      try {
        // Skip if missing required fields
        if (!record.testcode || !record.testname) {
          errors.push(`Skipping row: missing testcode or testname`);
          errorCount++;
          continue;
        }

        // Prepare the data
        const testData = {
          workspaceid,
          testcode: record.testcode.trim(),
          testname: record.testname.trim(),
          unit: record.unit || record.sampletype || "N/A",
          agegroup: "ALL",
          sex: "ANY",
          labtype: record.labtype?.trim() || null,
          grouptests: record.grouptests?.trim() || null,
          sampletype: record.sampletype?.trim() || null,
          containertype: record.containertype?.trim() || null,
          bodysite: null,
          clinicalindication: null,
          additionalinformation: null,
          referencetext: "Within normal limits",
          referencemin: null,
          referencemax: null,
          paniclow: null,
          panichigh: null,
          panictext: null,
          notes: null,
          isactive: "Y",
          createdby: userid,
          updatedby: userid,
        };

        // Insert into database
        await db.insert(testReferenceRanges).values(testData);
        successCount++;
      } catch (error) {
        console.error(`Error importing test ${record.testcode}:`, error);
        errors.push(`Failed to import ${record.testcode}: ${error}`);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed: ${successCount} tests imported, ${errorCount} errors`,
      successCount,
      errorCount,
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { error: "Failed to import CSV", details: String(error) },
      { status: 500 }
    );
  }
}
