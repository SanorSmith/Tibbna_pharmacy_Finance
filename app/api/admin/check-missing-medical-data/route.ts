import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema";
import { eq, isNull, or } from "drizzle-orm";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";

export async function GET() {
  try {
    // Get all tests without medical data
    const testsWithoutData = await db
      .select({
        testcode: testReferenceRanges.testcode,
        testname: testReferenceRanges.testname,
        labtype: testReferenceRanges.labtype,
        grouptests: testReferenceRanges.grouptests,
        bodysite: testReferenceRanges.bodysite,
        clinicalindication: testReferenceRanges.clinicalindication,
      })
      .from(testReferenceRanges)
      .where(
        eq(testReferenceRanges.workspaceid, WORKSPACE_ID)
      );

    // Separate tests with and without medical data
    const withData = testsWithoutData.filter(t => t.bodysite && t.clinicalindication);
    const withoutData = testsWithoutData.filter(t => !t.bodysite || !t.clinicalindication);

    // Group by lab type
    const byLabType: Record<string, any[]> = {};
    withoutData.forEach(test => {
      const labtype = test.labtype || 'Unknown';
      if (!byLabType[labtype]) {
        byLabType[labtype] = [];
      }
      byLabType[labtype].push({
        testcode: test.testcode,
        testname: test.testname,
        grouptests: test.grouptests,
      });
    });

    return NextResponse.json({
      success: true,
      total: testsWithoutData.length,
      withMedicalData: withData.length,
      withoutMedicalData: withoutData.length,
      byLabType,
      percentComplete: ((withData.length / testsWithoutData.length) * 100).toFixed(1),
    });
  } catch (error) {
    console.error("Check error:", error);
    return NextResponse.json(
      { error: "Failed to check medical data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
