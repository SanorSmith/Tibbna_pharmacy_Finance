import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema";
import * as fs from "fs";
import * as path from "path";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const CREATED_BY = "5037145a-971e-4348-8e44-f7a7ca96a35f";

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
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n").filter(line => line.trim());
  
  // Skip header
  const dataLines = lines.slice(1);
  
  const rows: CSVRow[] = [];
  
  for (const line of dataLines) {
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
  
  return rows;
}

export async function POST() {
  try {
    // Read CSV file
    const csvPath = path.join(process.cwd(), "data", "complete-test-references.csv");
    const csvData = parseCSV(csvPath);
    
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of csvData) {
      try {
        await db.insert(testReferenceRanges).values({
          workspaceid: WORKSPACE_ID,
          testcode: row.testcode,
          testname: row.testname,
          unit: row.unit || "N/A",
          agegroup: "ALL",
          sex: "ANY",
          labtype: row.labtype,
          grouptests: row.grouptests,
          sampletype: row.sampletype,
          containertype: row.containertype,
          isactive: "Y",
          createdby: CREATED_BY,
          createdat: new Date(),
          updatedby: CREATED_BY,
          updatedat: new Date(),
        });
        added++;
      } catch (err: any) {
        if (err.code === '23505') {
          skipped++;
        } else {
          errors.push(`${row.testcode}: ${err.message}`);
        }
      }
    }

    // Summary by lab type
    const labTypeCounts: Record<string, number> = {};
    for (const row of csvData) {
      labTypeCounts[row.labtype] = (labTypeCounts[row.labtype] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      message: `Added ${added} test references, skipped ${skipped} duplicates`,
      total: csvData.length,
      byLabType: labTypeCounts,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed test references", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
