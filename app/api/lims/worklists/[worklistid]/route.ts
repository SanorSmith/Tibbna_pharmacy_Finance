/**
 * Worklist Detail API Route - DELETE
 * DELETE /api/lims/worklists/[worklistid]
 * 
 * Deletes a specific worklist and all its items
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { worklists, worklistItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ worklistid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { worklistid } = await params;

    if (!worklistid) {
      return NextResponse.json({ error: "Worklist ID required" }, { status: 400 });
    }

    // Delete worklist items first (foreign key constraint)
    await db
      .delete(worklistItems)
      .where(eq(worklistItems.worklistid, worklistid));

    // Delete the worklist
    const result = await db
      .delete(worklists)
      .where(eq(worklists.worklistid, worklistid))
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Worklist not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Worklist deleted successfully",
    });
  } catch (error) {
    console.error("Worklist deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete worklist", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
