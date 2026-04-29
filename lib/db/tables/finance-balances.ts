/**
 * Finance Module — Account Balances (Drizzle ORM)
 *
 * Materialized running totals per account per period.
 * Updated by the posting engine via UPSERT on each journal post.
 */
import {
  pgTable,
  uuid,
  numeric,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { finAccounts } from "./finance-accounts";
import { finPeriods } from "./finance-periods";

// ── Account Balances ─────────────────────────────────────────────
export const finAccountBalances = pgTable(
  "fin_account_balances",
  {
    balanceid: uuid("balanceid").primaryKey().defaultRandom(),
    accountid: uuid("accountid")
      .notNull()
      .references(() => finAccounts.accountid, { onDelete: "cascade" }),
    periodid: uuid("periodid")
      .notNull()
      .references(() => finPeriods.periodid, { onDelete: "cascade" }),
    openingdebit: numeric("openingdebit", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    openingcredit: numeric("openingcredit", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    perioddebit: numeric("perioddebit", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    periodcredit: numeric("periodcredit", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    closingdebit: numeric("closingdebit", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    closingcredit: numeric("closingcredit", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    updatedat: timestamp("updatedat", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    acctPeriodUnique: unique("fin_ab_acct_period_uq").on(
      table.accountid,
      table.periodid
    ),
    accountIdx: index("fin_ab_account_idx").on(table.accountid),
    periodIdx: index("fin_ab_period_idx").on(table.periodid),
  })
);

export type FinAccountBalance = typeof finAccountBalances.$inferSelect;
export type NewFinAccountBalance = typeof finAccountBalances.$inferInsert;
