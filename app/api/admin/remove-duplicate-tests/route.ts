import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";
import { eq, and, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { workspaceid, userid } = await request.json();

    if (!workspaceid || !userid) {
      return NextResponse.json(
        { error: "Missing workspaceid or userid" },
        { status: 400 }
      );
    }

    // Find duplicate test codes within the same lab type
    const duplicates = await db
      .select({
        testcode: testReferenceRanges.testcode,
        labtype: testReferenceRanges.labtype,
        count: sql<number>`count(*)::int`,
      })
      .from(testReferenceRanges)
      .where(
        and(
          eq(testReferenceRanges.workspaceid, workspaceid),
          eq(testReferenceRanges.isactive, "Y")
        )
      )
      .groupBy(testReferenceRanges.testcode, testReferenceRanges.labtype)
      .having(sql`count(*) > 1`);

    const removed: string[] = [];
    const kept: string[] = [];

    for (const dup of duplicates) {
      // Get all instances of this duplicate
      const instances = await db
        .select()
        .from(testReferenceRanges)
        .where(
          and(
            eq(testReferenceRanges.workspaceid, workspaceid),
            eq(testReferenceRanges.testcode, dup.testcode),
            eq(testReferenceRanges.labtype, dup.labtype!),
            eq(testReferenceRanges.isactive, "Y")
          )
        )
        .orderBy(testReferenceRanges.createdat); // Keep the oldest one

      if (instances.length > 1) {
        // Keep the first one (oldest), mark others as inactive
        const toKeep = instances[0];
        const toRemove = instances.slice(1);

        kept.push(`${toKeep.testcode}: ${toKeep.testname} in ${toKeep.labtype}`);

        for (const instance of toRemove) {
          await db
            .update(testReferenceRanges)
            .set({
              isactive: "N",
              updatedby: userid,
            })
            .where(eq(testReferenceRanges.rangeid, instance.rangeid));

          removed.push(`${instance.testcode}: ${instance.testname} in ${instance.labtype} (rangeid: ${instance.rangeid})`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Removed ${removed.length} duplicate tests, kept ${kept.length} unique tests`,
      duplicatesFound: duplicates.length,
      removed,
      kept,
    });
  } catch (error) {
    console.error("Error removing duplicate tests:", error);
    return NextResponse.json(
      { error: "Failed to remove duplicate tests", details: String(error) },
      { status: 500 }
    );
  }
}
