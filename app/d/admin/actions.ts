"use server";

import { revalidatePath } from "next/cache";
import { createNewUser, deleteUser } from "@/lib/db/queries/admin/user";
import {
  createWorkspace,
  deleteWorkspace,
} from "@/lib/db/queries/admin/workspace";
import { NewUser, UserPermissions } from "@/lib/db/tables/user";
import { WorkspaceType } from "@/lib/db/tables/workspace";

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
