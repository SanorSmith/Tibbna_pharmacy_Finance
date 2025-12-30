import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/tables/workspace";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid } = await params;

    // Fetch workspace information
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.workspaceid, workspaceid))
      .limit(1);

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("Error fetching workspace info:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspace info" },
      { status: 500 }
    );
  }
}
