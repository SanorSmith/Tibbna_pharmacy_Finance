/**
 * API: /api/admin/update-user-role
 * - POST: Update user role in workspace
 * - Requires admin permissions
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, workspaceusers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

export async function POST(req: NextRequest) {
  // Require authentication
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin permissions
  const normalizePerms = (perms: unknown): string[] => {
    try {
      if (Array.isArray(perms)) return perms as string[];
      if (typeof perms === "string") {
        const trimmed = perms.trim();
        const dequoted = trimmed.startsWith("'") && trimmed.endsWith("'")
          ? trimmed.slice(1, -1)
          : trimmed;
        const parsed = JSON.parse(dequoted);
        if (Array.isArray(parsed)) return parsed as string[];
      }
    } catch {}
    return [];
  };
  
  const isGlobalAdmin = normalizePerms(user.permissions).includes("admin");
  if (!isGlobalAdmin) {
    return NextResponse.json({ error: "Admin permissions required" }, { status: 403 });
  }

  try {
    const { email, role, workspaceid } = await req.json();

    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
    }

    // Valid roles
    const validRoles = ["doctor", "nurse", "lab_technician", "pharmacist", "receptionist", "administrator"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Find the user
    const targetUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (targetUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If workspaceid provided, update workspace user role
    if (workspaceid) {
      // Check if workspace user exists
      const existingWorkspaceUser = await db
        .select()
        .from(workspaceusers)
        .where(and(
          eq(workspaceusers.userid, targetUser[0].userid),
          eq(workspaceusers.workspaceid, workspaceid)
        ))
        .limit(1);

      if (existingWorkspaceUser.length === 0) {
        // Create new workspace user entry
        await db.insert(workspaceusers).values({
          userid: targetUser[0].userid,
          workspaceid: workspaceid,
          role: role,
        });
      } else {
        // Update existing role
        await db
          .update(workspaceusers)
          .set({ role: role })
          .where(and(
            eq(workspaceusers.userid, targetUser[0].userid),
            eq(workspaceusers.workspaceid, workspaceid)
          ));
      }

      return NextResponse.json({
        success: true,
        message: `User role updated to ${role} in workspace`,
        email: email,
        role: role,
        workspaceid: workspaceid
      });
    } else {
      // Update all workspace roles for this user (admin function)
      await db
        .update(workspaceusers)
        .set({ role: role })
        .where(eq(workspaceusers.userid, targetUser[0].userid));

      return NextResponse.json({
        success: true,
        message: `User role updated to ${role} in all workspaces`,
        email: email,
        role: role
      });
    }

  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json({ error: "Failed to update user role" }, { status: 500 });
  }
}
