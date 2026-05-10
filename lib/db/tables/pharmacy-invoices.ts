/**
 * Pharmacy Invoices & Invoice Lines tables (Drizzle ORM)
 *
 * - invoices: header-level billing document tied to an order
 * - invoice_lines: line items with price, quantity, insurance adjustments
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { patients } from "./patient";
import { pharmacyOrders } from "./pharmacy-orders";
import { insuranceCompanies } from "./pharmacy-insurance";
import { drugs } from "./pharmacy-drugs";

// ── Invoice statuses ──────────────────────────────────────────────────
export const INVOICE_STATUS = {
  DRAFT: "DRAFT",
  ISSUED: "ISSUED",
  PAID: "PAID",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  CANCELLED: "CANCELLED",
} as const;

export type InvoiceStatus =
  (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

// ── Invoices ──────────────────────────────────────────────────────────
export const invoices = pgTable(
  "pharmacy_invoices",
  {
    invoiceid: uuid("invoiceid").primaryKey().defaultRandom(),
    orderid: uuid("orderid")
      .notNull()
      .references(() => pharmacyOrders.orderid, { onDelete: "cascade" }),
    patientid: uuid("patientid")
      .references(() => patients.patientid, { onDelete: "set null" }),
    insuranceid: uuid("insuranceid")
      .references(() => insuranceCompanies.insuranceid, { onDelete: "set null" }),
    invoicenumber: text("invoicenumber").notNull(),
    status: text("status").notNull().$type<InvoiceStatus>().default("DRAFT"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    insurancecovered: numeric("insurancecovered", { precision: 12, scale: 2 }).notNull().default("0"),
    patientcopay: numeric("patientcopay", { precision: 12, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderIdx: index("pharmacy_invoices_order_idx").on(table.orderid),
    patientIdx: index("pharmacy_invoices_patient_idx").on(table.patientid),
  })
);

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

// ── Invoice line items ────────────────────────────────────────────────
export const invoiceLines = pgTable(
  "pharmacy_invoice_lines",
  {
    lineid: uuid("lineid").primaryKey().defaultRandom(),
    invoiceid: uuid("invoiceid")
      .notNull()
      .references(() => invoices.invoiceid, { onDelete: "cascade" }),
    drugid: uuid("drugid")
      .references(() => drugs.drugid, { onDelete: "set null" }),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitprice: numeric("unitprice", { precision: 12, scale: 2 }).notNull(),
    linetotal: numeric("linetotal", { precision: 12, scale: 2 }).notNull(),
    insurancecovered: numeric("insurancecovered", { precision: 12, scale: 2 }).notNull().default("0"),
    patientpays: numeric("patientpays", { precision: 12, scale: 2 }).notNull().default("0"),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    invoiceIdx: index("pharmacy_invoice_lines_inv_idx").on(table.invoiceid),
  })
);

export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type NewInvoiceLine = typeof invoiceLines.$inferInsert;
