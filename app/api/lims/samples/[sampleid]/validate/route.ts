import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { ValidationService } from "@/lib/lims/validation-service";
import { VALIDATION_STATES, workspaceusers } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { and, eq } from "drizzle-orm";

/**
 * POST /api/lims/samples/[sampleid]/validate
 * Validate test results and transition to CLINICALLY_VALIDATED state
 * Requires clinical validation role
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sampleid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sampleid } = await params;
    const body = await request.json();

    const { resultids, comments, validateAll, workspaceid } = body;

    if (!resultids || !Array.isArray(resultids)) {
      return NextResponse.json(
        { error: "resultids array is required" },
        { status: 400 }
      );
    }

    if (!workspaceid) {
      return NextResponse.json(
        { error: "workspaceid is required" },
        { status: 400 }
      );
    }

    // Get user's role in this workspace
    const workspaceUser = await db.query.workspaceusers.findFirst({
      where: and(
        eq(workspaceusers.userid, user.userid),
        eq(workspaceusers.workspaceid, workspaceid)
      ),
    });

    const userRole = workspaceUser?.role || "user";

    // Validate results with comments
    const validateResult = await ValidationService.validateResults({
      sampleid,
      resultids,
      userid: user.userid,
      userrole: userRole,
      comments,
    });

    if (!validateResult.success) {
      return NextResponse.json(
        { error: "Validation failed", violations: validateResult.violations },
        { status: 400 }
      );
    }

    // If validateAll is true, transition to CLINICALLY_VALIDATED state
    if (validateAll) {
      const transitionResult = await ValidationService.transitionState({
        sampleid,
        targetState: VALIDATION_STATES.CLINICALLY_VALIDATED,
        userid: user.userid,
        userrole: userRole,
      });

      if (!transitionResult.success) {
        return NextResponse.json(
          {
            error: "State transition failed",
            violations: transitionResult.violations,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: validateAll
        ? "Results validated and sample marked as clinically validated"
        : "Results validated successfully",
    });
  } catch (error) {
    console.error("[API] Error validating results:", error);
    return NextResponse.json(
      { error: "Failed to validate results" },
      { status: 500 }
    );
  }
}
