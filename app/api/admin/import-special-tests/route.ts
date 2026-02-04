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

    // Special test standalone test
    const specialTest = {
      testname: "By genexpert PCR for HIV Viral Load",
      testcode: "PCR",
      sampletype: "Serum",
      containertype: "SST tube",
      unit: "copies/mL",
    };

    try {
      // Check if test already exists
      const existingTests = await db
        .select()
        .from(testReferenceRanges)
        .where(
          and(
            eq(testReferenceRanges.testcode, specialTest.testcode),
            eq(testReferenceRanges.workspaceid, workspaceid)
          )
        );

      if (existingTests.length > 0) {
        // Update existing test
        await db
          .update(testReferenceRanges)
          .set({
            testname: specialTest.testname,
            sampletype: specialTest.sampletype,
            containertype: specialTest.containertype,
            unit: specialTest.unit,
            labtype: "Special Test",
            grouptests: null, // No test group for standalone test
            updatedby: userid,
          })
          .where(
            and(
              eq(testReferenceRanges.testcode, specialTest.testcode),
              eq(testReferenceRanges.workspaceid, workspaceid)
            )
          );

        return NextResponse.json({
          success: true,
          message: "Updated existing Special Test",
          updated: true,
        });
      } else {
        // Insert new test
        await db.insert(testReferenceRanges).values({
          workspaceid,
          testcode: specialTest.testcode,
          testname: specialTest.testname,
          unit: specialTest.unit,
          agegroup: "ALL",
          sex: "ANY",
          labtype: "Special Test",
          grouptests: null, // No test group for standalone test
          sampletype: specialTest.sampletype,
          containertype: specialTest.containertype,
          bodysite: null,
          clinicalindication: null,
          additionalinformation: null,
          referencetext: "Undetectable: <20 copies/mL",
          referencemin: null,
          referencemax: null,
          paniclow: null,
          panichigh: null,
          panictext: null,
          notes: "HIV viral load quantification by PCR",
          isactive: "Y",
          createdby: userid,
          updatedby: userid,
        });

        return NextResponse.json({
          success: true,
          message: "Imported Special Test: PCR for HIV Viral Load",
          added: `${specialTest.testcode}: ${specialTest.testname}`,
        });
      }
    } catch (error) {
      console.error(`Error importing test ${specialTest.testcode}:`, error);
      return NextResponse.json(
        { error: `Failed to import ${specialTest.testcode}: ${error}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error importing special test:", error);
    return NextResponse.json(
      { error: "Failed to import special test", details: String(error) },
      { status: 500 }
    );
  }
}
