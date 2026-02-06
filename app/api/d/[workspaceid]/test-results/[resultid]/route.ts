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
import { createWorkspaceNotification, notifyDoctorOnResultRelease, notifyDoctorOnResultApproval } from "@/lib/notifications";
import { autoFlagResult } from "@/lib/lims/auto-flag";
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
      // Re-compute flags based on the new result value
      const flags = autoFlagResult({
        resultvalue,
        referencemin: currentResult[0].referencemin,
        referencemax: currentResult[0].referencemax,
        referencerange: currentResult[0].referencerange,
      });

      const updatedResult = await db
        .update(testResults)
        .set({
          resultvalue: resultvalue,
          flag: flags.flag,
          isabormal: flags.isabormal,
          iscritical: flags.iscritical,
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
      // ── Enforce multi-level validation chain ──
      if (status === 'released' && previousStatus !== 'approved') {
        return NextResponse.json(
          { error: `Cannot release: result is currently "${previousStatus}". Release requires medical validation first (status "approved"). Chain: draft → validated → approved → released.` },
          { status: 400 }
        );
      }
      if (status === 'validated' && previousStatus !== 'draft' && previousStatus !== 'pending') {
        return NextResponse.json(
          { error: `Cannot perform technical validation: result is currently "${previousStatus}". Technical validation requires status "draft".` },
          { status: 400 }
        );
      }
      if (status === 'approved' && previousStatus !== 'validated') {
        return NextResponse.json(
          { error: `Cannot perform medical validation: result is currently "${previousStatus}". Medical validation requires technical validation first (status "validated").` },
          { status: 400 }
        );
      }
      if ((status === 'rejected' || status === 'rerun_requested') && previousStatus === 'released') {
        return NextResponse.json(
          { error: "Cannot reject or rerun: result has already been released." },
          { status: 400 }
        );
      }

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

      // Notify doctor when results are released
      if (status.toLowerCase() === 'released') {
        try {
          await notifyDoctorOnResultRelease({
            workspaceid,
            sampleid: updatedResult[0].sampleid,
            testname: updatedResult[0].testname,
            testcode: updatedResult[0].testcode,
            resultvalue: updatedResult[0].resultvalue,
            resultid,
          });
        } catch (notificationError) {
          // Don't fail the request if notification fails
        }
      }

      // Notify the ordering doctor when results are approved (medical validation)
      if (status.toLowerCase() === 'approved') {
        try {
          await notifyDoctorOnResultApproval({
            workspaceid,
            sampleid: updatedResult[0].sampleid,
            testname: updatedResult[0].testname,
            testcode: updatedResult[0].testcode,
            resultid,
          });
        } catch (notificationError) {
          // Don't fail the request if notification fails
        }
      }

      // Notify lab staff when results are validated
      if (status.toLowerCase() === 'validated') {
        try {
          await createWorkspaceNotification({
            workspaceid,
            type: "TEST_VALIDATED",
            title: "Test Result Validated",
            message: `Test result for ${updatedResult[0].testname} (${updatedResult[0].testcode}) has been validated.`,
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
            priority: "medium",
          });
        } catch (notificationError) {
          // Don't fail the request if notification fails
        }
      }

      // Check TAT thresholds after status change
      try {
        const { checkAndAlertTAT } = await import("@/lib/lims/tat-service");
        await checkAndAlertTAT(workspaceid, updatedResult[0].sampleid);
      } catch (tatError) {
        // Don't fail the request if TAT check fails
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
