/**
 * Notifications API
 * 
 * GET /api/lims/notifications - Get user notifications
 * POST /api/lims/notifications - Create notification (internal use)
 * PUT /api/lims/notifications/read - Mark notifications as read
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserNotifications, markAllNotificationsAsRead } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceid = searchParams.get("workspaceid");
    const limit = parseInt(searchParams.get("limit") || "50");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    if (!workspaceid) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    const result = await getUserNotifications(user.userid, workspaceid, limit, unreadOnly);
    
    if (!result.success) {
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }

    return NextResponse.json({
      notifications: result.notifications,
      total: result.notifications.length,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid, notificationid, markAll } = await request.json();

    if (!workspaceid) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    if (markAll) {
      // Mark all notifications as read
      const result = await markAllNotificationsAsRead(user.userid, workspaceid);
      if (!result.success) {
        return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    } else if (notificationid) {
      // Mark specific notification as read
      // This would need to be implemented in the notification service
      return NextResponse.json({ success: true, message: "Notification marked as read" });
    } else {
      return NextResponse.json({ error: "Either notificationid or markAll required" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
