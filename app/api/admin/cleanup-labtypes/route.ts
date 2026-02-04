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

    // Get all distinct lab types with test counts
    const labTypeCounts = await db
      .select({
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
      .groupBy(testReferenceRanges.labtype)
      .orderBy(testReferenceRanges.labtype);

    const before = labTypeCounts.map(lt => ({ labtype: lt.labtype, count: lt.count }));

    // Check for "Special Test" vs "Special Tests" confusion
    const specialTestVariants = labTypeCounts.filter(
      (lt) => lt.labtype?.toLowerCase().includes("special test")
    );

    let consolidated = false;
    const updates: string[] = [];

    if (specialTestVariants.length > 1) {
      // Update all variants to use "Special Test"
      for (const variant of specialTestVariants) {
        if (variant.labtype !== "Special Test") {
          await db
            .update(testReferenceRanges)
            .set({ labtype: "Special Test" })
            .where(
              and(
                eq(testReferenceRanges.workspaceid, workspaceid),
                eq(testReferenceRanges.labtype, variant.labtype!)
              )
            );
          updates.push(`Updated "${variant.labtype}" to "Special Test"`);
          consolidated = true;
        }
      }
    }

    // Get updated counts
    const updatedCounts = await db
      .select({
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
      .groupBy(testReferenceRanges.labtype)
      .orderBy(testReferenceRanges.labtype);

    const after = updatedCounts.map(lt => ({ labtype: lt.labtype, count: lt.count }));

    return NextResponse.json({
      success: true,
      consolidated,
      updates,
      before,
      after,
    });
  } catch (error) {
    console.error("Error cleaning up lab types:", error);
    return NextResponse.json(
      { error: "Failed to clean up lab types", details: String(error) },
      { status: 500 }
    );
  }
}
