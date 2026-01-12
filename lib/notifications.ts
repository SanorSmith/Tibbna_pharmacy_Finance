/**
 * Notification Service
 * 
 * Handles creating notifications for LIMS events
 */

import { db } from "@/lib/db";
import { notifications, users, workspaces, workspaceusers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { NOTIFICATION_TYPES, NotificationTypeType } from "@/lib/db/tables/notifications";

interface CreateNotificationParams {
  workspaceid: string;
  type: NotificationTypeType;
  title: string;
  message: string;
  relatedentityid?: string;
  relatedentitytype?: string;
  metadata?: Record<string, any>;
  priority?: "low" | "medium" | "high";
}

/**
 * Create a notification for all users in a workspace
 */
export async function createWorkspaceNotification({
  workspaceid,
  type,
  title,
  message,
  relatedentityid,
  relatedentitytype,
  metadata,
  priority = "medium"
}: CreateNotificationParams) {
  try {
    console.log("📝 Creating workspace notification:", { workspaceid, type, title });
    
    // Get all users in the workspace
    const workspaceUsers = await db
      .select({ userid: workspaceusers.userid })
      .from(workspaceusers)
      .where(eq(workspaceusers.workspaceid, workspaceid as any));

    console.log(`👥 Found ${workspaceUsers.length} users in workspace`);

    if (workspaceUsers.length === 0) {
      console.warn("⚠️ No users found in workspace, no notifications created");
      return { success: true, count: 0 };
    }

    // Create notification for each user
    const notificationPromises = workspaceUsers.map(async (user) => {
      console.log(`🔔 Creating notification for user: ${user.userid}`);
      return await db.insert(notifications).values({
        workspaceid,
        userid: user.userid,
        type,
        title,
        message,
        relatedentityid,
        relatedentitytype,
        metadata: metadata || {},
        priority,
        read: false,
      });
    });

    await Promise.all(notificationPromises);
    console.log(`✅ Successfully created ${workspaceUsers.length} notifications`);
    return { success: true, count: workspaceUsers.length };
  } catch (error) {
    console.error("❌ Failed to create workspace notification:", error);
    return { success: false, error };
  }
}

/**
 * Create a notification for a specific user
 */
export async function createUserNotification({
  workspaceid,
  userid,
  type,
  title,
  message,
  relatedentityid,
  relatedentitytype,
  metadata,
  priority = "medium"
}: CreateNotificationParams & { userid: string }) {
  try {
    await db.insert(notifications).values({
      workspaceid,
      userid,
      type,
      title,
      message,
      relatedentityid,
      relatedentitytype,
      metadata: metadata || {},
      priority,
      read: false,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to create user notification:", error);
    return { success: false, error };
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userid: string,
  workspaceid: string,
  limit: number = 50,
  unreadOnly: boolean = false
) {
  try {
    console.log("🔎 Getting user notifications:", { userid, workspaceid, limit, unreadOnly });
    
    const conditions = [
      eq(notifications.userid, userid as any),
      eq(notifications.workspaceid, workspaceid as any),
    ];

    if (unreadOnly) {
      conditions.push(eq(notifications.read, false));
    }

    console.log("📊 Query conditions:", conditions);

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdat))
      .limit(limit);

    console.log(`📬 Found ${userNotifications.length} notifications for user`);
    return { success: true, notifications: userNotifications };
  } catch (error) {
    console.error("❌ Failed to get user notifications:", error);
    return { success: false, error, notifications: [] };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationid: string, userid: string) {
  try {
    await db
      .update(notifications)
      .set({ read: true, updatedat: new Date() })
      .where(and(
        eq(notifications.notificationid, notificationid),
        eq(notifications.userid, userid)
      ));
    return { success: true };
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    return { success: false, error };
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userid: string, workspaceid: string) {
  try {
    await db
      .update(notifications)
      .set({ read: true, updatedat: new Date() })
      .where(and(
        eq(notifications.userid, userid as any),
        eq(notifications.workspaceid, workspaceid as any),
        eq(notifications.read, false)
      ));
    return { success: true };
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
    return { success: false, error };
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userid: string, workspaceid: string) {
  try {
    const result = await db
      .select({ count: notifications })
      .from(notifications)
      .where(and(
        eq(notifications.userid, userid),
        eq(notifications.workspaceid, workspaceid),
        eq(notifications.read, false)
      ));
    
    return { success: true, count: result.length };
  } catch (error) {
    console.error("Failed to get unread notification count:", error);
    return { success: false, error, count: 0 };
  }
}
