/**
 * Finance Module — Fiscal Periods (Drizzle ORM)
 *
 * Monthly, quarterly, and annual fiscal periods per workspace.
 * Periods can be OPEN, CLOSED, or LOCKED.
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  integer,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { users } from "./user";
import type { FinPeriodStatus } from "./finance-enums";

// ── Fiscal Periods ───────────────────────────────────────────────
export const finPeriods = pgTable(
  "fin_periods",
  {
    periodid: uuid("periodid").primaryKey().defaultRandom(),
    workspaceid: uuid("workspaceid")
      .notNull()
      .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
    periodcode: text("periodcode").notNull(), // "2026-01", "2026-Q1", "2026"
    periodname: text("periodname").notNull(), // "January 2026"
    periodtype: text("periodtype").notNull(), // "MONTH" | "QUARTER" | "YEAR"
    startdate: date("startdate").notNull(),
    enddate: date("enddate").notNull(),
    fiscalyear: integer("fiscalyear").notNull(),
    status: text("status")
      .notNull()
      .$type<FinPeriodStatus>()
      .default("OPEN"),
    closedby: uuid("closedby").references(() => users.userid),
    closedat: timestamp("closedat", { withTimezone: true }),
    createdat: timestamp("createdat", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    wsCodeUnique: unique("fin_periods_ws_code_uq").on(
      table.workspaceid,
      table.periodcode
    ),
    wsIdx: index("fin_periods_ws_idx").on(table.workspaceid),
    dateIdx: index("fin_periods_date_idx").on(table.startdate, table.enddate),
    yearIdx: index("fin_periods_year_idx").on(table.fiscalyear),
  })
);

export type FinPeriod = typeof finPeriods.$inferSelect;
export type NewFinPeriod = typeof finPeriods.$inferInsert;
