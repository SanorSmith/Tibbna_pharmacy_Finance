/**
 * Test Catalog API Route
 * GET /api/lims/test-catalog
 * 
 * Returns active tests from the lab test catalog
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labTestCatalog } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceid");

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    // Fetch active tests for workspace
    const tests = await db
      .select()
      .from(labTestCatalog)
      .where(
        and(
          eq(labTestCatalog.workspaceid, workspaceId),
          eq(labTestCatalog.isactive, true)
        )
      )
      .orderBy(labTestCatalog.testcategory, labTestCatalog.testname);

    return NextResponse.json({
      tests,
      total: tests.length,
    });
  } catch (error) {
    console.error("Error fetching test catalog:", error);
    return NextResponse.json(
      { error: "Failed to fetch test catalog" },
      { status: 500 }
    );
  }
}
