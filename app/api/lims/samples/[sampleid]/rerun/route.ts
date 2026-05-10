import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { ValidationService } from "@/lib/lims/validation-service";
import { db } from "@/lib/db";
import { workspaceusers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * POST /api/lims/samples/[sampleid]/rerun
 * Request rerun for specific test results
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
    const { resultids, reason, workspaceid } = body;

    if (!resultids || !Array.isArray(resultids)) {
      return NextResponse.json(
        { error: "resultids array is required" },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: "Rerun reason is required" },
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

    const result = await ValidationService.requestRerun({
      sampleid,
      resultids,
      userid: user.userid,
      userrole: userRole,
      reason,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Rerun request failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Rerun requested successfully",
    });
  } catch (error) {
    console.error("[API] Error requesting rerun:", error);
    return NextResponse.json(
      { error: "Failed to request rerun" },
      { status: 500 }
    );
  }
}
