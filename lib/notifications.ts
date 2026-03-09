/**
 * Notification Service
 * 
 * Handles creating notifications for LIMS events
 */

import { db } from "@/lib/db";
import { notifications, workspaceusers } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { NotificationTypeType } from "@/lib/db/tables/notifications";
import type { WorkspaceUserRole } from "@/lib/db/tables/workspace";

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
        organization_id: workspaceid,
        recipient_id: user.userid,
        notification_type: type,
        category: 'LIMS',
        title,
        message,
        related_entity_id: relatedentityid,
        related_entity_type: relatedentitytype,
        metadata: metadata || {},
        priority: priority.toUpperCase(),
        is_read: false,
        send_in_app: true,
        send_email: false,
        send_sms: false,
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
      organization_id: workspaceid,
      recipient_id: userid,
      notification_type: type,
      category: 'LIMS',
      title,
      message,
      related_entity_id: relatedentityid,
      related_entity_type: relatedentitytype,
      metadata: metadata || {},
      priority: priority.toUpperCase(),
      is_read: false,
      send_in_app: true,
      send_email: false,
      send_sms: false,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * Create a notification for all users with a specific role in a workspace
 * Used to notify doctors when lab results are validated/released
 */
export async function createRoleNotification({
  workspaceid,
  role,
  type,
  title,
  message,
  relatedentityid,
  relatedentitytype,
  metadata,
  priority = "medium",
}: CreateNotificationParams & { role: WorkspaceUserRole }) {
  try {
    // Get all users in the workspace with the specified role
    // Use sql cast because workspaceid may be text from lims_orders but uuid in workspaceusers
    const roleUsers = await db
      .select({ userid: workspaceusers.userid })
      .from(workspaceusers)
      .where(
        and(
          sql`${workspaceusers.workspaceid}::text = ${workspaceid}`,
          eq(workspaceusers.role, role)
        )
      );

    if (roleUsers.length === 0) {
      return { success: true, count: 0 };
    }

    const notificationPromises = roleUsers.map(async (user) => {
      return await db.insert(notifications).values({
        organization_id: workspaceid,
        recipient_id: user.userid,
        notification_type: type,
        category: 'LIMS',
        title,
        message,
        related_entity_id: relatedentityid,
        related_entity_type: relatedentitytype,
        metadata: metadata || {},
        priority: priority.toUpperCase(),
        is_read: false,
        send_in_app: true,
        send_email: false,
        send_sms: false,
      });
    });

    await Promise.all(notificationPromises);
    return { success: true, count: roleUsers.length };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * Notify the ordering doctor when lab results are released.
 * Traces: test_result → accession_sample → lims_order → orderingproviderid
 * Falls back to notifying all doctors in the workspace if the ordering doctor can't be resolved.
 */
export async function notifyDoctorOnResultRelease({
  workspaceid,
  sampleid,
  testname,
  patientname,
}: {
  workspaceid: string;
  sampleid: string;
  testname: string;
  patientname: string;
}) {
  try {
    const { accessionSamples } = await import("@/lib/db/schema");

    // Get sample number
    const [sample] = await db
      .select({ samplenumber: accessionSamples.samplenumber })
      .from(accessionSamples)
      .where(eq(accessionSamples.sampleid, sampleid))
      .limit(1);

    const sampleNumber = sample?.samplenumber || "N/A";
    const notificationTitle = "Lab Results Released";
    const notificationMessage = `Results for ${testname} are now available for patient ${patientname}. Sample: ${sampleNumber}.`;
    const notificationMeta = {
      testName: testname,
      sampleId: sampleid,
      sampleNumber: sampleNumber,
      patientName: patientname,
    };

    console.log(`[Notifications] Creating RESULTS_RELEASED notification for workspace ${workspaceid}, tests: ${testname}, patient: ${patientname}`);

    // Notify all doctors in the workspace
    const result = await createRoleNotification({
      workspaceid,
      role: "doctor",
      type: "RESULTS_RELEASED" as any,
      title: notificationTitle,
      message: notificationMessage,
      relatedentityid: sampleid,
      relatedentitytype: "test_result",
      metadata: notificationMeta,
      priority: "high",
    });
    
    console.log(`[Notifications] RESULTS_RELEASED notification created for ${result.count} doctors`);
    return { success: true, notifiedDoctorCount: result.count };
  } catch (error) {
    console.error("[Notifications] Error notifying doctor on result release:", error);
    return { success: false, error };
  }
}

/**
 * Notify the ordering doctor when lab results are approved (medical validation complete).
 * Same tracing logic as notifyDoctorOnResultRelease but fires at the approved stage.
 */
export async function notifyDoctorOnResultApproval({
  workspaceid,
  sampleid,
  testname,
  testcode,
  resultid,
  patientName,
}: {
  workspaceid: string;
  sampleid: string;
  testname: string;
  testcode: string;
  resultid: string;
  patientName?: string;
}) {
  try {
    const { accessionSamples, limsOrders, patients } = await import("@/lib/db/schema");

    const [sample] = await db
      .select({
        orderid: accessionSamples.orderid,
        patientid: accessionSamples.patientid,
        samplenumber: accessionSamples.samplenumber,
      })
      .from(accessionSamples)
      .where(eq(accessionSamples.sampleid, sampleid))
      .limit(1);

    let orderingDoctorId: string | null = null;
    let resolvedPatientName = patientName || "Unknown Patient";

    if (sample?.orderid) {
      const [order] = await db
        .select({ orderingproviderid: limsOrders.orderingproviderid })
        .from(limsOrders)
        .where(eq(limsOrders.orderid, sample.orderid))
        .limit(1);

      if (order?.orderingproviderid) {
        orderingDoctorId = order.orderingproviderid;
      }
    }

    if (!patientName && sample?.patientid) {
      const [patient] = await db
        .select({ firstname: patients.firstname, lastname: patients.lastname })
        .from(patients)
        .where(eq(patients.patientid, sample.patientid))
        .limit(1);

      if (patient) {
        resolvedPatientName = `${patient.firstname} ${patient.lastname}`;
      }
    }

    const notificationTitle = "Lab Results Approved — Ready for Release";
    const notificationMessage = `${testname} (${testcode}) for patient ${resolvedPatientName} has passed medical validation and is ready for release. Sample: ${sample?.samplenumber || "N/A"}.`;
    const notificationMeta = {
      testCode: testcode,
      testName: testname,
      sampleId: sampleid,
      sampleNumber: sample?.samplenumber,
      patientName: resolvedPatientName,
    };

    if (orderingDoctorId) {
      await createUserNotification({
        workspaceid,
        userid: orderingDoctorId,
        type: "RESULT_APPROVED" as any,
        title: notificationTitle,
        message: notificationMessage,
        relatedentityid: resultid,
        relatedentitytype: "test_result",
        metadata: notificationMeta,
        priority: "high",
      });
      return { success: true, notifiedDoctor: orderingDoctorId };
    } else {
      const result = await createRoleNotification({
        workspaceid,
        role: "doctor",
        type: "RESULT_APPROVED" as any,
        title: notificationTitle,
        message: notificationMessage,
        relatedentityid: resultid,
        relatedentitytype: "test_result",
        metadata: notificationMeta,
        priority: "high",
      });
      return { success: true, notifiedDoctorCount: result.count };
    }
  } catch (error) {
    console.error("Error notifying doctor on result approval:", error);
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
      eq(notifications.recipient_id, userid),
      eq(notifications.organization_id, workspaceid),
    ];

    if (unreadOnly) {
      conditions.push(eq(notifications.is_read, false));
    }


    const userNotifications = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.created_at))
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
      .set({ is_read: true, read_at: new Date() })
      .where(and(
        eq(notifications.notificationid, notificationid),
        eq(notifications.recipient_id, userid)
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
      .set({ is_read: true, read_at: new Date() })
      .where(and(
        eq(notifications.recipient_id, userid),
        eq(notifications.organization_id, workspaceid),
        eq(notifications.is_read, false)
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
        eq(notifications.recipient_id, userid)
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
        eq(notifications.recipient_id, userid),
        eq(notifications.organization_id, workspaceid),
        eq(notifications.is_read, false)
      ));
    
    return { success: true, count: result.length };
  } catch (error) {
    return { success: false, error, count: 0 };
  }
}
