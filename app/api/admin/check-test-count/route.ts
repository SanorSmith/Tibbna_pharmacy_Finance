import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";

export async function GET() {
  try {
    // Get all test references
    const allTests = await db
      .select()
      .from(testReferenceRanges)
      .where(eq(testReferenceRanges.workspaceid, WORKSPACE_ID));

    // Count by testcode
    const testCodeCounts: Record<string, number> = {};
    const duplicateTests: any[] = [];

    allTests.forEach(test => {
      const key = `${test.testcode}-${test.testname}-${test.agegroup}-${test.sex}`;
      testCodeCounts[key] = (testCodeCounts[key] || 0) + 1;
    });

    // Find duplicates
    Object.entries(testCodeCounts).forEach(([key, count]) => {
      if (count > 1) {
        const [testcode, testname, agegroup, sex] = key.split('-');
        duplicateTests.push({ testcode, testname, agegroup, sex, count });
      }
    });

    return NextResponse.json({
      success: true,
      totalTests: allTests.length,
      uniqueKeys: Object.keys(testCodeCounts).length,
      duplicateGroups: duplicateTests.length,
      duplicates: duplicateTests.slice(0, 20), // Show first 20
    });
  } catch (error) {
    console.error("Error checking tests:", error);
    return NextResponse.json(
      { error: "Failed to check tests", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
