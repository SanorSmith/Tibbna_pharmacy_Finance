"use server";

import { revalidatePath } from "next/cache";
import {
  createNewUser,
  deleteUser,
  updateUser,
} from "@/lib/db/queries/admin/user";
import {
  createWorkspace,
  deleteWorkspace,
  addUserToWorkspace,
  removeUserFromWorkspace,
  updateWorkspace,
  getWorkspaceUsers,
  getUserWorkspaces,
} from "@/lib/db/queries/admin/workspace";
import { NewUser, UserPermissions } from "@/lib/db/tables/user";
import { WorkspaceType, WorkspaceUserRole } from "@/lib/db/tables/workspace";

export async function createUserAction(formData: FormData) {
  try {
    const userData: NewUser = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      permissions: formData.get("permissions")
        ? [formData.get("permissions") as UserPermissions]
        : [],
    };

    const user = await createNewUser(userData);
    if (!user) {
      return { success: false, error: "Failed to create user" };
    }

    revalidatePath("/d/admin");
    return { success: true, data: user };
  } catch {
    return { success: false, error: "Error creating user" };
  }
}

export async function deleteUserAction(formData: FormData) {
  try {
    const userid = formData.get("userid") as string;
    const success = await deleteUser(userid);

    if (!success) {
      return { success: false, error: "Failed to delete user" };
    }

    revalidatePath("/d/admin");
    return { success: true };
  } catch {
    return { success: false, error: "Error deleting user" };
  }
}

export async function createWorkspaceAction(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const type = formData.get("type") as WorkspaceType;
    const description = formData.get("description") as string;

    const workspace = await createWorkspace(name, type, description);
    if (!workspace) {
      return { success: false, error: "Failed to create workspace" };
    }

    revalidatePath("/d/admin");
    return { success: true, data: workspace };
  } catch {
    return { success: false, error: "Error creating workspace" };
  }
}

export async function deleteWorkspaceAction(formData: FormData) {
  try {
    const workspaceid = formData.get("workspaceid") as string;
    const success = await deleteWorkspace(workspaceid);

    if (!success) {
      return { success: false, error: "Failed to delete workspace" };
    }

    revalidatePath("/d/admin");
    return { success: true };
  } catch {
    return { success: false, error: "Error deleting workspace" };
  }
}

export async function addUserToWorkspaceAction(formData: FormData) {
  try {
    const workspaceid = formData.get("workspaceid") as string;
    const userid = formData.get("userid") as string;
    const role = formData.get("role") as WorkspaceUserRole;

    const result = await addUserToWorkspace(workspaceid, userid, role);
    if (!result) {
      return { success: false, error: "Failed to add user to workspace" };
    }

    revalidatePath("/d/admin");
    return { success: true, data: result };
  } catch {
    return { success: false, error: "Error adding user to workspace" };
  }
}

export async function removeUserFromWorkspaceAction(formData: FormData) {
  try {
    const workspaceid = formData.get("workspaceid") as string;
    const userid = formData.get("userid") as string;

    const success = await removeUserFromWorkspace(workspaceid, userid);
    if (!success) {
      return { success: false, error: "Failed to remove user from workspace" };
    }

    revalidatePath("/d/admin");
    return { success: true };
  } catch {
    return { success: false, error: "Error removing user from workspace" };
  }
}

export async function updateUserAction(formData: FormData) {
  try {
    const userid = formData.get("userid") as string;
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;

    const updates: Partial<{ name: string; email: string }> = {};
    if (name) updates.name = name;
    if (email) updates.email = email;

    const user = await updateUser(userid, updates);
    if (!user) {
      return { success: false, error: "Failed to update user" };
    }

    revalidatePath("/d/admin");
    return { success: true, data: user };
  } catch {
    return { success: false, error: "Error updating user" };
  }
}

export async function updateWorkspaceAction(formData: FormData) {
  try {
    const workspaceid = formData.get("workspaceid") as string;
    const name = formData.get("name") as string;
    const type = formData.get("type") as WorkspaceType;
    const description = formData.get("description") as string;

    const updates: Partial<{
      name: string;
      type: WorkspaceType;
      description: string;
    }> = {};
    if (name) updates.name = name;
    if (type) updates.type = type;
    if (description !== undefined) updates.description = description;

    const workspace = await updateWorkspace(workspaceid, updates);
    if (!workspace) {
      return { success: false, error: "Failed to update workspace" };
    }

    revalidatePath("/d/admin");
    return { success: true, data: workspace };
  } catch {
    return { success: false, error: "Error updating workspace" };
  }
}

export async function getWorkspaceUsersAction(workspaceId: string) {
  try {
    const workspaceUsers = await getWorkspaceUsers(workspaceId);
    return { success: true, data: workspaceUsers };
  } catch {
    return { success: false, error: "Error fetching workspace users" };
  }
}

export async function getUserWorkspacesAction(userId: string) {
  try {
    const userWorkspaces = await getUserWorkspaces(userId);
    return { success: true, data: userWorkspaces };
  } catch {
    return { success: false, error: "Error fetching user workspaces" };
  }
}
