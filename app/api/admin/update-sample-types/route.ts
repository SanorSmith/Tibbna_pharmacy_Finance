import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";
import { eq, and } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

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

export async function POST(request: NextRequest) {
  try {
    const { workspaceid } = await request.json();

    if (!workspaceid) {
      return NextResponse.json(
        { error: "Missing workspaceid" },
        { status: 400 }
      );
    }

    // Read CSV file
    const csvPath = path.join(process.cwd(), "data", "complete-test-references.csv");
    const rows = parseCSV(csvPath);

    let successCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;
    const errors: string[] = [];
    const updated: string[] = [];

    for (const row of rows) {
      try {
        // Find existing test by testcode
        const existingTests = await db
          .select()
          .from(testReferenceRanges)
          .where(
            and(
              eq(testReferenceRanges.testcode, row.testcode),
              eq(testReferenceRanges.workspaceid, workspaceid)
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
              eq(testReferenceRanges.workspaceid, workspaceid)
            )
          );

        successCount++;
        updated.push(`${row.testcode}: ${row.sampletype} in ${row.containertype}`);
      } catch (error) {
        console.error(`Error updating test ${row.testcode}:`, error);
        errors.push(`Failed to update ${row.testcode}: ${error}`);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${successCount} tests with sample types`,
      successCount,
      notFoundCount,
      errorCount,
      updated: updated.slice(0, 50),
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error("Error updating sample types:", error);
    return NextResponse.json(
      { error: "Failed to update sample types", details: String(error) },
      { status: 500 }
    );
  }
}
