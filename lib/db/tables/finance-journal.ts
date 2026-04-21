/**
 * Finance Module — Journal Entries & Lines (Drizzle ORM)
 *
 * Core GL tables: journal headers and line items.
 * Idempotency enforced via unique(workspaceid, sourcetype, sourceid).
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  numeric,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspaces } from "./workspace";
import { users } from "./user";
import { finAccounts } from "./finance-accounts";
import { finPeriods } from "./finance-periods";
import type { FinJournalStatus, FinSourceType } from "./finance-enums";

// ── Journal Entry Header ─────────────────────────────────────────
export const finJournalEntries = pgTable(
  "fin_journal_entries",
  {
    journalid: uuid("journalid").primaryKey().defaultRandom(),
    workspaceid: uuid("workspaceid")
      .notNull()
      .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
    journalnumber: text("journalnumber").notNull(),
    journaldate: date("journaldate").notNull(),
    periodid: uuid("periodid")
      .notNull()
      .references(() => finPeriods.periodid),
    sourcetype: text("sourcetype").notNull().$type<FinSourceType>(),
    sourceid: text("sourceid"), // pharmacy order/payment/GRN ID
    description: text("description"),
    totaldebit: numeric("totaldebit", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    totalcredit: numeric("totalcredit", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    status: text("status")
      .notNull()
      .$type<FinJournalStatus>()
      .default("DRAFT"),
    postedby: uuid("postedby").references(() => users.userid),
    postedat: timestamp("postedat", { withTimezone: true }),
    reversalof: uuid("reversalof"), // FK to self (journal being reversed)
    reversalreason: text("reversalreason"),
    createdby: uuid("createdby")
      .notNull()
      .references(() => users.userid),
    createdat: timestamp("createdat", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // IDEMPOTENCY KEY: same source event → one journal only
    wsSourceUnique: unique("fin_je_ws_source_uq").on(
      table.workspaceid,
      table.sourcetype,
      table.sourceid
    ),
    wsIdx: index("fin_je_ws_idx").on(table.workspaceid),
    dateIdx: index("fin_je_date_idx").on(table.journaldate),
    statusIdx: index("fin_je_status_idx").on(table.status),
    periodIdx: index("fin_je_period_idx").on(table.periodid),
    sourceIdx: index("fin_je_source_idx").on(
      table.sourcetype,
      table.sourceid
    ),
    numberIdx: index("fin_je_number_idx").on(table.journalnumber),
  })
);

export type FinJournalEntry = typeof finJournalEntries.$inferSelect;
export type NewFinJournalEntry = typeof finJournalEntries.$inferInsert;

// ── Journal Line Items ───────────────────────────────────────────
export const finJournalLines = pgTable(
  "fin_journal_lines",
  {
    lineid: uuid("lineid").primaryKey().defaultRandom(),
    journalid: uuid("journalid")
      .notNull()
      .references(() => finJournalEntries.journalid, { onDelete: "cascade" }),
    accountid: uuid("accountid")
      .notNull()
      .references(() => finAccounts.accountid),
    debit: numeric("debit", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    credit: numeric("credit", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    memo: text("memo"),
    costcenterid: uuid("costcenterid"), // Phase 3
    branchid: uuid("branchid"), // Phase 3
  },
  (table) => ({
    journalIdx: index("fin_jl_journal_idx").on(table.journalid),
    accountIdx: index("fin_jl_account_idx").on(table.accountid),
  })
);

export type FinJournalLine = typeof finJournalLines.$inferSelect;
export type NewFinJournalLine = typeof finJournalLines.$inferInsert;

// ── Relations ────────────────────────────────────────────────────
export const finJournalEntriesRelations = relations(
  finJournalEntries,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [finJournalEntries.workspaceid],
      references: [workspaces.workspaceid],
    }),
    period: one(finPeriods, {
      fields: [finJournalEntries.periodid],
      references: [finPeriods.periodid],
    }),
    createdByUser: one(users, {
      fields: [finJournalEntries.createdby],
      references: [users.userid],
    }),
    lines: many(finJournalLines),
  })
);

export const finJournalLinesRelations = relations(
  finJournalLines,
  ({ one }) => ({
    journal: one(finJournalEntries, {
      fields: [finJournalLines.journalid],
      references: [finJournalEntries.journalid],
    }),
    account: one(finAccounts, {
      fields: [finJournalLines.accountid],
      references: [finAccounts.accountid],
    }),
  })
);
