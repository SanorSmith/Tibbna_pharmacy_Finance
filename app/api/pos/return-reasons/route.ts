/**
 * POS Return Reasons API
 *
 * GET — List active return reasons for a workspace.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posReturnReasons } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Missing workspaceId" },
        { status: 400 }
      );
    }

    const reasons = await db
      .select()
      .from(posReturnReasons)
      .where(
        and(
          eq(posReturnReasons.workspaceid, workspaceId),
          eq(posReturnReasons.isactive, true)
        )
      )
      .orderBy(asc(posReturnReasons.displayorder));

    return NextResponse.json({ reasons });
  } catch (error) {
    console.error("[Return Reasons] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch return reasons" },
      { status: 500 }
    );
  }
}
