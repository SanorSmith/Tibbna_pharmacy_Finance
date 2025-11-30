/**
 * Operations/Operative Procedures table (Drizzle ORM)
 * - Workspace-scoped surgical operations
 * - Links patient, assessment, operation details, diagnosis, outcomes
 */
import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { patients } from "./patient";
import { users } from "./user";

export const operationStatusEnum = pgEnum("operation_status", [
  "scheduled",
  "in_preparation",
  "in_progress",
  "completed",
  "cancelled",
  "postponed",
]);

export const operationTypeEnum = pgEnum("operation_type", [
  "emergency",
  "elective",
  "urgent",
]);

export const operations = pgTable("operations", {
  operationid: uuid("operationid").primaryKey().defaultRandom(),
  workspaceid: uuid("workspaceid")
    .notNull()
    .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  patientid: uuid("patientid")
    .notNull()
    .references(() => patients.patientid, { onDelete: "cascade" }),
  surgeonid: uuid("surgeonid")
    .notNull()
    .references(() => users.userid, { onDelete: "cascade" }),
  
  // Operation scheduling
  scheduleddate: timestamp("scheduleddate", { withTimezone: true }).notNull(),
  estimatedduration: text("estimatedduration"), // e.g., "2 hours", "90 minutes"
  operationtype: operationTypeEnum("operationtype").notNull().default("elective"),
  status: operationStatusEnum("status").notNull().default("scheduled"),
  
  // Assessment
  preoperativeassessment: text("preoperativeassessment"),
  
  // Operation details
  operationname: text("operationname").notNull(),
  operationdetails: text("operationdetails"),
  anesthesiatype: text("anesthesiatype"), // e.g., "General", "Local", "Spinal"
  theater: text("theater"), // Operating theater number/name
  
  // Diagnosis
  operationdiagnosis: text("operationdiagnosis"),
  
  // Outcomes
  actualstarttime: timestamp("actualstarttime", { withTimezone: true }),
  actualendtime: timestamp("actualendtime", { withTimezone: true }),
  outcomes: text("outcomes"),
  complications: text("complications"),
  
  // Comments
  comment: text("comment"),
  
  createdat: timestamp("createdat").defaultNow(),
  updatedat: timestamp("updatedat").defaultNow(),
});

export type Operation = typeof operations.$inferSelect;
export type NewOperation = typeof operations.$inferInsert;
