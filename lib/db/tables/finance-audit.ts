/**
 * Finance Module — Audit Log (Drizzle ORM)
 *
 * Every finance mutation is logged with user, timestamp, before/after values.
 * Soft delete only — entries are never removed.
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { users } from "./user";
import type { FinAuditAction } from "./finance-enums";

// ── Finance Audit Log ────────────────────────────────────────────
export const finAuditLog = pgTable(
  "fin_audit_log",
  {
    auditid: uuid("auditid").primaryKey().defaultRandom(),
    workspaceid: uuid("workspaceid")
      .notNull()
      .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
    tablename: text("tablename").notNull(),
    recordid: uuid("recordid").notNull(),
    action: text("action").notNull().$type<FinAuditAction>(),
    userid: uuid("userid")
      .notNull()
      .references(() => users.userid),
    ipaddress: text("ipaddress"),
    beforedata: jsonb("beforedata"),
    afterdata: jsonb("afterdata"),
    createdat: timestamp("createdat", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tableIdx: index("fin_audit_table_idx").on(
      table.tablename,
      table.recordid
    ),
    userIdx: index("fin_audit_user_idx").on(table.userid),
    dateIdx: index("fin_audit_date_idx").on(table.createdat),
    wsIdx: index("fin_audit_ws_idx").on(table.workspaceid),
  })
);

export type FinAuditLogEntry = typeof finAuditLog.$inferSelect;
export type NewFinAuditLogEntry = typeof finAuditLog.$inferInsert;
