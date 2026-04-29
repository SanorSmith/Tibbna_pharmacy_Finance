/**
 * Finance Module — Tax Codes (Drizzle ORM)
 *
 * Configurable tax rates per workspace. Default 0% for Iraq.
 * Supports VAT, Sales Tax, Withholding, and Exempt types.
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  numeric,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { finAccounts } from "./finance-accounts";
import type { FinTaxType } from "./finance-enums";

// ── Tax Codes ────────────────────────────────────────────────────
export const finTaxCodes = pgTable(
  "fin_tax_codes",
  {
    taxcodeid: uuid("taxcodeid").primaryKey().defaultRandom(),
    workspaceid: uuid("workspaceid")
      .notNull()
      .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
    code: text("code").notNull(), // "VAT15", "EXEMPT", "ZERO"
    name: text("name").notNull(), // "VAT 15%"
    rate: numeric("rate", { precision: 5, scale: 2 }).notNull(), // 15.00
    taxtype: text("taxtype").notNull().$type<FinTaxType>(),
    isinclusive: boolean("isinclusive").notNull().default(false),
    glaccountid: uuid("glaccountid").references(
      () => finAccounts.accountid
    ),
    isactive: boolean("isactive").notNull().default(true),
    effectivefrom: date("effectivefrom").notNull(),
    effectiveto: date("effectiveto"), // null = no end date
    createdat: timestamp("createdat", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    wsIdx: index("fin_tax_ws_idx").on(table.workspaceid),
    codeIdx: index("fin_tax_code_idx").on(table.workspaceid, table.code),
  })
);

export type FinTaxCode = typeof finTaxCodes.$inferSelect;
export type NewFinTaxCode = typeof finTaxCodes.$inferInsert;
