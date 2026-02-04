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

    // PCR standalone tests
    const pcrTests = [
      { testname: "PCR For HCV Viral Load", testcode: "PCR HCV VL", sampletype: "Serum", containertype: "SST tube", unit: "IU/mL" },
      { testname: "PCR For HBV Viral Load", testcode: "PCR HBV VL", sampletype: "Serum", containertype: "SST tube", unit: "IU/mL" },
      { testname: "PCR for HIV viral load", testcode: "PCR HIV VL", sampletype: "Serum", containertype: "SST tube", unit: "copies/mL" },
      { testname: "PCR For TB", testcode: "PCR TB", sampletype: "Whole blood EDTA / Serum", containertype: "EDTA tube / SST tube", unit: "N/A" },
      { testname: "PCR For Human papilloma virus", testcode: "PCR HPV", sampletype: "Cervical Swab / Seminal fluid", containertype: "Swab container / Sterile container", unit: "N/A" },
      { testname: "PCR For Geno Type HCV", testcode: "PCR HCV Genotype", sampletype: "Serum", containertype: "SST tube", unit: "N/A" },
      { testname: "PCR For HCV Viral Load By genexpert", testcode: "PCR HCV VL Genexpert", sampletype: "Serum", containertype: "SST tube", unit: "IU/mL" },
      { testname: "PCR For HBV Viral Load By genexpert", testcode: "PCR HBV VL Genexpert", sampletype: "Serum", containertype: "SST tube", unit: "IU/mL" },
      { testname: "PCR For TB By genexpert", testcode: "PCR TB Genexpert", sampletype: "Sputum / Fluid / Urine", containertype: "Sterile container", unit: "N/A" },
    ];

    let successCount = 0;
    let errorCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];
    const added: string[] = [];

    for (const test of pcrTests) {
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
          // Update existing test
          await db
            .update(testReferenceRanges)
            .set({
              testname: test.testname,
              sampletype: test.sampletype,
              containertype: test.containertype,
              unit: test.unit,
              labtype: "Polymerase Chain Reaction (PCR)",
              grouptests: null, // No test group for standalone tests
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
            labtype: "Polymerase Chain Reaction (PCR)",
            grouptests: null, // No test group for standalone tests
            sampletype: test.sampletype,
            containertype: test.containertype,
            bodysite: null,
            clinicalindication: null,
            additionalinformation: null,
            referencetext: "PCR detection and quantification",
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
      message: `Imported ${successCount} new tests, updated ${updatedCount} existing tests`,
      successCount,
      updatedCount,
      errorCount,
      added: added.slice(0, 50),
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error("Error importing PCR tests:", error);
    return NextResponse.json(
      { error: "Failed to import PCR tests", details: String(error) },
      { status: 500 }
    );
  }
}
