import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { ValidationService } from "@/lib/lims/validation-service";
import { db } from "@/lib/db";
import { workspaceusers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * POST /api/lims/samples/[sampleid]/release
 * Release validated results - triggers domain event for openEHR integration
 * This is the final step in the validation workflow
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
    const { workspaceid } = body;

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

    // Release results - this will validate business rules and emit domain event
    const result = await ValidationService.releaseResults({
      sampleid,
      userid: user.userid,
      userrole: userRole,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Release failed",
          violations: result.violations,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Results released successfully. openEHR integration will be triggered.",
    });
  } catch (error) {
    console.error("[API] Error releasing results:", error);
    return NextResponse.json(
      { error: "Failed to release results" },
      { status: 500 }
    );
  }
}
