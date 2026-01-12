/**
 * Notification Service
 * 
 * Handles creating notifications for LIMS events
 */

import { db } from "@/lib/db";
import { notifications, workspaceusers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { NotificationTypeType } from "@/lib/db/tables/notifications";

interface CreateNotificationParams {
  workspaceid: string;
  type: NotificationTypeType;
  title: string;
  message: string;
  relatedentityid?: string;
  relatedentitytype?: string;
  metadata?: Record<string, unknown>;
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
    
    // Get all users in the workspace
    const workspaceUsers = await db
      .select({ userid: workspaceusers.userid })
      .from(workspaceusers)
      .where(eq(workspaceusers.workspaceid, workspaceid));


    if (workspaceUsers.length === 0) {
      return { success: true, count: 0 };
    }

    // Create notification for each user
    const notificationPromises = workspaceUsers.map(async (user) => {
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
    return { success: true, count: workspaceUsers.length };
  } catch (error) {
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
    
    const conditions = [
      eq(notifications.userid, userid ),
      eq(notifications.workspaceid, workspaceid ),
    ];

    if (unreadOnly) {
      conditions.push(eq(notifications.read, false));
    }


    const userNotifications = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdat))
      .limit(limit);

    return { success: true, notifications: userNotifications };
  } catch (error) {
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
        eq(notifications.userid, userid ),
        eq(notifications.workspaceid, workspaceid ),
        eq(notifications.read, false)
      ));
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * Delete a specific notification for a user
 */
export async function deleteNotification(notificationid: string, userid: string) {
  try {
    await db
      .delete(notifications)
      .where(and(
        eq(notifications.notificationid, notificationid),
        eq(notifications.userid, userid )
      ));
    return { success: true };
  } catch (error) {
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
    return { success: false, error, count: 0 };
  }
}
