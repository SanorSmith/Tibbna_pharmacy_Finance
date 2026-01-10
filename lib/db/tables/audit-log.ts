import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user";
import { accessionSamples } from "./accession-sample";

/**
 * Immutable audit log for all validation actions
 * Tracks who did what, when, and why for compliance and traceability
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    auditid: uuid("auditid").primaryKey().defaultRandom(),
    sampleid: uuid("sampleid")
      .notNull()
      .references(() => accessionSamples.sampleid, { onDelete: "cascade" }),
    userid: uuid("userid")
      .notNull()
      .references(() => users.userid),
    userrole: text("userrole").notNull(),
    action: text("action").notNull(),
    previousstate: text("previousstate"),
    newstate: text("newstate").notNull(),
    reason: text("reason"),
    metadata: jsonb("metadata").default({}),
    ipaddress: text("ipaddress"),
    useragent: text("useragent"),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sampleidIdx: index("audit_logs_sampleid_idx").on(table.sampleid),
    useridIdx: index("audit_logs_userid_idx").on(table.userid),
    actionIdx: index("audit_logs_action_idx").on(table.action),
    timestampIdx: index("audit_logs_timestamp_idx").on(table.timestamp),
  })
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  sampleid: one(accessionSamples, {
    fields: [auditLogs.sampleid],
    references: [accessionSamples.sampleid],
  }),
  userid: one(users, {
    fields: [auditLogs.userid],
    references: [users.userid],
  }),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export const AUDIT_ACTIONS = {
  SAMPLE_CREATED: "SAMPLE_CREATED",
  RESULT_ADDED: "RESULT_ADDED",
  RESULT_UPDATED: "RESULT_UPDATED",
  TECH_VALIDATED: "TECH_VALIDATED",
  CLINICALLY_VALIDATED: "CLINICALLY_VALIDATED",
  VALIDATION_REJECTED: "VALIDATION_REJECTED",
  RERUN_REQUESTED: "RERUN_REQUESTED",
  RESULTS_RELEASED: "RESULTS_RELEASED",
  COMMENT_ADDED: "COMMENT_ADDED",
  STATE_CHANGED: "STATE_CHANGED",
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];
