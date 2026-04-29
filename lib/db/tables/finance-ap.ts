/**
 * Finance Module — Accounts Payable (Drizzle ORM)
 *
 * Vendor financial master, AP invoices, payments, and allocations.
 * finVendors extends existing vendors table via same UUID.
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
import { finJournalEntries } from "./finance-journal";
import { finBankAccounts } from "./finance-bank";
import type { FinApStatus, FinPaymentMethod } from "./finance-enums";

// ── Vendor Financial Master ──────────────────────────────────────
export const finVendors = pgTable(
  "fin_vendors",
  {
    vendorid: uuid("vendorid").primaryKey(), // same ID as vendors.id
    workspaceid: uuid("workspaceid")
      .notNull()
      .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
    paymentterms: text("paymentterms").default("NET_30"),
    creditlimit: numeric("creditlimit", { precision: 14, scale: 2 }),
    currencycode: text("currencycode").default("USD"),
    taxid: text("taxid"),
    createdat: timestamp("createdat", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    wsIdx: index("fin_vendors_ws_idx").on(table.workspaceid),
  })
);

export type FinVendor = typeof finVendors.$inferSelect;
export type NewFinVendor = typeof finVendors.$inferInsert;

// ── AP Invoices (Supplier Invoices) ──────────────────────────────
export const finApInvoices = pgTable(
  "fin_ap_invoices",
  {
    apinvoiceid: uuid("apinvoiceid").primaryKey().defaultRandom(),
    workspaceid: uuid("workspaceid")
      .notNull()
      .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
    vendorid: uuid("vendorid")
      .notNull()
      .references(() => finVendors.vendorid),
    invoicenumber: text("invoicenumber").notNull(),
    supplierinvoicenumber: text("supplierinvoicenumber"),
    invoicedate: date("invoicedate").notNull(),
    duedate: date("duedate").notNull(),
    grnid: uuid("grnid"), // → goods_receipt_notes.id
    poid: uuid("poid"), // → purchase_orders.id
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
    taxamount: numeric("taxamount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    totalamount: numeric("totalamount", { precision: 14, scale: 2 }).notNull(),
    paidamount: numeric("paidamount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    balancedue: numeric("balancedue", { precision: 14, scale: 2 }).notNull(),
    status: text("status").notNull().$type<FinApStatus>().default("DRAFT"),
    journalid: uuid("journalid").references(
      () => finJournalEntries.journalid
    ),
    approvedby: uuid("approvedby").references(() => users.userid),
    approvedat: timestamp("approvedat", { withTimezone: true }),
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
    vendorInvUniq: unique("fin_ap_vendor_inv_uq").on(
      table.vendorid,
      table.supplierinvoicenumber
    ),
    wsIdx: index("fin_ap_inv_ws_idx").on(table.workspaceid),
    vendorIdx: index("fin_ap_inv_vendor_idx").on(table.vendorid),
    statusIdx: index("fin_ap_inv_status_idx").on(table.status),
    dueDateIdx: index("fin_ap_inv_due_idx").on(table.duedate),
  })
);

export type FinApInvoice = typeof finApInvoices.$inferSelect;
export type NewFinApInvoice = typeof finApInvoices.$inferInsert;

// ── AP Payments ──────────────────────────────────────────────────
export const finApPayments = pgTable(
  "fin_ap_payments",
  {
    paymentid: uuid("paymentid").primaryKey().defaultRandom(),
    workspaceid: uuid("workspaceid")
      .notNull()
      .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
    vendorid: uuid("vendorid")
      .notNull()
      .references(() => finVendors.vendorid),
    paymentdate: date("paymentdate").notNull(),
    paymentmethod: text("paymentmethod")
      .notNull()
      .$type<FinPaymentMethod>(),
    bankaccountid: uuid("bankaccountid").references(
      () => finBankAccounts.bankaccountid
    ),
    reference: text("reference"),
    totalamount: numeric("totalamount", { precision: 14, scale: 2 }).notNull(),
    journalid: uuid("journalid").references(
      () => finJournalEntries.journalid
    ),
    createdby: uuid("createdby")
      .notNull()
      .references(() => users.userid),
    createdat: timestamp("createdat", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    wsIdx: index("fin_ap_pay_ws_idx").on(table.workspaceid),
    vendorIdx: index("fin_ap_pay_vendor_idx").on(table.vendorid),
  })
);

export type FinApPayment = typeof finApPayments.$inferSelect;
export type NewFinApPayment = typeof finApPayments.$inferInsert;

// ── AP Payment Allocations ───────────────────────────────────────
export const finApPaymentAllocations = pgTable(
  "fin_ap_payment_allocations",
  {
    allocationid: uuid("allocationid").primaryKey().defaultRandom(),
    paymentid: uuid("paymentid")
      .notNull()
      .references(() => finApPayments.paymentid, { onDelete: "cascade" }),
    apinvoiceid: uuid("apinvoiceid")
      .notNull()
      .references(() => finApInvoices.apinvoiceid),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  },
  (table) => ({
    payIdx: index("fin_ap_alloc_pay_idx").on(table.paymentid),
    invIdx: index("fin_ap_alloc_inv_idx").on(table.apinvoiceid),
  })
);

export type FinApPaymentAllocation =
  typeof finApPaymentAllocations.$inferSelect;
export type NewFinApPaymentAllocation =
  typeof finApPaymentAllocations.$inferInsert;

// ── Relations ────────────────────────────────────────────────────
export const finVendorsRelations = relations(finVendors, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [finVendors.workspaceid],
    references: [workspaces.workspaceid],
  }),
  invoices: many(finApInvoices),
  payments: many(finApPayments),
}));

export const finApInvoicesRelations = relations(
  finApInvoices,
  ({ one, many }) => ({
    vendor: one(finVendors, {
      fields: [finApInvoices.vendorid],
      references: [finVendors.vendorid],
    }),
    journal: one(finJournalEntries, {
      fields: [finApInvoices.journalid],
      references: [finJournalEntries.journalid],
    }),
    allocations: many(finApPaymentAllocations),
  })
);

export const finApPaymentsRelations = relations(
  finApPayments,
  ({ one, many }) => ({
    vendor: one(finVendors, {
      fields: [finApPayments.vendorid],
      references: [finVendors.vendorid],
    }),
    journal: one(finJournalEntries, {
      fields: [finApPayments.journalid],
      references: [finJournalEntries.journalid],
    }),
    allocations: many(finApPaymentAllocations),
  })
);

export const finApPaymentAllocationsRelations = relations(
  finApPaymentAllocations,
  ({ one }) => ({
    payment: one(finApPayments, {
      fields: [finApPaymentAllocations.paymentid],
      references: [finApPayments.paymentid],
    }),
    invoice: one(finApInvoices, {
      fields: [finApPaymentAllocations.apinvoiceid],
      references: [finApInvoices.apinvoiceid],
    }),
  })
);
