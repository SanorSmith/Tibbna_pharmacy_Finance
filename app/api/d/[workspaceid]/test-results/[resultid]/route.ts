/**
 * Individual Test Result API Route
 * Provides operations for individual test results
 * Supports result updates, validation, and status changes
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { testResults, resultValidationHistory } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { createWorkspaceNotification } from "@/lib/notifications";
import { z } from "zod";

const testResultUpdateSchema = z.object({
  resultvalue: z.string().optional(),
  resultnumeric: z.number().optional(),
  comment: z.string().optional(),
  techniciannotes: z.string().optional(),
});

const statusChangeSchema = z.object({
  action: z.enum(["validate_technical", "validate_medical", "release", "reject"]),
  comment: z.string().optional(),
  rejectionreason: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; resultid: string }> }
) {
  try {
    const { workspaceid, resultid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db
      .select()
      .from(testResults)
      .where(and(eq(testResults.workspaceid, workspaceid), eq(testResults.resultid, resultid)))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    const history = await db
      .select()
      .from(resultValidationHistory)
      .where(eq(resultValidationHistory.resultid, resultid))
      .orderBy(resultValidationHistory.validateddate);

    return NextResponse.json({ result: { ...result[0], history } });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch test result" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; resultid: string }> }
) {
  try {
    const { workspaceid, resultid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = testResultUpdateSchema.parse(body);

    const updatedResult = await db
      .update(testResults)
      .set({
        ...validatedData,
        resultnumeric: validatedData.resultnumeric?.toString(),
        updatedby: user.userid,
        updatedat: new Date(),
      })
      .where(and(eq(testResults.workspaceid, workspaceid), eq(testResults.resultid, resultid)))
      .returning();

    return NextResponse.json({ result: updatedResult[0] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update test result" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; resultid: string }> }
) {
  try {
    const { workspaceid, resultid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status, resultvalue, changeComment } = body;

    // Get current result to capture previous values
    const currentResult = await db
      .select()
      .from(testResults)
      .where(and(eq(testResults.workspaceid, workspaceid), eq(testResults.resultid, resultid)))
      .limit(1);

    if (currentResult.length === 0) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    const previousStatus = currentResult[0].status;
    const previousValue = currentResult[0].resultvalue;

    // Handle result value update with change comment
    if (resultvalue !== undefined && changeComment) {
      const updatedResult = await db
        .update(testResults)
        .set({
          resultvalue: resultvalue,
          updatedby: user.userid,
          updatedat: new Date(),
        })
        .where(and(eq(testResults.workspaceid, workspaceid), eq(testResults.resultid, resultid)))
        .returning();

      // Create validation history entry for result change
      await db.insert(resultValidationHistory).values({
        resultid: resultid,
        action: 'result_modified',
        previousstatus: previousStatus,
        newstatus: previousStatus, // Status remains the same
        validatedby: user.userid,
        validationlevel: 'technical',
        comment: `Result changed from "${previousValue}" to "${resultvalue}". Reason: ${changeComment}`,
        workspaceid: workspaceid,
      });

      return NextResponse.json({ 
        success: true,
        result: updatedResult[0],
        message: 'Test result updated successfully'
      });
    }

    // Handle status change
    if (status) {
      // Update test result status
      const updatedResult = await db
        .update(testResults)
        .set({
          status: status,
          updatedby: user.userid,
          updatedat: new Date(),
        })
        .where(and(eq(testResults.workspaceid, workspaceid), eq(testResults.resultid, resultid)))
        .returning();

      // Create validation history entry
      await db.insert(resultValidationHistory).values({
        resultid: resultid,
        action: status === 'released' ? 'released' : status === 'rejected' ? 'rejected' : 'rerun_requested',
        previousstatus: previousStatus,
        newstatus: status,
        validatedby: user.userid,
        validationlevel: 'technical',
        comment: `Status changed to ${status}`,
        workspaceid: workspaceid,
      });

      // Create notification for test validation/release
      if (['released', 'validated'].includes(status.toLowerCase())) {
        try {
          await createWorkspaceNotification({
            workspaceid,
            type: "TEST_VALIDATED",
            title: `Test Result ${status.toUpperCase()}`,
            message: `Test result for ${updatedResult[0].testname} (${updatedResult[0].testcode}) has been ${status.toLowerCase()}.`,
            relatedentityid: resultid,
            relatedentitytype: "test_result",
            metadata: {
              testCode: updatedResult[0].testcode,
              testName: updatedResult[0].testname,
              resultValue: updatedResult[0].resultvalue,
              sampleId: updatedResult[0].sampleid,
              validationStatus: status,
              validatedBy: user.userid,
            },
            priority: status === 'released' ? "high" : "medium",
          });
        } catch (notificationError) {
          // Don't fail the request if notification fails
        }
      }

      return NextResponse.json({ 
        success: true,
        result: updatedResult[0],
        message: `Test result ${status} successfully`
      });
    }

    return NextResponse.json({ error: "Either status or resultvalue with changeComment is required" }, { status: 400 });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json({ error: "Failed to update test result" }, { status: 500 });
  }
}
