import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";

export async function GET() {
  try {
    // Get total count
    const totalResult = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM test_reference_ranges 
      WHERE workspaceid = ${WORKSPACE_ID}
    `);
    
    // Find duplicates based on testcode, testname, agegroup, and sex
    const duplicatesResult = await db.execute(sql`
      SELECT 
        testcode, 
        testname, 
        agegroup, 
        sex, 
        COUNT(*) as count
      FROM test_reference_ranges
      WHERE workspaceid = ${WORKSPACE_ID}
      GROUP BY testcode, testname, agegroup, sex
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `);

    const duplicates = duplicatesResult.rows || [];
    const total = Number(totalResult.rows?.[0]?.count || 0);

    return NextResponse.json({
      success: true,
      total,
      duplicates,
      totalDuplicateGroups: duplicates.length,
    });
  } catch (error) {
    console.error("Error finding duplicates:", error);
    return NextResponse.json(
      { error: "Failed to find duplicates", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Get all tests
    const allTests = await db
      .select()
      .from(testReferenceRanges)
      .where(sql`${testReferenceRanges.workspaceid} = ${WORKSPACE_ID}`)
      .orderBy(testReferenceRanges.createdat);

    const before = allTests.length;

    // Group by unique key and keep only the first (oldest) one
    const seen = new Set<string>();
    const toDelete: string[] = [];

    allTests.forEach(test => {
      const key = `${test.testcode}-${test.testname}-${test.agegroup}-${test.sex}`;
      if (seen.has(key)) {
        // This is a duplicate, mark for deletion
        toDelete.push(test.rangeid);
      } else {
        // First occurrence, keep it
        seen.add(key);
      }
    });

    // Delete duplicates in batches
    let deleted = 0;
    if (toDelete.length > 0) {
      for (let i = 0; i < toDelete.length; i += 50) {
        const batch = toDelete.slice(i, i + 50);
        await db
          .delete(testReferenceRanges)
          .where(sql`${testReferenceRanges.rangeid} = ANY(${batch})`);
        deleted += batch.length;
      }
    }

    const after = before - deleted;

    return NextResponse.json({
      success: true,
      message: `Removed ${deleted} duplicate test references`,
      before,
      after,
      deleted,
      uniqueTests: seen.size,
    });
  } catch (error) {
    console.error("Error cleaning duplicates:", error);
    return NextResponse.json(
      { error: "Failed to clean duplicates", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
