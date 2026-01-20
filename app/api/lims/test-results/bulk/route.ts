/**
 * Bulk Test Results API
 * Create multiple test results at once
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { testResults } from "@/lib/db/schema";
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
    
    // Create test results
    const createdResults = await Promise.all(
      validatedData.results.map(async (result) => {
        const [newResult] = await db
          .insert(testResults)
          .values({
            sampleid: validatedData.sampleid,
            testcode: result.testcode,
            testname: result.testname,
            resultvalue: result.resultvalue,
            resultnumeric: parseFloat(result.resultvalue) || null,
            unit: result.unit || null,
            referencemin: result.referencemin?.toString() || null,
            referencemax: result.referencemax?.toString() || null,
            referencerange: result.referencerange || null,
            flag: "normal",
            isabormal: false,
            iscritical: false,
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
