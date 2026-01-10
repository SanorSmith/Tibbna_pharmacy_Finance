/**
 * Test Result Validation API Route
 * Handles validation workflow and status changes
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { testResults, resultValidationHistory } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
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

    let newStatus = existingResult[0].status;
    const updateData: any = {
      updatedby: user.userid,
      updatedat: new Date(),
    };

    switch (validatedData.action) {
      case "validate_technical":
        newStatus = "validated";
        updateData.technicalvalidatedby = user.userid;
        updateData.technicalvalidateddate = new Date();
        updateData.technicalvalidationcomment = validatedData.comment;
        updateData.status = newStatus;
        break;

      case "validate_medical":
        newStatus = "approved";
        updateData.medicalvalidatedby = user.userid;
        updateData.medicalvalidateddate = new Date();
        updateData.medicalvalidationcomment = validatedData.comment;
        updateData.status = newStatus;
        break;

      case "release":
        newStatus = "released";
        updateData.releasedby = user.userid;
        updateData.releaseddate = new Date();
        updateData.status = newStatus;
        break;

      case "reject":
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

    return NextResponse.json({ result: updatedResult[0] });
  } catch (error) {
    console.error("Error validating test result:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to validate test result" }, { status: 500 });
  }
}
