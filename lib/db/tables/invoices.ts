/**
 * General Invoices & Invoice Items Tables
 * 
 * For billing all services: lab tests, consultations, operations, etc.
 * Separate from pharmacy-specific invoices
 */

import { pgTable, text, timestamp, numeric, uuid, varchar, date, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── General Invoices ──────────────────────────────────────────────────
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoice_number: varchar("invoice_number", { length: 50 }).notNull().unique(),
    invoice_date: date("invoice_date").notNull(),
    
    // Patient information
    patient_id: varchar("patient_id", { length: 50 }),
    patient_name: varchar("patient_name", { length: 255 }),
    patient_name_ar: text("patient_name_ar"),
    
    // Financial details
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    discount_percentage: numeric("discount_percentage", { precision: 5, scale: 2 }).default("0"),
    discount_amount: numeric("discount_amount", { precision: 12, scale: 2 }).default("0"),
    total_amount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    
    // Insurance
    insurance_company_id: varchar("insurance_company_id", { length: 50 }),
    insurance_coverage_amount: numeric("insurance_coverage_amount", { precision: 12, scale: 2 }).default("0"),
    insurance_coverage_percentage: numeric("insurance_coverage_percentage", { precision: 5, scale: 2 }).default("0"),
    patient_responsibility: numeric("patient_responsibility", { precision: 12, scale: 2 }).default("0"),
    
    // Payment tracking
    amount_paid: numeric("amount_paid", { precision: 12, scale: 2 }).default("0"),
    balance_due: numeric("balance_due", { precision: 12, scale: 2 }).default("0"),
    status: varchar("status", { length: 20 }).default("PENDING"),
    payment_method: varchar("payment_method", { length: 50 }),
    payment_date: date("payment_date"),
    
    // Notes
    notes: text("notes"),
    
    // Timestamps
    createdat: timestamp("createdat").defaultNow(),
    updatedat: timestamp("updatedat").defaultNow(),
  }
);

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

// ── Invoice Items ──────────────────────────────────────────────────
export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoice_id: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    
    // Service details
    service_id: varchar("service_id", { length: 50 }),
    service_name: varchar("service_name", { length: 255 }),
    service_name_ar: text("service_name_ar"),
    
    // Pricing
    quantity: numeric("quantity", { precision: 8, scale: 2 }).notNull().default("1"),
    unit_price: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
    total_price: numeric("total_price", { precision: 12, scale: 2 }).notNull().default("0"),
    
    // Timestamp
    createdat: timestamp("createdat").defaultNow(),
  }
);

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;

// ── Relations ──────────────────────────────────────────────────
export const invoicesRelations = relations(invoices, ({ many }) => ({
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoice_id],
    references: [invoices.id],
  }),
}));
