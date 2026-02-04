import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";
import { eq, and, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { workspaceid } = await request.json();

    if (!workspaceid) {
      return NextResponse.json(
        { error: "Missing workspaceid" },
        { status: 400 }
      );
    }

    // Get all active tests
    const allTests = await db
      .select({
        rangeid: testReferenceRanges.rangeid,
        testcode: testReferenceRanges.testcode,
        testname: testReferenceRanges.testname,
        labtype: testReferenceRanges.labtype,
        grouptests: testReferenceRanges.grouptests,
        sampletype: testReferenceRanges.sampletype,
        containertype: testReferenceRanges.containertype,
        unit: testReferenceRanges.unit,
      })
      .from(testReferenceRanges)
      .where(
        and(
          eq(testReferenceRanges.workspaceid, workspaceid),
          eq(testReferenceRanges.isactive, "Y")
        )
      );

    const validationIssues: any[] = [];

    allTests.forEach((test) => {
      const issues: string[] = [];

      // Check for missing or invalid test code
      if (!test.testcode || test.testcode.trim() === "") {
        issues.push("Missing test code");
      }

      // Check for missing test name
      if (!test.testname || test.testname.trim() === "") {
        issues.push("Missing test name");
      }

      // Check for missing lab type
      if (!test.labtype || test.labtype.trim() === "") {
        issues.push("Missing lab type");
      }

      // Check for missing sample type
      if (!test.sampletype || test.sampletype.trim() === "") {
        issues.push("Missing sample type");
      }

      // Check for missing container type
      if (!test.containertype || test.containertype.trim() === "") {
        issues.push("Missing container type");
      }

      // Check for missing unit
      if (!test.unit || test.unit.trim() === "") {
        issues.push("Missing unit");
      }

      // Check for test codes with special characters that might cause issues
      if (test.testcode && /[<>\"'`]/.test(test.testcode)) {
        issues.push("Test code contains potentially problematic characters");
      }

      // Check for very long test codes (might cause UI issues)
      if (test.testcode && test.testcode.length > 50) {
        issues.push("Test code is too long (>50 characters)");
      }

      if (issues.length > 0) {
        validationIssues.push({
          rangeid: test.rangeid,
          testcode: test.testcode,
          testname: test.testname,
          labtype: test.labtype,
          issues,
        });
      }
    });

    // Check for test codes that are just whitespace or very short
    const shortCodes = allTests.filter(
      (t) => t.testcode && t.testcode.trim().length < 2
    );

    // Check for duplicate test codes within same lab type
    const codesByLabType: Record<string, Record<string, number>> = {};
    allTests.forEach((test) => {
      if (!test.labtype || !test.testcode) return;
      if (!codesByLabType[test.labtype]) {
        codesByLabType[test.labtype] = {};
      }
      codesByLabType[test.labtype][test.testcode] =
        (codesByLabType[test.labtype][test.testcode] || 0) + 1;
    });

    const duplicatesInSameLabType: any[] = [];
    Object.entries(codesByLabType).forEach(([labtype, codes]) => {
      Object.entries(codes).forEach(([code, count]) => {
        if (count > 1) {
          duplicatesInSameLabType.push({ labtype, testcode: code, count });
        }
      });
    });

    return NextResponse.json({
      success: true,
      totalTests: allTests.length,
      validationIssues: validationIssues.length,
      issues: validationIssues,
      shortCodes: shortCodes.map((t) => ({
        testcode: t.testcode,
        testname: t.testname,
        labtype: t.labtype,
      })),
      duplicatesInSameLabType,
    });
  } catch (error) {
    console.error("Error validating test codes:", error);
    return NextResponse.json(
      { error: "Failed to validate test codes", details: String(error) },
      { status: 500 }
    );
  }
}
