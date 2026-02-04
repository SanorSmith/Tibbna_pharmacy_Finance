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

    // Find all tests in "Special Tests" group under Biochemistry
    const specialTestsGroup = await db
      .select()
      .from(testReferenceRanges)
      .where(
        and(
          eq(testReferenceRanges.workspaceid, workspaceid),
          eq(testReferenceRanges.grouptests, "Special Tests"),
          eq(testReferenceRanges.labtype, "Biochemistry")
        )
      );

    const updates: string[] = [];

    for (const test of specialTestsGroup) {
      // Check if it's a PCR test - should go to Special Test lab type
      if (test.testname?.toLowerCase().includes("pcr") || 
          test.testcode?.toLowerCase().includes("pcr")) {
        await db
          .update(testReferenceRanges)
          .set({
            labtype: "Special Test",
            grouptests: null, // Make it standalone
            updatedby: userid,
          })
          .where(eq(testReferenceRanges.rangeid, test.rangeid));
        
        updates.push(`Moved "${test.testname}" (${test.testcode}) from Biochemistry to Special Test lab`);
      } else {
        // For non-PCR tests in "Special Tests" group, make them standalone in Biochemistry
        await db
          .update(testReferenceRanges)
          .set({
            grouptests: null, // Remove from "Special Tests" group
            updatedby: userid,
          })
          .where(eq(testReferenceRanges.rangeid, test.rangeid));
        
        updates.push(`Made "${test.testname}" (${test.testcode}) a standalone test in Biochemistry`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${updates.length} tests`,
      updates,
    });
  } catch (error) {
    console.error("Error fixing special tests group:", error);
    return NextResponse.json(
      { error: "Failed to fix special tests group", details: String(error) },
      { status: 500 }
    );
  }
}
