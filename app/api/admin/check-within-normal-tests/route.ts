import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";
import { eq, like } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceid = searchParams.get("workspaceid");

    if (!workspaceid) {
      return NextResponse.json(
        { error: "Missing workspaceid" },
        { status: 400 }
      );
    }

    // Get all tests with "Within normal" text
    const testsWithText = await db
      .select()
      .from(testReferenceRanges)
      .where(
        eq(testReferenceRanges.workspaceid, workspaceid)
      );

    const withNormalText = testsWithText.filter(test => 
      test.referencetext && test.referencetext.toLowerCase().includes("within normal")
    );

    return NextResponse.json({
      total: testsWithText.length,
      withNormalTextCount: withNormalText.length,
      tests: withNormalText.map(t => ({
        testcode: t.testcode,
        testname: t.testname,
        sex: t.sex,
        agegroup: t.agegroup,
        referencetext: t.referencetext,
        referencemin: t.referencemin,
        referencemax: t.referencemax,
        unit: t.unit,
      })),
    });
  } catch (error) {
    console.error("Check error:", error);
    return NextResponse.json(
      { error: "Failed to check tests", details: String(error) },
      { status: 500 }
    );
  }
}
