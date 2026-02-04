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

    // Find test codes that appear in multiple lab types
    const duplicateTests = await db
      .select({
        testcode: testReferenceRanges.testcode,
        testname: testReferenceRanges.testname,
        labtypes: sql<string>`string_agg(DISTINCT ${testReferenceRanges.labtype}, ', ' ORDER BY ${testReferenceRanges.labtype})`,
        count: sql<number>`count(DISTINCT ${testReferenceRanges.labtype})::int`,
      })
      .from(testReferenceRanges)
      .where(
        and(
          eq(testReferenceRanges.workspaceid, workspaceid),
          eq(testReferenceRanges.isactive, "Y")
        )
      )
      .groupBy(testReferenceRanges.testcode, testReferenceRanges.testname)
      .having(sql`count(DISTINCT ${testReferenceRanges.labtype}) > 1`);

    // Get details for each duplicate
    const duplicateDetails = [];
    for (const dup of duplicateTests) {
      const details = await db
        .select({
          testcode: testReferenceRanges.testcode,
          testname: testReferenceRanges.testname,
          labtype: testReferenceRanges.labtype,
          grouptests: testReferenceRanges.grouptests,
          sampletype: testReferenceRanges.sampletype,
          containertype: testReferenceRanges.containertype,
        })
        .from(testReferenceRanges)
        .where(
          and(
            eq(testReferenceRanges.workspaceid, workspaceid),
            eq(testReferenceRanges.testcode, dup.testcode),
            eq(testReferenceRanges.isactive, "Y")
          )
        );

      duplicateDetails.push({
        testcode: dup.testcode,
        testname: dup.testname,
        appearsIn: dup.labtypes,
        count: dup.count,
        details,
      });
    }

    // Check specifically for standalone tests (grouptests is null)
    const standaloneTests = await db
      .select({
        testcode: testReferenceRanges.testcode,
        testname: testReferenceRanges.testname,
        labtype: testReferenceRanges.labtype,
        sampletype: testReferenceRanges.sampletype,
      })
      .from(testReferenceRanges)
      .where(
        and(
          eq(testReferenceRanges.workspaceid, workspaceid),
          eq(testReferenceRanges.isactive, "Y"),
          sql`${testReferenceRanges.grouptests} IS NULL`
        )
      );

    // Group standalone tests by test code to find duplicates
    const standaloneByCode: Record<string, any[]> = {};
    standaloneTests.forEach((test) => {
      if (!standaloneByCode[test.testcode]) {
        standaloneByCode[test.testcode] = [];
      }
      standaloneByCode[test.testcode].push(test);
    });

    const duplicateStandalone = Object.entries(standaloneByCode)
      .filter(([_, tests]) => tests.length > 1)
      .map(([testcode, tests]) => ({
        testcode,
        testname: tests[0].testname,
        labtypes: tests.map((t) => t.labtype).join(", "),
        tests,
      }));

    return NextResponse.json({
      success: true,
      totalDuplicates: duplicateTests.length,
      duplicateTests: duplicateDetails,
      standaloneTestsCount: standaloneTests.length,
      duplicateStandaloneCount: duplicateStandalone.length,
      duplicateStandalone,
    });
  } catch (error) {
    console.error("Error checking duplicate tests:", error);
    return NextResponse.json(
      { error: "Failed to check duplicate tests", details: String(error) },
      { status: 500 }
    );
  }
}
