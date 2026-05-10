/**
 * Finance Module — Accounts Receivable (Drizzle ORM)
 *
 * Flat transaction log for AR. Customer balance = SUM(debit) - SUM(credit).
 * Invoices already exist in pharmacy_invoices and invoices tables;
 * this table records the financial impact only.
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspaces } from "./workspace";
import { finJournalEntries } from "./finance-journal";
import type { FinArCustomerType, FinSourceType } from "./finance-enums";

// ── AR Transactions ──────────────────────────────────────────────
export const finArTransactions = pgTable(
  "fin_ar_transactions",
  {
    artransactionid: uuid("artransactionid").primaryKey().defaultRandom(),
    workspaceid: uuid("workspaceid")
      .notNull()
      .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
    customertype: text("customertype")
      .notNull()
      .$type<FinArCustomerType>(),
    customerid: text("customerid").notNull(), // patients.patientid or insurance_companies.insuranceid
    sourcetype: text("sourcetype").notNull().$type<FinSourceType>(),
    sourceid: text("sourceid").notNull(),
    transactiondate: date("transactiondate").notNull(),
    debitamount: numeric("debitamount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    creditamount: numeric("creditamount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    description: text("description"),
    journalid: uuid("journalid").references(
      () => finJournalEntries.journalid
    ),
    createdat: timestamp("createdat", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    wsIdx: index("fin_ar_ws_idx").on(table.workspaceid),
    custIdx: index("fin_ar_customer_idx").on(
      table.customertype,
      table.customerid
    ),
    dateIdx: index("fin_ar_date_idx").on(table.transactiondate),
    sourceIdx: index("fin_ar_source_idx").on(
      table.sourcetype,
      table.sourceid
    ),
  })
);

export type FinArTransaction = typeof finArTransactions.$inferSelect;
export type NewFinArTransaction = typeof finArTransactions.$inferInsert;

// ── Relations ────────────────────────────────────────────────────
export const finArTransactionsRelations = relations(
  finArTransactions,
  ({ one }) => ({
    journal: one(finJournalEntries, {
      fields: [finArTransactions.journalid],
      references: [finJournalEntries.journalid],
    }),
  })
);
