/**
 * Finance Module — Chart of Accounts (Drizzle ORM)
 *
 * Hierarchical account structure for all financial recording.
 * accountcode is unique per workspace (composite unique constraint).
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspaces } from "./workspace";
import { users } from "./user";
import type {
  FinAccountType,
  FinAccountSubtype,
  FinNormalBalance,
} from "./finance-enums";

// ── Chart of Accounts ────────────────────────────────────────────
export const finAccounts = pgTable(
  "fin_accounts",
  {
    accountid: uuid("accountid").primaryKey().defaultRandom(),
    workspaceid: uuid("workspaceid")
      .notNull()
      .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
    accountcode: text("accountcode").notNull(),
    accountname: text("accountname").notNull(),
    accounttype: text("accounttype").notNull().$type<FinAccountType>(),
    accountsubtype: text("accountsubtype").$type<FinAccountSubtype>(),
    parentaccountid: uuid("parentaccountid"),
    level: integer("level").notNull().default(1),
    isgroupaccount: boolean("isgroupaccount").notNull().default(false),
    isactive: boolean("isactive").notNull().default(true),
    normalbalance: text("normalbalance")
      .notNull()
      .$type<FinNormalBalance>()
      .default("DEBIT"),
    description: text("description"),
    createdby: uuid("createdby").references(() => users.userid),
    createdat: timestamp("createdat", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    wsCodeUnique: unique("fin_accounts_ws_code_uq").on(
      table.workspaceid,
      table.accountcode
    ),
    wsIdx: index("fin_accounts_ws_idx").on(table.workspaceid),
    typeIdx: index("fin_accounts_type_idx").on(table.accounttype),
    parentIdx: index("fin_accounts_parent_idx").on(table.parentaccountid),
  })
);

export type FinAccount = typeof finAccounts.$inferSelect;
export type NewFinAccount = typeof finAccounts.$inferInsert;

// ── Relations ────────────────────────────────────────────────────
export const finAccountsRelations = relations(finAccounts, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [finAccounts.workspaceid],
    references: [workspaces.workspaceid],
  }),
  createdByUser: one(users, {
    fields: [finAccounts.createdby],
    references: [users.userid],
  }),
  parent: one(finAccounts, {
    fields: [finAccounts.parentaccountid],
    references: [finAccounts.accountid],
    relationName: "parentChild",
  }),
  children: many(finAccounts, { relationName: "parentChild" }),
}));
