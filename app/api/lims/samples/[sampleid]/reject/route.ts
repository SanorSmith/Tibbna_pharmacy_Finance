import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { ValidationService } from "@/lib/lims/validation-service";
import { db } from "@/lib/db";
import { workspaceusers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * POST /api/lims/samples/[sampleid]/reject
 * Reject validation with reason
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
    const { reason, workspaceid } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
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

    const result = await ValidationService.rejectValidation({
      sampleid,
      userid: user.userid,
      userrole: userRole,
      reason,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Rejection failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Validation rejected successfully",
    });
  } catch (error) {
    console.error("[API] Error rejecting validation:", error);
    return NextResponse.json(
      { error: "Failed to reject validation" },
      { status: 500 }
    );
  }
}
