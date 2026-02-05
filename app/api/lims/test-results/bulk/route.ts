/**
 * Bulk Test Results API
 * Create multiple test results at once
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { testResults } from "@/lib/db/schema";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";
import { eq, and, sql } from "drizzle-orm";
import { autoFlagResult } from "@/lib/lims/auto-flag";
import { z } from "zod";

const bulkResultSchema = z.object({
  sampleid: z.string().uuid(),
  workspaceid: z.string(),
  results: z.array(z.object({
    testcode: z.string(),
    testname: z.string(),
    resultvalue: z.string(),
    unit: z.string().nullable().optional(),
    referencemin: z.number().nullable().optional(),
    referencemax: z.number().nullable().optional(),
    referencerange: z.string().nullable().optional(),
  })),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.userid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = bulkResultSchema.parse(body);

    const now = new Date();

    // Pre-fetch panic/critical values from test_reference_ranges for all test codes
    const testCodes = validatedData.results.map((r) => r.testcode);
    const refRanges = testCodes.length > 0
      ? await db
          .select({
            testcode: testReferenceRanges.testcode,
            paniclow: testReferenceRanges.paniclow,
            panichigh: testReferenceRanges.panichigh,
            panictext: testReferenceRanges.panictext,
            referencetext: testReferenceRanges.referencetext,
            referencemin: testReferenceRanges.referencemin,
            referencemax: testReferenceRanges.referencemax,
          })
          .from(testReferenceRanges)
          .where(
            and(
              eq(testReferenceRanges.workspaceid, validatedData.workspaceid),
              eq(testReferenceRanges.isactive, "Y"),
              sql`${testReferenceRanges.testcode} IN (${sql.join(testCodes.map((c) => sql`${c}`), sql`, `)})`
            )
          )
      : [];

    // Build a lookup map (testcode → first matching reference range)
    const refMap = new Map<string, typeof refRanges[0]>();
    for (const r of refRanges) {
      if (!refMap.has(r.testcode)) {
        refMap.set(r.testcode, r);
      }
    }
    
    // Create test results with auto-flagging
    const createdResults = await Promise.all(
      validatedData.results.map(async (result) => {
        const ref = refMap.get(result.testcode);

        // Auto-flag using reference ranges + panic values
        const flags = autoFlagResult({
          resultvalue: result.resultvalue,
          referencemin: result.referencemin ?? ref?.referencemin ?? null,
          referencemax: result.referencemax ?? ref?.referencemax ?? null,
          referencerange: result.referencerange || null,
          referencetext: ref?.referencetext || null,
          paniclow: ref?.paniclow || null,
          panichigh: ref?.panichigh || null,
          panictext: ref?.panictext || null,
        });

        const [newResult] = await db
          .insert(testResults)
          .values({
            sampleid: validatedData.sampleid,
            testcode: result.testcode,
            testname: result.testname,
            resultvalue: result.resultvalue,
            resultnumeric: !isNaN(parseFloat(result.resultvalue)) ? parseFloat(result.resultvalue).toString() : null,
            unit: result.unit || null,
            referencemin: result.referencemin?.toString() || ref?.referencemin?.toString() || null,
            referencemax: result.referencemax?.toString() || ref?.referencemax?.toString() || null,
            referencerange: result.referencerange || null,
            flag: flags.flag,
            isabormal: flags.isabormal,
            iscritical: flags.iscritical,
            status: "draft",
            enteredby: user.userid,
            entereddate: now,
            entrymethod: "manual",
            analyzeddate: now,
            workspaceid: validatedData.workspaceid,
            createdby: user.userid,
            updatedby: user.userid,
          })
          .returning();
        
        return newResult;
      })
    );

    return NextResponse.json({
      success: true,
      results: createdResults,
      message: `${createdResults.length} test results created successfully`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating bulk test results:", error);
    return NextResponse.json(
      { error: "Failed to create test results" },
      { status: 500 }
    );
  }
}
