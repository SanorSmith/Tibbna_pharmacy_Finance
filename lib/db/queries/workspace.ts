import { db } from "@/lib/db";
import {
  workspaces,
  workspaceusers,
  Workspace,
  WorkspaceUserRole,
  UserWorkspace,
} from "@/lib/db/tables/workspace";
import { eq, and, desc } from "drizzle-orm";
import { cache } from "react";

export async function getWorkspaceById(
  workspaceId: string,
): Promise<Workspace | null> {
  try {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.workspaceid, workspaceId))
      .limit(1);

    return workspace || null;
  } catch (error) {
    console.error("Error getting workspace by ID:", error);
    return null;
  }
}

export const getUserWorkspaces = cache(async function (
  userId: string,
  role?: WorkspaceUserRole,
): Promise<UserWorkspace[]> {
  try {
    const results = await db
      .select({
        workspace: workspaces,
        role: workspaceusers.role,
      })
      .from(workspaceusers)
      .innerJoin(
        workspaces,
        eq(workspaceusers.workspaceid, workspaces.workspaceid),
      )
      .where(
        and(
          eq(workspaceusers.userid, userId),
          role ? eq(workspaceusers.role, role) : undefined,
        ),
      )
      .orderBy(desc(workspaces.createdat));

    return results.map((result) => ({
      workspace: result.workspace,
      role: result.role,
    }));
  } catch (error) {
    console.error("Error getting user workspaces:", error);
    return [];
  }
});
