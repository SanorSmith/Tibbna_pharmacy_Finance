import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, workspaceusers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/user";

/**
 * GET /api/d/[workspaceid]/doctors
 * - Returns list of users in the workspace with role 'doctor'
 * - Auth required
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> },
) {
  const { workspaceid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await db
      .select({ userid: users.userid, name: users.name, email: users.email })
      .from(workspaceusers)
      .innerJoin(users, eq(workspaceusers.userid, users.userid))
      .where(and(eq(workspaceusers.workspaceid, workspaceid), eq(workspaceusers.role, "doctor")));

    return NextResponse.json({ doctors: rows });
  } catch (e) {
    console.error("[doctors][GET] error:", e);
    return NextResponse.json({ error: "Failed to load doctors" }, { status: 500 });
  }
}
