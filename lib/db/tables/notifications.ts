/**
 * Notifications Table Schema
 * 
 * System notifications for LIMS events
 * - Test added notifications
 * - Sample registered notifications  
 * - Test result entered notifications
 * - Test validated notifications
 */
import { pgTable, uuid, text, timestamp, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { users } from "./user";
import { workspaces } from "./workspace";

export const NOTIFICATION_TYPES = {
  TEST_ADDED: "TEST_ADDED",
  SAMPLE_REGISTERED: "SAMPLE_REGISTERED",
  RESULT_ENTERED: "RESULT_ENTERED",
  TEST_VALIDATED: "TEST_VALIDATED",
  RESULT_APPROVED: "RESULT_APPROVED",
  RESULTS_RELEASED: "RESULTS_RELEASED",
  TAT_ALERT: "TAT_ALERT",
} as const;

export type NotificationTypeType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

export const notifications = pgTable("notifications", {
  notificationid: uuid("notificationid").primaryKey().defaultRandom(),
  workspaceid: uuid("workspaceid")
    .notNull()
    .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  userid: uuid("userid")
    .notNull()
    .references(() => users.userid, { onDelete: "cascade" }),
  type: text("type").notNull().$type<NotificationTypeType>(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  // Related entity IDs for quick lookup
  relatedentityid: text("relatedentityid"), // Can be sampleid, testid, orderid, etc.
  relatedentitytype: text("relatedentitytype"), // 'sample', 'test', 'order', etc.
  // Additional data in JSON format
  metadata: jsonb("metadata"),
  read: boolean("read").notNull().default(false),
  priority: text("priority").notNull().default("medium"), // low, medium, high
  createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    workspaceIdx: index("notifications_workspace_idx").on(table.workspaceid),
    userIdx: index("notifications_user_idx").on(table.userid),
    typeIdx: index("notifications_type_idx").on(table.type),
    readIdx: index("notifications_read_idx").on(table.read),
    createdIdx: index("notifications_created_idx").on(table.createdat),
  };
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
