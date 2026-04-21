/**
 * Finance Module — Bank & Cash Accounts (Drizzle ORM)
 *
 * Maps physical bank/cash accounts to GL accounts.
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspaces } from "./workspace";
import { finAccounts } from "./finance-accounts";
import type { FinBankAccountType } from "./finance-enums";

// ── Bank Accounts ────────────────────────────────────────────────
export const finBankAccounts = pgTable(
  "fin_bank_accounts",
  {
    bankaccountid: uuid("bankaccountid").primaryKey().defaultRandom(),
    workspaceid: uuid("workspaceid")
      .notNull()
      .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
    accountname: text("accountname").notNull(),
    bankname: text("bankname"),
    accountnumber: text("accountnumber"),
    accounttype: text("accounttype")
      .notNull()
      .$type<FinBankAccountType>(),
    currencycode: text("currencycode").default("USD"),
    glaccountid: uuid("glaccountid")
      .notNull()
      .references(() => finAccounts.accountid),
    currentbalance: numeric("currentbalance", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    isactive: boolean("isactive").notNull().default(true),
    createdat: timestamp("createdat", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    wsIdx: index("fin_bank_ws_idx").on(table.workspaceid),
  })
);

export type FinBankAccount = typeof finBankAccounts.$inferSelect;
export type NewFinBankAccount = typeof finBankAccounts.$inferInsert;

// ── Relations ────────────────────────────────────────────────────
export const finBankAccountsRelations = relations(
  finBankAccounts,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [finBankAccounts.workspaceid],
      references: [workspaces.workspaceid],
    }),
    glAccount: one(finAccounts, {
      fields: [finBankAccounts.glaccountid],
      references: [finAccounts.accountid],
    }),
  })
);
