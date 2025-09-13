"use server";

import { getUser, auth } from "@/lib/user";
import { signOut } from "@/lib/user";
import {
  invalidateSession,
  invalidateAllUserSessions,
} from "@/lib/db/queries/user";

export async function logoutUser(): Promise<{ success: boolean }> {
  try {
    // Get current session to invalidate it
    const session = await auth();
    if (session?.sessionToken) {
      await invalidateSession(session.sessionToken);
    }

    await signOut({ redirectTo: "/" });
    return { success: true };
  } catch (error) {
    console.error("Error logging out:", error);
    return { success: false };
  }
}

export async function logoutAllDevices(): Promise<{ success: boolean }> {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false };
    }

    // Invalidate ALL sessions for this user
    await invalidateAllUserSessions(user.userid);

    // Also sign out the current session
    await signOut({ redirectTo: "/" });
    return { success: true };
  } catch (error) {
    console.error("Error logging out from all devices:", error);
    return { success: false };
  }
}
