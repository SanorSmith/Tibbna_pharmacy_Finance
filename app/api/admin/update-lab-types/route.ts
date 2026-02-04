import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";
import { eq, and, inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { workspaceid } = await request.json();

    if (!workspaceid) {
      return NextResponse.json(
        { error: "Missing workspaceid" },
        { status: 400 }
      );
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const updated: string[] = [];

    // Update Glyco Metabolism tests to Endocrinology
    const glycoMetabolismTests = [
      "C-P", "INS", "Pro-insulin", "IAA", "GAD65", "IGF-I", "IR HOMA", "OGTT"
    ];

    try {
      await db
        .update(testReferenceRanges)
        .set({ labtype: "Endocrinology" })
        .where(
          and(
            inArray(testReferenceRanges.testcode, glycoMetabolismTests),
            eq(testReferenceRanges.workspaceid, workspaceid)
          )
        );
      
      successCount += glycoMetabolismTests.length;
      updated.push(`Moved ${glycoMetabolismTests.length} Glyco Metabolism tests to Endocrinology`);
    } catch (error) {
      errors.push(`Failed to update Glyco Metabolism tests: ${error}`);
      errorCount += glycoMetabolismTests.length;
    }

    // Update Anemia tests to Endocrinology
    const anemiaTests = ["FA", "VB12", "Fert"];

    try {
      await db
        .update(testReferenceRanges)
        .set({ labtype: "Endocrinology" })
        .where(
          and(
            inArray(testReferenceRanges.testcode, anemiaTests),
            eq(testReferenceRanges.workspaceid, workspaceid)
          )
        );
      
      successCount += anemiaTests.length;
      updated.push(`Moved ${anemiaTests.length} Anemia tests to Endocrinology`);
    } catch (error) {
      errors.push(`Failed to update Anemia tests: ${error}`);
      errorCount += anemiaTests.length;
    }

    // Update Cardiac Markers tests to Endocrinology
    const cardiacTests = ["MB", "Trop I", "Trop I screen", "CK-MB", "DD"];

    try {
      await db
        .update(testReferenceRanges)
        .set({ labtype: "Endocrinology" })
        .where(
          and(
            inArray(testReferenceRanges.testcode, cardiacTests),
            eq(testReferenceRanges.workspaceid, workspaceid)
          )
        );
      
      successCount += cardiacTests.length;
      updated.push(`Moved ${cardiacTests.length} Cardiac Markers tests to Endocrinology`);
    } catch (error) {
      errors.push(`Failed to update Cardiac Markers tests: ${error}`);
      errorCount += cardiacTests.length;
    }

    // Update group names to match your requirements
    try {
      // Update Glyco Metabolism group name
      await db
        .update(testReferenceRanges)
        .set({ grouptests: "Glyco Metabolism" })
        .where(
          and(
            inArray(testReferenceRanges.testcode, glycoMetabolismTests),
            eq(testReferenceRanges.workspaceid, workspaceid)
          )
        );

      // Update Cardiac Markers group name
      await db
        .update(testReferenceRanges)
        .set({ grouptests: "Cardiac Markers" })
        .where(
          and(
            inArray(testReferenceRanges.testcode, cardiacTests),
            eq(testReferenceRanges.workspaceid, workspaceid)
          )
        );

      updated.push("Updated group names to match requirements");
    } catch (error) {
      errors.push(`Failed to update group names: ${error}`);
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${successCount} tests to Endocrinology lab type`,
      successCount,
      errorCount,
      updated,
      errors,
    });
  } catch (error) {
    console.error("Error updating lab types:", error);
    return NextResponse.json(
      { error: "Failed to update lab types", details: String(error) },
      { status: 500 }
    );
  }
}
