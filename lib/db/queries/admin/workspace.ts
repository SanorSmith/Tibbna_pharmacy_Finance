import { db } from "@/lib/db";
import {
  workspaces,
  WorkspaceUserRole,
  workspaceusers,
} from "@/lib/db/tables/workspace";
import { eq, and, ilike, or, desc, not, sql } from "drizzle-orm";
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
  },
);

export const createWorkspace = withAdminCheck(
  async (
    name: string,
    type: WorkspaceType,
    description?: string,
    settings?: WorkspaceSettings,
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
  },
);

export const getWorkspaceUsers = withAdminCheck(
  async (workspaceId: string): Promise<(WorkspaceUser & { user: User })[]> => {
    try {
      const results = await db
        .select()
        .from(workspaceusers)
        .innerJoin(users, eq(workspaceusers.userid, users.userid))
        .where(
          and(
            eq(workspaceusers.workspaceid, workspaceId),
            or(
              sql`${users.permissions} IS NULL`,
              sql`${users.permissions} = '[]'::jsonb`,
              not(sql`${users.permissions} ? 'admin'`),
            ),
          ),
        )
        .orderBy(workspaceusers.createdat);

      return results.map((result) => ({
        ...result.workspaceusers,
        user: result.users,
      }));
    } catch (error) {
      console.error("Error getting workspace users:", error);
      return [];
    }
  },
);

export const addUserToWorkspace = withAdminCheck(
  async (
    workspaceId: string,
    userId: string,
    role: WorkspaceUserRole,
  ): Promise<WorkspaceUser | null> => {
    try {
      // First check if the user is an admin - prevent adding admin users
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.userid, userId),
            or(
              sql`${users.permissions} IS NULL`,
              sql`${users.permissions} = '[]'::jsonb`,
              not(sql`${users.permissions} ? 'admin'`),
            ),
          ),
        )
        .limit(1);

      if (!user) {
        throw new Error("Cannot add admin users to workspaces");
      }

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
  },
);

export const removeUserFromWorkspace = withAdminCheck(
  async (workspaceId: string, userId: string): Promise<boolean> => {
    try {
      await db
        .delete(workspaceusers)
        .where(
          and(
            eq(workspaceusers.workspaceid, workspaceId),
            eq(workspaceusers.userid, userId),
          ),
        );

      return true;
    } catch (error) {
      console.error("Error removing user from workspace:", error);
      return false;
    }
  },
);

export const updateUserWorkspaceRole = withAdminCheck(
  async (
    workspaceId: string,
    userId: string,
    role: WorkspaceUserRole,
  ): Promise<boolean> => {
    try {
      await db
        .update(workspaceusers)
        .set({ role })
        .where(
          and(
            eq(workspaceusers.workspaceid, workspaceId),
            eq(workspaceusers.userid, userId),
          ),
        );

      return true;
    } catch (error) {
      console.error("Error updating user workspace role:", error);
      return false;
    }
  },
);

export async function checkUserWorkspaceAccess(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceUserRole | null> {
  try {
    const [result] = await db
      .select({ role: workspaceusers.role })
      .from(workspaceusers)
      .where(
        and(
          eq(workspaceusers.userid, userId),
          eq(workspaceusers.workspaceid, workspaceId),
        ),
      )
      .limit(1);

    return result?.role || null;
  } catch (error) {
    console.error("Error checking user workspace access:", error);
    return null;
  }
}

export const getAllWorkspaces = withAdminCheck(
  async (limit: number = 50, offset: number = 0): Promise<Workspace[]> => {
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
  },
);

export const searchWorkspaces = withAdminCheck(
  async (query: string, limit: number = 50): Promise<Workspace[]> => {
    try {
      return await db
        .select()
        .from(workspaces)
        .where(
          or(
            ilike(workspaces.name, `%${query}%`),
            ilike(workspaces.description, `%${query}%`),
          ),
        )
        .orderBy(desc(workspaces.createdat))
        .limit(limit);
    } catch (error) {
      console.error("Error searching workspaces:", error);
      return [];
    }
  },
);

export const updateWorkspace = withAdminCheck(
  async (
    workspaceId: string,
    updates: Partial<Pick<Workspace, "name" | "type" | "description">>,
  ): Promise<Workspace | null> => {
    try {
      const [updatedWorkspace] = await db
        .update(workspaces)
        .set({
          ...updates,
          updatedat: new Date(),
        })
        .where(eq(workspaces.workspaceid, workspaceId))
        .returning();

      return updatedWorkspace || null;
    } catch (error) {
      console.error("Error updating workspace:", error);
      return null;
    }
  },
);

export const getUserWorkspaces = withAdminCheck(
  async (
    userId: string,
  ): Promise<(WorkspaceUser & { workspace: Workspace })[]> => {
    try {
      const results = await db
        .select()
        .from(workspaceusers)
        .innerJoin(
          workspaces,
          eq(workspaceusers.workspaceid, workspaces.workspaceid),
        )
        .where(eq(workspaceusers.userid, userId))
        .orderBy(workspaceusers.createdat);

      return results.map((result) => ({
        ...result.workspaceusers,
        workspace: result.workspaces,
      }));
    } catch (error) {
      console.error("Error getting user workspaces:", error);
      return [];
    }
  },
);
