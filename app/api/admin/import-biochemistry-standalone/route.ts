import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { workspaceid, userid } = await request.json();

    if (!workspaceid || !userid) {
      return NextResponse.json(
        { error: "Missing workspaceid or userid" },
        { status: 400 }
      );
    }

    // Biochemistry standalone tests
    const biochemistryTests = [
      { testname: "Total Bilirubin", testcode: "TSB", sampletype: "Serum", containertype: "SST tube", unit: "mg/dL" },
      { testname: "Direct Bilirubin", testcode: "DB", sampletype: "Serum", containertype: "SST tube", unit: "mg/dL" },
      { testname: "Alanine transaminase", testcode: "ALT/GPT", sampletype: "Serum", containertype: "SST tube", unit: "U/L" },
      { testname: "Aspartate transaminase", testcode: "AST/GOT", sampletype: "Serum", containertype: "SST tube", unit: "U/L" },
    ];

    let successCount = 0;
    let errorCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];
    const added: string[] = [];

    for (const test of biochemistryTests) {
      try {
        // Check if test already exists
        const existingTests = await db
          .select()
          .from(testReferenceRanges)
          .where(
            and(
              eq(testReferenceRanges.testcode, test.testcode),
              eq(testReferenceRanges.workspaceid, workspaceid)
            )
          );

        if (existingTests.length > 0) {
          // Update existing test to remove group and set as standalone
          await db
            .update(testReferenceRanges)
            .set({
              testname: test.testname,
              sampletype: test.sampletype,
              containertype: test.containertype,
              unit: test.unit,
              labtype: "Biochemistry",
              grouptests: null, // Remove from any group - make standalone
              updatedby: userid,
            })
            .where(
              and(
                eq(testReferenceRanges.testcode, test.testcode),
                eq(testReferenceRanges.workspaceid, workspaceid)
              )
            );
          updatedCount++;
        } else {
          // Insert new test
          await db.insert(testReferenceRanges).values({
            workspaceid,
            testcode: test.testcode,
            testname: test.testname,
            unit: test.unit,
            agegroup: "ALL",
            sex: "ANY",
            labtype: "Biochemistry",
            grouptests: null, // No test group for standalone tests
            sampletype: test.sampletype,
            containertype: test.containertype,
            bodysite: null,
            clinicalindication: null,
            additionalinformation: null,
            referencetext: null,
            referencemin: null,
            referencemax: null,
            paniclow: null,
            panichigh: null,
            panictext: null,
            notes: null,
            isactive: "Y",
            createdby: userid,
            updatedby: userid,
          });
          successCount++;
          added.push(`${test.testcode}: ${test.testname}`);
        }
      } catch (error) {
        console.error(`Error importing test ${test.testcode}:`, error);
        errors.push(`Failed to import ${test.testcode}: ${error}`);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${successCount} new tests, updated ${updatedCount} existing tests to standalone`,
      successCount,
      updatedCount,
      errorCount,
      added,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error("Error importing biochemistry standalone tests:", error);
    return NextResponse.json(
      { error: "Failed to import biochemistry standalone tests", details: String(error) },
      { status: 500 }
    );
  }
}
