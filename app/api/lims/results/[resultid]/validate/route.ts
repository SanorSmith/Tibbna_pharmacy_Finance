/**
 * Test Result Validation API Route
 * Handles validation workflow and status changes
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { testResults, resultValidationHistory } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { notifyDoctorOnResultRelease, notifyDoctorOnResultApproval } from "@/lib/notifications";
import { z } from "zod";

const statusChangeSchema = z.object({
  action: z.enum(["validate_technical", "validate_medical", "release", "reject"]),
  comment: z.string().optional(),
  rejectionreason: z.string().optional(),
});

export async function POST(
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
    const validatedData = statusChangeSchema.parse(body);

    const existingResult = await db
      .select()
      .from(testResults)
      .where(and(eq(testResults.workspaceid, workspaceid), eq(testResults.resultid, resultid)))
      .limit(1);

    if (existingResult.length === 0) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    const currentStatus = existingResult[0].status;
    let newStatus = currentStatus;
    const updateData: any = {
      updatedby: user.userid,
      updatedat: new Date(),
    };

    // ── Enforce multi-level validation chain ──
    // Valid transitions:
    //   draft → validated (technical validation)
    //   validated → approved (medical/clinical validation)
    //   approved → released (final release to doctor)
    //   any non-released → rejected / rerun
    switch (validatedData.action) {
      case "validate_technical":
        if (currentStatus !== "draft" && currentStatus !== "pending") {
          return NextResponse.json(
            { error: `Cannot perform technical validation: result is currently "${currentStatus}". Technical validation requires status "draft".` },
            { status: 400 }
          );
        }
        newStatus = "validated";
        updateData.technicalvalidatedby = user.userid;
        updateData.technicalvalidateddate = new Date();
        updateData.technicalvalidationcomment = validatedData.comment;
        updateData.status = newStatus;
        break;

      case "validate_medical":
        if (currentStatus !== "validated") {
          return NextResponse.json(
            { error: `Cannot perform medical validation: result is currently "${currentStatus}". Medical validation requires technical validation first (status "validated").` },
            { status: 400 }
          );
        }
        newStatus = "approved";
        updateData.medicalvalidatedby = user.userid;
        updateData.medicalvalidateddate = new Date();
        updateData.medicalvalidationcomment = validatedData.comment;
        updateData.status = newStatus;
        break;

      case "release":
        if (currentStatus === "released") {
          return NextResponse.json(
            { error: `Cannot release: result has already been released.` },
            { status: 400 }
          );
        }
        newStatus = "released";
        updateData.releasedby = user.userid;
        updateData.releaseddate = new Date();
        updateData.status = newStatus;
        break;

      case "reject":
        if (currentStatus === "released") {
          return NextResponse.json(
            { error: "Cannot reject: result has already been released." },
            { status: 400 }
          );
        }
        newStatus = "rejected";
        updateData.status = newStatus;
        updateData.markedforrerun = true;
        updateData.rerunreason = validatedData.rejectionreason;
        break;
    }

    const updatedResult = await db
      .update(testResults)
      .set(updateData)
      .where(and(eq(testResults.workspaceid, workspaceid), eq(testResults.resultid, resultid)))
      .returning();

    await db.insert(resultValidationHistory).values({
      resultid,
      action: validatedData.action,
      previousstatus: existingResult[0].status,
      newstatus: newStatus,
      validatedby: user.userid,
      validationlevel: validatedData.action.replace("validate_", ""),
      comment: validatedData.comment,
      rejectionreason: validatedData.rejectionreason,
      workspaceid,
    });

    // Notify the ordering doctor when results are approved (medical validation)
    if (newStatus === "approved") {
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

    // Notify the ordering doctor when results are released
    if (newStatus === "released") {
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

    // Check TAT thresholds after validation state change
    try {
      const { checkAndAlertTAT } = await import("@/lib/lims/tat-service");
      await checkAndAlertTAT(workspaceid, updatedResult[0].sampleid);
    } catch (tatError) {
      // Don't fail the request if TAT check fails
    }

    return NextResponse.json({ result: updatedResult[0] });
  } catch (error) {
    console.error("Error validating test result:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to validate test result" }, { status: 500 });
  }
}
