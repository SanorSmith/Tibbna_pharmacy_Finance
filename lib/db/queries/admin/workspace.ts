import { db } from "@/lib/db";
import {
  workspaces,
  WorkspaceUserRole,
  workspaceusers,
} from "@/lib/db/tables/workspace";
import { eq, and, ilike, or, desc } from "drizzle-orm";
import { WorkspaceType } from "@/lib/db/tables/workspace";
import { WorkspaceSettings } from "@/lib/db/tables/workspace";
import { Workspace } from "@/lib/db/tables/workspace";
import { WorkspaceUser } from "@/lib/db/tables/workspace";
import { User, users } from "@/lib/db/tables/user";
import { withAdminCheck } from "./shared";

export const deleteWorkspace = withAdminCheck(
  async (workspaceId: string): Promise<boolean> => {
    try {
      // Delete workspace users
      await db
        .delete(workspaceusers)
        .where(eq(workspaceusers.workspaceid, workspaceId));

      // Delete workspace
      await db
        .delete(workspaces)
        .where(eq(workspaces.workspaceid, workspaceId));
      return true;
    } catch (error) {
      console.error("Error deleting workspace:", error);
      return false;
    }
  }
);

export const createWorkspace = withAdminCheck(
  async (
    name: string,
    type: WorkspaceType,
    description?: string,
    settings?: WorkspaceSettings
  ): Promise<Workspace | null> => {
    try {
      const [workspace] = await db
        .insert(workspaces)
        .values({
          name,
          type,
          description,
          settings: settings || {},
        })
        .returning();

      return workspace;
    } catch (error) {
      console.error("Error creating workspace:", error);
      return null;
    }
  }
);

export const getWorkspaceUsers = withAdminCheck(
  async (workspaceId: string): Promise<(WorkspaceUser & { user: User })[]> => {
    try {
      const results = await db
        .select()
        .from(workspaceusers)
        .innerJoin(users, eq(workspaceusers.userid, users.userid))
        .where(eq(workspaceusers.workspaceid, workspaceId))
        .orderBy(workspaceusers.createdat);

      return results.map((result) => ({
        ...result.workspaceusers,
        user: result.users,
      }));
    } catch (error) {
      console.error("Error getting workspace users:", error);
      return [];
    }
  }
);

export const addUserToWorkspace = withAdminCheck(
  async (
    workspaceId: string,
    userId: string,
    role: WorkspaceUserRole
  ): Promise<WorkspaceUser | null> => {
    try {
      const [workspaceUser] = await db
        .insert(workspaceusers)
        .values({
          workspaceid: workspaceId,
          userid: userId,
          role,
        })
        .returning();

      return workspaceUser;
    } catch (error) {
      console.error("Error adding user to workspace:", error);
      return null;
    }
  }
);

export const removeUserFromWorkspace = withAdminCheck(
  async (workspaceId: string, userId: string): Promise<boolean> => {
    try {
      await db
        .delete(workspaceusers)
        .where(
          and(
            eq(workspaceusers.workspaceid, workspaceId),
            eq(workspaceusers.userid, userId)
          )
        );

      return true;
    } catch (error) {
      console.error("Error removing user from workspace:", error);
      return false;
    }
  }
);

export const updateUserWorkspaceRole = withAdminCheck(
  async (
    workspaceId: string,
    userId: string,
    role: WorkspaceUserRole
  ): Promise<boolean> => {
    try {
      await db
        .update(workspaceusers)
        .set({ role })
        .where(
          and(
            eq(workspaceusers.workspaceid, workspaceId),
            eq(workspaceusers.userid, userId)
          )
        );

      return true;
    } catch (error) {
      console.error("Error updating user workspace role:", error);
      return false;
    }
  }
);

export async function checkUserWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<WorkspaceUserRole | null> {
  try {
    const [result] = await db
      .select({ role: workspaceusers.role })
      .from(workspaceusers)
      .where(
        and(
          eq(workspaceusers.userid, userId),
          eq(workspaceusers.workspaceid, workspaceId)
        )
      )
      .limit(1);

    return result?.role || null;
  } catch (error) {
    console.error("Error checking user workspace access:", error);
    return null;
  }
}

export const getAllWorkspaces = withAdminCheck(async (limit: number = 50, offset: number = 0): Promise<Workspace[]> => {
  try {
    return await db
      .select()
      .from(workspaces)
      .orderBy(desc(workspaces.createdat))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error getting workspaces:", error);
    return [];
  }
});

export const searchWorkspaces = withAdminCheck(async (query: string, limit: number = 50): Promise<Workspace[]> => {
  try {
    return await db
      .select()
      .from(workspaces)
      .where(
        or(
          ilike(workspaces.name, `%${query}%`),
          ilike(workspaces.description, `%${query}%`)
        )
      )
      .orderBy(desc(workspaces.createdat))
      .limit(limit);
  } catch (error) {
    console.error("Error searching workspaces:", error);
    return [];
  }
});
