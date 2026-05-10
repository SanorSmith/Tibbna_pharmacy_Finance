/**
 * Notifications Table Schema
 * 
 * Multi-channel notification system for:
 * - LIMS events (test added, sample registered, results entered, validated)
 * - HR/Leave management notifications
 * - General system notifications
 * 
 * Supports: In-app, Email, and SMS delivery
 */
import { pgTable, uuid, text, timestamp, boolean, index, jsonb, varchar } from "drizzle-orm/pg-core";
import { users } from "./user";
import { workspaces } from "./workspace";

export const NOTIFICATION_TYPES = {
  // LIMS notifications
  TEST_ADDED: "TEST_ADDED",
  SAMPLE_REGISTERED: "SAMPLE_REGISTERED",
  RESULT_ENTERED: "RESULT_ENTERED",
  TEST_VALIDATED: "TEST_VALIDATED",
  RESULT_APPROVED: "RESULT_APPROVED",
  RESULTS_RELEASED: "RESULTS_RELEASED",
  TAT_ALERT: "TAT_ALERT",
  // HR/Leave notifications
  LEAVE_REQUEST: "LEAVE_REQUEST",
  LEAVE_APPROVED: "LEAVE_APPROVED",
  LEAVE_REJECTED: "LEAVE_REJECTED",
  // General notifications
  SYSTEM_ALERT: "SYSTEM_ALERT",
  USER_MENTION: "USER_MENTION",
} as const;

export type NotificationTypeType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

export const NOTIFICATION_CATEGORIES = {
  LIMS: "LIMS",
  LEAVE: "LEAVE",
  SYSTEM: "SYSTEM",
  HR: "HR",
} as const;

export const NOTIFICATION_PRIORITIES = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;

export const notifications = pgTable("notifications", {
  notificationid: uuid("notificationid").primaryKey().defaultRandom(),
  // Organization/Workspace
  organization_id: uuid("organization_id").notNull().default('00000000-0000-0000-0000-000000000001'),
  // Recipient information
  recipient_id: uuid("recipient_id").notNull(),
  recipient_name: varchar("recipient_name", { length: 255 }),
  recipient_email: varchar("recipient_email", { length: 255 }),
  recipient_phone: varchar("recipient_phone", { length: 50 }),
  // Notification details
  notification_type: varchar("notification_type", { length: 50 }).notNull(),
  category: varchar("category", { length: 50 }).default('LEAVE'),
  priority: varchar("priority", { length: 20 }).default('NORMAL'),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  // Action button
  action_url: varchar("action_url", { length: 500 }),
  action_label: varchar("action_label", { length: 100 }),
  // Related entity (for LIMS: sampleid, testid, orderid, etc.)
  related_entity_type: varchar("related_entity_type", { length: 50 }),
  related_entity_id: uuid("related_entity_id"),
  // Delivery channels
  send_email: boolean("send_email").default(true),
  send_sms: boolean("send_sms").default(false),
  send_in_app: boolean("send_in_app").default(true),
  // Email delivery tracking
  email_sent: boolean("email_sent").default(false),
  email_sent_at: timestamp("email_sent_at", { withTimezone: true }),
  email_error: text("email_error"),
  // SMS delivery tracking
  sms_sent: boolean("sms_sent").default(false),
  sms_sent_at: timestamp("sms_sent_at", { withTimezone: true }),
  sms_error: text("sms_error"),
  // Read status
  is_read: boolean("is_read").default(false),
  read_at: timestamp("read_at", { withTimezone: true }),
  // Additional data
  metadata: jsonb("metadata").default({}),
  // Timestamps
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  expires_at: timestamp("expires_at", { withTimezone: true }),
}, (table) => {
  return {
    orgIdx: index("idx_notifications_org").on(table.organization_id),
    recipientIdx: index("idx_notifications_recipient").on(table.recipient_id),
    typeIdx: index("idx_notifications_type").on(table.notification_type),
    categoryIdx: index("idx_notifications_category").on(table.category),
    readIdx: index("idx_notifications_read").on(table.is_read),
    createdIdx: index("idx_notifications_created").on(table.created_at),
    entityIdx: index("idx_notifications_entity").on(table.related_entity_type, table.related_entity_id),
  };
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
