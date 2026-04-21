# FINANCE SYSTEM — TECHNICAL DESIGN DOCUMENT

**Date:** April 19, 2026  
**Author:** Cascade (Lead Software Architect)  
**Platform:** IQMed — `tibbna/tibbna`  
**Branch:** `PharmacyFinance-integration`  
**Prerequisites:** Phase 1 Discovery ✅ · Phase 2 Architecture ✅  
**Purpose:** Developer-ready technical specifications — no code implementation yet

**See also:** `docs/FINANCE_TECHNICAL_DESIGN_PART2.md` for Integration Hooks, Testing, and Deployment.

---

## TABLE OF CONTENTS (Part 1)

1. [Database Schema (Drizzle ORM)](#1-database-schema-drizzle-orm)
2. [API Endpoint Specifications](#2-api-endpoint-specifications)
3. [Posting Engine Design](#3-posting-engine-design)

---

## 1. DATABASE SCHEMA (Drizzle ORM)

### 1.0 Design Conventions (Match Existing Codebase)

| Convention | Existing Pattern | Finance Tables |
|-----------|-----------------|----------------|
| Table prefix | Module-based (`pharmacy_`, `insurance_`) | `fin_` prefix |
| PK naming | `tableid` (e.g., `orderid`, `invoiceid`) | Same |
| PK type | `uuid().primaryKey().defaultRandom()` | Same |
| FK to workspace | `workspaceid` → `workspaces.workspaceid` | Same |
| Timestamps | `createdat`, `updatedat` with `{ withTimezone: true }` | Same |
| Numeric money | `numeric("col", { precision: 12, scale: 2 })` | `numeric(14, 2)` for finance |
| Status fields | `text("status").$type<StatusType>()` with const objects | Same |
| Index naming | `tablename_field_idx` | Same |
| File location | `lib/db/tables/module-name.ts` | `lib/db/tables/finance-*.ts` |
| Re-export | Via `lib/db/schema.ts` at bottom | Same |

---

### 1.1 Finance Enums & Constants

**File:** `lib/db/tables/finance-enums.ts`

```typescript
export const FIN_ACCOUNT_TYPE = {
  ASSET: "ASSET", LIABILITY: "LIABILITY", EQUITY: "EQUITY",
  REVENUE: "REVENUE", EXPENSE: "EXPENSE",
} as const;
export type FinAccountType = (typeof FIN_ACCOUNT_TYPE)[keyof typeof FIN_ACCOUNT_TYPE];

export const FIN_ACCOUNT_SUBTYPE = {
  CURRENT_ASSET: "CURRENT_ASSET", FIXED_ASSET: "FIXED_ASSET",
  ACCUMULATED_DEPRECIATION: "ACCUMULATED_DEPRECIATION",
  CURRENT_LIABILITY: "CURRENT_LIABILITY", LONG_TERM_LIABILITY: "LONG_TERM_LIABILITY",
  EQUITY_CAPITAL: "EQUITY_CAPITAL", RETAINED_EARNINGS: "RETAINED_EARNINGS",
  DIRECT_REVENUE: "DIRECT_REVENUE", OTHER_REVENUE: "OTHER_REVENUE",
  COGS: "COGS", OPERATING_EXPENSE: "OPERATING_EXPENSE", NON_OPERATING: "NON_OPERATING",
} as const;
export type FinAccountSubtype = (typeof FIN_ACCOUNT_SUBTYPE)[keyof typeof FIN_ACCOUNT_SUBTYPE];

export const FIN_NORMAL_BALANCE = { DEBIT: "DEBIT", CREDIT: "CREDIT" } as const;
export type FinNormalBalance = (typeof FIN_NORMAL_BALANCE)[keyof typeof FIN_NORMAL_BALANCE];

export const FIN_JOURNAL_STATUS = {
  DRAFT: "DRAFT", POSTED: "POSTED", REVERSED: "REVERSED",
} as const;
export type FinJournalStatus = (typeof FIN_JOURNAL_STATUS)[keyof typeof FIN_JOURNAL_STATUS];

export const FIN_SOURCE_TYPE = {
  PHARMACY_DISPENSE: "PHARMACY_DISPENSE",
  PHARMACY_INSURANCE_APPLIED: "PHARMACY_INSURANCE_APPLIED",
  PATIENT_PAYMENT: "PATIENT_PAYMENT",
  INSURANCE_PAYMENT: "INSURANCE_PAYMENT",
  SALE_RETURN: "SALE_RETURN",
  GRN_RECEIPT: "GRN_RECEIPT",
  SUPPLIER_INVOICE: "SUPPLIER_INVOICE",
  SUPPLIER_PAYMENT: "SUPPLIER_PAYMENT",
  STOCK_ADJUSTMENT: "STOCK_ADJUSTMENT",
  STOCK_EXPIRED: "STOCK_EXPIRED",
  STOCK_TRANSFER: "STOCK_TRANSFER",
  GENERAL_INVOICE: "GENERAL_INVOICE",
  MANUAL: "MANUAL",
  OPENING_BALANCE: "OPENING_BALANCE",
  PERIOD_CLOSE: "PERIOD_CLOSE",
} as const;
export type FinSourceType = (typeof FIN_SOURCE_TYPE)[keyof typeof FIN_SOURCE_TYPE];

export const FIN_PERIOD_STATUS = { OPEN: "OPEN", CLOSED: "CLOSED", LOCKED: "LOCKED" } as const;
export type FinPeriodStatus = (typeof FIN_PERIOD_STATUS)[keyof typeof FIN_PERIOD_STATUS];

export const FIN_AP_STATUS = {
  DRAFT: "DRAFT", APPROVED: "APPROVED", POSTED: "POSTED",
  PARTIAL: "PARTIAL", PAID: "PAID", CANCELLED: "CANCELLED",
} as const;
export type FinApStatus = (typeof FIN_AP_STATUS)[keyof typeof FIN_AP_STATUS];

export const FIN_AR_CUSTOMER_TYPE = { PATIENT: "PATIENT", INSURANCE: "INSURANCE" } as const;
export type FinArCustomerType = (typeof FIN_AR_CUSTOMER_TYPE)[keyof typeof FIN_AR_CUSTOMER_TYPE];

export const FIN_PAYMENT_METHOD = {
  CASH: "CASH", BANK_TRANSFER: "BANK_TRANSFER", CHECK: "CHECK", CARD: "CARD",
} as const;
export type FinPaymentMethod = (typeof FIN_PAYMENT_METHOD)[keyof typeof FIN_PAYMENT_METHOD];

export const FIN_BANK_ACCOUNT_TYPE = { BANK: "BANK", CASH: "CASH", PETTY_CASH: "PETTY_CASH" } as const;
export type FinBankAccountType = (typeof FIN_BANK_ACCOUNT_TYPE)[keyof typeof FIN_BANK_ACCOUNT_TYPE];

export const FIN_TAX_TYPE = {
  VAT: "VAT", SALES_TAX: "SALES_TAX", WITHHOLDING: "WITHHOLDING", EXEMPT: "EXEMPT",
} as const;
export type FinTaxType = (typeof FIN_TAX_TYPE)[keyof typeof FIN_TAX_TYPE];

export const FIN_VALUATION_METHOD = { FIFO: "FIFO", WEIGHTED_AVERAGE: "WEIGHTED_AVERAGE" } as const;
export type FinValuationMethod = (typeof FIN_VALUATION_METHOD)[keyof typeof FIN_VALUATION_METHOD];

export const FIN_AUDIT_ACTION = { INSERT: "INSERT", UPDATE: "UPDATE", REVERSE: "REVERSE" } as const;
export type FinAuditAction = (typeof FIN_AUDIT_ACTION)[keyof typeof FIN_AUDIT_ACTION];
```

---

### 1.2 Chart of Accounts — `lib/db/tables/finance-accounts.ts`

```typescript
import { pgTable, uuid, text, timestamp, boolean, integer, index, unique } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { users } from "./user";
import type { FinAccountType, FinAccountSubtype, FinNormalBalance } from "./finance-enums";

export const finAccounts = pgTable("fin_accounts", {
  accountid:       uuid("accountid").primaryKey().defaultRandom(),
  workspaceid:     uuid("workspaceid").notNull()
                     .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  accountcode:     text("accountcode").notNull(),
  accountname:     text("accountname").notNull(),
  accounttype:     text("accounttype").notNull().$type<FinAccountType>(),
  accountsubtype:  text("accountsubtype").$type<FinAccountSubtype>(),
  parentaccountid: uuid("parentaccountid"),  // self-ref → finAccounts.accountid
  level:           integer("level").notNull().default(1),
  isgroupaccount:  boolean("isgroupaccount").notNull().default(false),
  isactive:        boolean("isactive").notNull().default(true),
  normalbalance:   text("normalbalance").notNull().$type<FinNormalBalance>().default("DEBIT"),
  description:     text("description"),
  createdby:       uuid("createdby").references(() => users.userid),
  createdat:       timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  updatedat:       timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  wsCodeUnique: unique("fin_accounts_ws_code_uq").on(table.workspaceid, table.accountcode),
  wsIdx:        index("fin_accounts_ws_idx").on(table.workspaceid),
  typeIdx:      index("fin_accounts_type_idx").on(table.accounttype),
  parentIdx:    index("fin_accounts_parent_idx").on(table.parentaccountid),
}));

export type FinAccount = typeof finAccounts.$inferSelect;
export type NewFinAccount = typeof finAccounts.$inferInsert;
```

---

### 1.3 Fiscal Periods — `lib/db/tables/finance-periods.ts`

```typescript
import { pgTable, uuid, text, timestamp, date, integer, index, unique } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { users } from "./user";
import type { FinPeriodStatus } from "./finance-enums";

export const finPeriods = pgTable("fin_periods", {
  periodid:    uuid("periodid").primaryKey().defaultRandom(),
  workspaceid: uuid("workspaceid").notNull()
                 .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  periodcode:  text("periodcode").notNull(),       // "2026-01"
  periodname:  text("periodname").notNull(),       // "January 2026"
  periodtype:  text("periodtype").notNull(),       // "MONTH" | "QUARTER" | "YEAR"
  startdate:   date("startdate").notNull(),
  enddate:     date("enddate").notNull(),
  fiscalyear:  integer("fiscalyear").notNull(),
  status:      text("status").notNull().$type<FinPeriodStatus>().default("OPEN"),
  closedby:    uuid("closedby").references(() => users.userid),
  closedat:    timestamp("closedat", { withTimezone: true }),
  createdat:   timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  wsCodeUnique: unique("fin_periods_ws_code_uq").on(table.workspaceid, table.periodcode),
  wsIdx:        index("fin_periods_ws_idx").on(table.workspaceid),
  dateIdx:      index("fin_periods_date_idx").on(table.startdate, table.enddate),
}));

export type FinPeriod = typeof finPeriods.$inferSelect;
export type NewFinPeriod = typeof finPeriods.$inferInsert;
```

---

### 1.4 Journal Entries & Lines — `lib/db/tables/finance-journal.ts`

```typescript
import { pgTable, uuid, text, timestamp, date, numeric, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspaces } from "./workspace";
import { users } from "./user";
import { finAccounts } from "./finance-accounts";
import { finPeriods } from "./finance-periods";
import type { FinJournalStatus, FinSourceType } from "./finance-enums";

export const finJournalEntries = pgTable("fin_journal_entries", {
  journalid:      uuid("journalid").primaryKey().defaultRandom(),
  workspaceid:    uuid("workspaceid").notNull()
                    .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  journalnumber:  text("journalnumber").notNull(),
  journaldate:    date("journaldate").notNull(),
  periodid:       uuid("periodid").notNull().references(() => finPeriods.periodid),
  sourcetype:     text("sourcetype").notNull().$type<FinSourceType>(),
  sourceid:       text("sourceid"),                // pharmacy order/payment/GRN ID
  description:    text("description"),
  totaldebit:     numeric("totaldebit",  { precision: 14, scale: 2 }).notNull().default("0"),
  totalcredit:    numeric("totalcredit", { precision: 14, scale: 2 }).notNull().default("0"),
  status:         text("status").notNull().$type<FinJournalStatus>().default("DRAFT"),
  postedby:       uuid("postedby").references(() => users.userid),
  postedat:       timestamp("postedat", { withTimezone: true }),
  reversalof:     uuid("reversalof"),              // FK to self
  reversalreason: text("reversalreason"),
  createdby:      uuid("createdby").notNull().references(() => users.userid),
  createdat:      timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  updatedat:      timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // IDEMPOTENCY KEY: same source event → one journal only
  wsSourceUnique: unique("fin_je_ws_source_uq").on(table.workspaceid, table.sourcetype, table.sourceid),
  wsIdx:          index("fin_je_ws_idx").on(table.workspaceid),
  dateIdx:        index("fin_je_date_idx").on(table.journaldate),
  statusIdx:      index("fin_je_status_idx").on(table.status),
  periodIdx:      index("fin_je_period_idx").on(table.periodid),
  sourceIdx:      index("fin_je_source_idx").on(table.sourcetype, table.sourceid),
}));

export const finJournalLines = pgTable("fin_journal_lines", {
  lineid:       uuid("lineid").primaryKey().defaultRandom(),
  journalid:    uuid("journalid").notNull()
                  .references(() => finJournalEntries.journalid, { onDelete: "cascade" }),
  accountid:    uuid("accountid").notNull().references(() => finAccounts.accountid),
  debit:        numeric("debit",  { precision: 14, scale: 2 }).notNull().default("0"),
  credit:       numeric("credit", { precision: 14, scale: 2 }).notNull().default("0"),
  memo:         text("memo"),
  costcenterid: uuid("costcenterid"),   // Phase 3
  branchid:     uuid("branchid"),       // Phase 3
}, (table) => ({
  journalIdx: index("fin_jl_journal_idx").on(table.journalid),
  accountIdx: index("fin_jl_account_idx").on(table.accountid),
}));

export type FinJournalEntry = typeof finJournalEntries.$inferSelect;
export type NewFinJournalEntry = typeof finJournalEntries.$inferInsert;
export type FinJournalLine = typeof finJournalLines.$inferSelect;
export type NewFinJournalLine = typeof finJournalLines.$inferInsert;

// Relations
export const finJournalEntriesRelations = relations(finJournalEntries, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [finJournalEntries.workspaceid], references: [workspaces.workspaceid] }),
  period:    one(finPeriods, { fields: [finJournalEntries.periodid], references: [finPeriods.periodid] }),
  lines:     many(finJournalLines),
}));

export const finJournalLinesRelations = relations(finJournalLines, ({ one }) => ({
  journal: one(finJournalEntries, { fields: [finJournalLines.journalid], references: [finJournalEntries.journalid] }),
  account: one(finAccounts, { fields: [finJournalLines.accountid], references: [finAccounts.accountid] }),
}));
```

---

### 1.5 Account Balances — `lib/db/tables/finance-balances.ts`

```typescript
import { pgTable, uuid, numeric, timestamp, unique, index } from "drizzle-orm/pg-core";
import { finAccounts } from "./finance-accounts";
import { finPeriods } from "./finance-periods";

export const finAccountBalances = pgTable("fin_account_balances", {
  balanceid:     uuid("balanceid").primaryKey().defaultRandom(),
  accountid:     uuid("accountid").notNull()
                   .references(() => finAccounts.accountid, { onDelete: "cascade" }),
  periodid:      uuid("periodid").notNull()
                   .references(() => finPeriods.periodid, { onDelete: "cascade" }),
  openingdebit:  numeric("openingdebit",  { precision: 14, scale: 2 }).notNull().default("0"),
  openingcredit: numeric("openingcredit", { precision: 14, scale: 2 }).notNull().default("0"),
  perioddebit:   numeric("perioddebit",   { precision: 14, scale: 2 }).notNull().default("0"),
  periodcredit:  numeric("periodcredit",  { precision: 14, scale: 2 }).notNull().default("0"),
  closingdebit:  numeric("closingdebit",  { precision: 14, scale: 2 }).notNull().default("0"),
  closingcredit: numeric("closingcredit", { precision: 14, scale: 2 }).notNull().default("0"),
  updatedat:     timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  acctPeriodUnique: unique("fin_ab_acct_period_uq").on(table.accountid, table.periodid),
  accountIdx:       index("fin_ab_account_idx").on(table.accountid),
  periodIdx:        index("fin_ab_period_idx").on(table.periodid),
}));

export type FinAccountBalance = typeof finAccountBalances.$inferSelect;
export type NewFinAccountBalance = typeof finAccountBalances.$inferInsert;
```

---

### 1.6 Accounts Payable — `lib/db/tables/finance-ap.ts`

```typescript
import { pgTable, uuid, text, timestamp, date, numeric, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspaces } from "./workspace";
import { users } from "./user";
import { finJournalEntries } from "./finance-journal";
import type { FinApStatus, FinPaymentMethod } from "./finance-enums";

// Vendor Financial Master (extends existing vendors table via same UUID)
export const finVendors = pgTable("fin_vendors", {
  vendorid:     uuid("vendorid").primaryKey(),  // same ID as vendors.id
  workspaceid:  uuid("workspaceid").notNull()
                  .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  paymentterms: text("paymentterms").default("NET_30"),
  creditlimit:  numeric("creditlimit", { precision: 14, scale: 2 }),
  currencycode: text("currencycode").default("USD"),
  taxid:        text("taxid"),
  createdat:    timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  updatedat:    timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  wsIdx: index("fin_vendors_ws_idx").on(table.workspaceid),
}));

// AP Invoices
export const finApInvoices = pgTable("fin_ap_invoices", {
  apinvoiceid:           uuid("apinvoiceid").primaryKey().defaultRandom(),
  workspaceid:           uuid("workspaceid").notNull()
                           .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  vendorid:              uuid("vendorid").notNull().references(() => finVendors.vendorid),
  invoicenumber:         text("invoicenumber").notNull(),
  supplierinvoicenumber: text("supplierinvoicenumber"),
  invoicedate:           date("invoicedate").notNull(),
  duedate:               date("duedate").notNull(),
  grnid:                 uuid("grnid"),       // → goods_receipt_notes.id
  poid:                  uuid("poid"),        // → purchase_orders.id
  subtotal:              numeric("subtotal",    { precision: 14, scale: 2 }).notNull(),
  taxamount:             numeric("taxamount",   { precision: 14, scale: 2 }).notNull().default("0"),
  totalamount:           numeric("totalamount", { precision: 14, scale: 2 }).notNull(),
  paidamount:            numeric("paidamount",  { precision: 14, scale: 2 }).notNull().default("0"),
  balancedue:            numeric("balancedue",  { precision: 14, scale: 2 }).notNull(),
  status:                text("status").notNull().$type<FinApStatus>().default("DRAFT"),
  journalid:             uuid("journalid").references(() => finJournalEntries.journalid),
  approvedby:            uuid("approvedby").references(() => users.userid),
  approvedat:            timestamp("approvedat", { withTimezone: true }),
  createdby:             uuid("createdby").notNull().references(() => users.userid),
  createdat:             timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  updatedat:             timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  vendorInvUniq: unique("fin_ap_vendor_inv_uq").on(table.vendorid, table.supplierinvoicenumber),
  wsIdx:         index("fin_ap_inv_ws_idx").on(table.workspaceid),
  vendorIdx:     index("fin_ap_inv_vendor_idx").on(table.vendorid),
  statusIdx:     index("fin_ap_inv_status_idx").on(table.status),
  dueDateIdx:    index("fin_ap_inv_due_idx").on(table.duedate),
}));

// AP Payments
export const finApPayments = pgTable("fin_ap_payments", {
  paymentid:     uuid("paymentid").primaryKey().defaultRandom(),
  workspaceid:   uuid("workspaceid").notNull()
                   .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  vendorid:      uuid("vendorid").notNull().references(() => finVendors.vendorid),
  paymentdate:   date("paymentdate").notNull(),
  paymentmethod: text("paymentmethod").notNull().$type<FinPaymentMethod>(),
  bankaccountid: uuid("bankaccountid"),
  reference:     text("reference"),
  totalamount:   numeric("totalamount", { precision: 14, scale: 2 }).notNull(),
  journalid:     uuid("journalid").references(() => finJournalEntries.journalid),
  createdby:     uuid("createdby").notNull().references(() => users.userid),
  createdat:     timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  wsIdx:     index("fin_ap_pay_ws_idx").on(table.workspaceid),
  vendorIdx: index("fin_ap_pay_vendor_idx").on(table.vendorid),
}));

// AP Payment Allocations
export const finApPaymentAllocations = pgTable("fin_ap_payment_allocations", {
  allocationid: uuid("allocationid").primaryKey().defaultRandom(),
  paymentid:    uuid("paymentid").notNull()
                  .references(() => finApPayments.paymentid, { onDelete: "cascade" }),
  apinvoiceid:  uuid("apinvoiceid").notNull()
                  .references(() => finApInvoices.apinvoiceid),
  amount:       numeric("amount", { precision: 14, scale: 2 }).notNull(),
}, (table) => ({
  payIdx: index("fin_ap_alloc_pay_idx").on(table.paymentid),
  invIdx: index("fin_ap_alloc_inv_idx").on(table.apinvoiceid),
}));

export type FinVendor = typeof finVendors.$inferSelect;
export type FinApInvoice = typeof finApInvoices.$inferSelect;
export type FinApPayment = typeof finApPayments.$inferSelect;
```

---

### 1.7 Accounts Receivable — `lib/db/tables/finance-ar.ts`

```typescript
import { pgTable, uuid, text, timestamp, date, numeric, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { finJournalEntries } from "./finance-journal";
import type { FinArCustomerType, FinSourceType } from "./finance-enums";

export const finArTransactions = pgTable("fin_ar_transactions", {
  artransactionid: uuid("artransactionid").primaryKey().defaultRandom(),
  workspaceid:     uuid("workspaceid").notNull()
                     .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  customertype:    text("customertype").notNull().$type<FinArCustomerType>(),
  customerid:      text("customerid").notNull(),  // patients.patientid or insurance_companies.insuranceid
  sourcetype:      text("sourcetype").notNull().$type<FinSourceType>(),
  sourceid:        text("sourceid").notNull(),
  transactiondate: date("transactiondate").notNull(),
  debitamount:     numeric("debitamount",  { precision: 14, scale: 2 }).notNull().default("0"),
  creditamount:    numeric("creditamount", { precision: 14, scale: 2 }).notNull().default("0"),
  description:     text("description"),
  journalid:       uuid("journalid").references(() => finJournalEntries.journalid),
  createdat:       timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  wsIdx:       index("fin_ar_ws_idx").on(table.workspaceid),
  custIdx:     index("fin_ar_customer_idx").on(table.customertype, table.customerid),
  dateIdx:     index("fin_ar_date_idx").on(table.transactiondate),
  sourceIdx:   index("fin_ar_source_idx").on(table.sourcetype, table.sourceid),
}));

export type FinArTransaction = typeof finArTransactions.$inferSelect;
export type NewFinArTransaction = typeof finArTransactions.$inferInsert;
```

**Design:** AR uses flat transaction log. Customer balance = `SUM(debit) - SUM(credit)`.

---

### 1.8 Cash & Bank — `lib/db/tables/finance-bank.ts`

```typescript
import { pgTable, uuid, text, timestamp, numeric, boolean, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { finAccounts } from "./finance-accounts";
import type { FinBankAccountType } from "./finance-enums";

export const finBankAccounts = pgTable("fin_bank_accounts", {
  bankaccountid:  uuid("bankaccountid").primaryKey().defaultRandom(),
  workspaceid:    uuid("workspaceid").notNull()
                    .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  accountname:    text("accountname").notNull(),
  bankname:       text("bankname"),
  accountnumber:  text("accountnumber"),
  accounttype:    text("accounttype").notNull().$type<FinBankAccountType>(),
  currencycode:   text("currencycode").default("USD"),
  glaccountid:    uuid("glaccountid").notNull().references(() => finAccounts.accountid),
  currentbalance: numeric("currentbalance", { precision: 14, scale: 2 }).notNull().default("0"),
  isactive:       boolean("isactive").notNull().default(true),
  createdat:      timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  updatedat:      timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  wsIdx: index("fin_bank_ws_idx").on(table.workspaceid),
}));

export type FinBankAccount = typeof finBankAccounts.$inferSelect;
export type NewFinBankAccount = typeof finBankAccounts.$inferInsert;
```

---

### 1.9 Tax Configuration — `lib/db/tables/finance-tax.ts`

```typescript
import { pgTable, uuid, text, timestamp, date, numeric, boolean, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { finAccounts } from "./finance-accounts";
import type { FinTaxType } from "./finance-enums";

export const finTaxCodes = pgTable("fin_tax_codes", {
  taxcodeid:     uuid("taxcodeid").primaryKey().defaultRandom(),
  workspaceid:   uuid("workspaceid").notNull()
                   .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  code:          text("code").notNull(),
  name:          text("name").notNull(),
  rate:          numeric("rate", { precision: 5, scale: 2 }).notNull(),
  taxtype:       text("taxtype").notNull().$type<FinTaxType>(),
  isinclusive:   boolean("isinclusive").notNull().default(false),
  glaccountid:   uuid("glaccountid").references(() => finAccounts.accountid),
  isactive:      boolean("isactive").notNull().default(true),
  effectivefrom: date("effectivefrom").notNull(),
  effectiveto:   date("effectiveto"),
  createdat:     timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  wsIdx:   index("fin_tax_ws_idx").on(table.workspaceid),
  codeIdx: index("fin_tax_code_idx").on(table.workspaceid, table.code),
}));

export type FinTaxCode = typeof finTaxCodes.$inferSelect;
export type NewFinTaxCode = typeof finTaxCodes.$inferInsert;
```

---

### 1.10 Finance Audit Log — `lib/db/tables/finance-audit.ts`

```typescript
import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { users } from "./user";
import type { FinAuditAction } from "./finance-enums";

export const finAuditLog = pgTable("fin_audit_log", {
  auditid:     uuid("auditid").primaryKey().defaultRandom(),
  workspaceid: uuid("workspaceid").notNull()
                 .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  tablename:   text("tablename").notNull(),
  recordid:    uuid("recordid").notNull(),
  action:      text("action").notNull().$type<FinAuditAction>(),
  userid:      uuid("userid").notNull().references(() => users.userid),
  ipaddress:   text("ipaddress"),
  beforedata:  jsonb("beforedata"),
  afterdata:   jsonb("afterdata"),
  createdat:   timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tableIdx: index("fin_audit_table_idx").on(table.tablename, table.recordid),
  userIdx:  index("fin_audit_user_idx").on(table.userid),
  dateIdx:  index("fin_audit_date_idx").on(table.createdat),
  wsIdx:    index("fin_audit_ws_idx").on(table.workspaceid),
}));

export type FinAuditLogEntry = typeof finAuditLog.$inferSelect;
```

---

### 1.11 Schema Registration (append to `lib/db/schema.ts`)

```typescript
// ─── Finance Module ──────────────────────────────────────────────
export * from "./tables/finance-enums";
export * from "./tables/finance-accounts";
export * from "./tables/finance-periods";
export * from "./tables/finance-journal";
export * from "./tables/finance-balances";
export * from "./tables/finance-ap";
export * from "./tables/finance-ar";
export * from "./tables/finance-bank";
export * from "./tables/finance-tax";
export * from "./tables/finance-audit";
```

### 1.12 Table Summary

| Table | Purpose | Est. Rows/Month |
|-------|---------|-----------------|
| `fin_accounts` | Chart of Accounts | ~80 static |
| `fin_periods` | Fiscal periods | 12-16/year |
| `fin_journal_entries` | Journal headers | 2K-10K |
| `fin_journal_lines` | Journal lines | 6K-30K |
| `fin_account_balances` | Running totals | ~960/year |
| `fin_vendors` | Vendor finance data | ~50 static |
| `fin_ap_invoices` | Supplier invoices | 100-500 |
| `fin_ap_payments` | Supplier payments | 50-200 |
| `fin_ap_payment_allocations` | Payment→Invoice | 50-200 |
| `fin_ar_transactions` | AR movement log | 2K-10K |
| `fin_bank_accounts` | Bank/Cash accounts | ~5-10 static |
| `fin_tax_codes` | Tax configuration | ~5-10 static |
| `fin_audit_log` | Audit trail | 5K-20K |

---

## 2. API ENDPOINT SPECIFICATIONS

### 2.0 API Route Structure

All finance APIs are workspace-scoped: `/api/d/[workspaceid]/finance/`

```
app/api/d/[workspaceid]/finance/
├── accounts/route.ts                    GET · POST
├── accounts/[accountid]/route.ts        GET · PUT · DELETE(soft)
├── accounts/seed/route.ts               POST (seed COA from template)
├── periods/route.ts                     GET · POST
├── periods/[periodid]/route.ts          PUT (close/lock)
├── periods/generate/route.ts            POST (auto-generate year)
├── journal-entries/route.ts             GET · POST (manual)
├── journal-entries/[journalid]/route.ts GET (with lines)
├── journal-entries/[journalid]/post/route.ts     POST (post→GL)
├── journal-entries/[journalid]/reverse/route.ts  POST (reversal)
├── ap/vendors/route.ts                  GET · POST
├── ap/invoices/route.ts                 GET · POST
├── ap/invoices/[invoiceid]/route.ts     GET · PUT
├── ap/payments/route.ts                 GET · POST
├── ap/aging/route.ts                    GET
├── ar/transactions/route.ts             GET
├── ar/aging/route.ts                    GET (patient + insurance)
├── ar/customer-balance/route.ts         GET
├── bank/accounts/route.ts              GET · POST
├── bank/accounts/[id]/route.ts         GET · PUT
├── tax/codes/route.ts                  GET · POST
├── reports/trial-balance/route.ts      GET
├── reports/income-statement/route.ts   GET
├── reports/balance-sheet/route.ts      GET
├── reports/gl-detail/route.ts          GET
├── reports/dashboard/route.ts          GET (KPIs)
├── posting/route.ts                    POST (posting engine)
└── settings/route.ts                   GET · PUT
```

### 2.1 Key Endpoint Contracts

**POST `/finance/accounts/seed`** — Seed COA from template
- Request: `{ template: "healthcare_pharmacy" }`
- Response: `{ success: true, accountsCreated: 42 }`
- Rejects if workspace already has accounts

**POST `/finance/journal-entries`** — Create manual journal
- Request: `{ journaldate, description, lines: [{ accountcode, debit, credit, memo }] }`
- Validates: codes exist, period open, balanced, no group accounts
- Response: `{ journalid, journalnumber, status: "DRAFT", lines }`

**POST `/finance/journal-entries/[id]/post`** — Post draft to GL
- Validates: DRAFT status, period still OPEN, balanced
- Upserts `fin_account_balances` for each line
- Response: `{ journalid, status: "POSTED", balancesUpdated: N }`

**POST `/finance/posting`** — Unified posting engine endpoint
- Request: `{ sourcetype, sourceid, date, description, lines, metadata }`
- Idempotent: returns existing journal if sourcetype+sourceid already posted
- Response: `{ journalid, journalnumber, status: "POSTED", idempotent: bool }`

**GET `/finance/reports/trial-balance`** — Trial Balance
- Params: `?periodid=uuid` or `?asofdate=2026-04-30`
- Response: `{ accounts: [{ code, name, type, debit, credit }], totals, isBalanced }`

**GET `/finance/reports/income-statement`** — P&L
- Params: `?from=2026-01-01&to=2026-04-30`
- Response: `{ revenue, cogs, grossProfit, expenses, netProfit, margins }`

**GET `/finance/reports/balance-sheet`** — Balance Sheet
- Params: `?asofdate=2026-04-30`
- Response: `{ assets, liabilities, equity, isBalanced }`

**GET `/finance/reports/dashboard`** — Finance KPIs
- Response: `{ revenueMTD, cogsMTD, grossMargin%, netProfit, cashBalance, arOutstanding, apOutstanding, inventoryValue, overdueAR, overdueAP, trends }`

**GET `/finance/ar/aging`** — AR Aging
- Response: `{ patients: [{ id, name, current, days30, days60, days90, over90 }], insurance: [...], totals }`

**GET `/finance/ap/aging`** — AP Aging
- Response: `{ vendors: [{ id, name, current, days30, days60, days90, over90 }], totals }`

---

## 3. POSTING ENGINE DESIGN

### 3.1 Location & Architecture

**File:** `lib/finance/posting-engine.ts`

Called from: integration hooks (automatic), manual journal API, batch processes.

### 3.2 Interfaces

```typescript
interface PostingRequest {
  workspaceid: string;
  sourcetype: FinSourceType;
  sourceid: string | null;
  date: string;              // ISO "2026-04-19"
  description: string;
  lines: PostingLine[];
  metadata?: Record<string, unknown>;
  userid: string;
}

interface PostingLine {
  accountcode: string;
  debit: number;
  credit: number;
  memo?: string;
}

interface PostingResult {
  success: true;
  journalid: string;
  journalnumber: string;
  status: FinJournalStatus;
  idempotent: boolean;
}

interface PostingError {
  success: false;
  error: string;
  code: "VALIDATION_ERROR" | "PERIOD_CLOSED" | "DUPLICATE_CONFLICT";
}
```

### 3.3 Processing Steps

1. **Idempotency check** — if `sourceid` not null, look up existing `(workspaceid, sourcetype, sourceid)`. If found, return existing journal.
2. **Resolve account codes** → account IDs. Validate all exist, active, not group.
3. **Find open period** for `date`. Reject if none or closed.
4. **Validate balance** — `SUM(debits) === SUM(credits)`. Reject if off by > 0.001.
5. **Validate lines** — each has debit XOR credit > 0, no negatives.
6. **Generate journal number** — `JE-YYYY-NNNNNN` (sequential per workspace/year).
7. **DB transaction:**
   - Insert `fin_journal_entries` header
   - Insert `fin_journal_lines` for each line
   - Upsert `fin_account_balances` for each affected account+period
   - Insert `fin_audit_log`
8. **Return** journal ID and number.

### 3.4 Balance Upsert Logic

```
IF balance row exists for (accountid, periodid):
  perioddebit  += new debit
  periodcredit += new credit
  closingdebit  = openingdebit + perioddebit
  closingcredit = openingcredit + periodcredit
ELSE:
  opening = previous period's closing (or 0 if first period)
  Create new row with opening + new amounts
```

### 3.5 Journal Number Generation

```
SELECT MAX(journalnumber) FROM fin_journal_entries
WHERE workspaceid = ? AND journalnumber LIKE 'JE-2026-%'
→ Parse sequence, increment, pad to 6 digits
→ "JE-2026-000001", "JE-2026-000002", ...
```

### 3.6 FIFO COGS Calculator

**File:** `lib/finance/cogs-calculator.ts`

```
Input: drugid, quantityNeeded, preferredBatchid?
Steps:
1. Query drug_batches JOIN pharmacy_stock_levels WHERE drugid=? AND qty > 0 ORDER BY expirydate ASC
2. If preferredBatchid given, move that batch to front
3. For each batch (FIFO order):
   - consume = MIN(remaining, available)
   - linecost = consume × purchaseprice
   - totalCOGS += linecost
   - remaining -= consume
4. Return { totalCost, batchBreakdown[] }
5. If remaining > 0: warn (insufficient batch cost data) but don't fail
```

---

*Continued in Part 2: `docs/FINANCE_TECHNICAL_DESIGN_PART2.md`*
