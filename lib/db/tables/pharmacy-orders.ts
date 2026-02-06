/**
 * Pharmacy Orders & Order Items tables (Drizzle ORM)
 *
 * - pharmacy_orders: medication orders (from openEHR or manual entry)
 * - pharmacy_order_items: line items for each drug in an order
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { patients } from "./patient";
import { drugs, drugBatches } from "./pharmacy-drugs";

// ── Order statuses ────────────────────────────────────────────────────
export const PHARMACY_ORDER_STATUS = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  DISPENSED: "DISPENSED",
  PARTIALLY_DISPENSED: "PARTIALLY_DISPENSED",
  CANCELLED: "CANCELLED",
  ON_HOLD: "ON_HOLD",
} as const;

export type PharmacyOrderStatus =
  (typeof PHARMACY_ORDER_STATUS)[keyof typeof PHARMACY_ORDER_STATUS];

// ── Item statuses ─────────────────────────────────────────────────────
export const PHARMACY_ITEM_STATUS = {
  PENDING: "PENDING",
  SCANNED: "SCANNED",
  DISPENSED: "DISPENSED",
  SUBSTITUTED: "SUBSTITUTED",
  OUT_OF_STOCK: "OUT_OF_STOCK",
  CANCELLED: "CANCELLED",
} as const;

export type PharmacyItemStatus =
  (typeof PHARMACY_ITEM_STATUS)[keyof typeof PHARMACY_ITEM_STATUS];

// ── Pharmacy orders ───────────────────────────────────────────────────
export const pharmacyOrders = pgTable(
  "pharmacy_orders",
  {
    orderid: uuid("orderid").primaryKey().defaultRandom(),
    workspaceid: uuid("workspaceid")
      .notNull()
      .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
    patientid: uuid("patientid")
      .references(() => patients.patientid, { onDelete: "set null" }),
    prescriberid: uuid("prescriberid"), // doctor who prescribed
    status: text("status").notNull().$type<PharmacyOrderStatus>().default("PENDING"),
    source: text("source").notNull().default("manual"), // "openehr" | "manual"
    openehrorderid: text("openehrorderid"), // external openEHR composition UID
    priority: text("priority").notNull().default("routine"), // routine | urgent | stat
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    dispensedby: uuid("dispensedby"),
    dispensedat: timestamp("dispensedat", { withTimezone: true }),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("pharmacy_orders_ws_idx").on(table.workspaceid),
    patientIdx: index("pharmacy_orders_patient_idx").on(table.patientid),
    statusIdx: index("pharmacy_orders_status_idx").on(table.status),
    openehrIdx: index("pharmacy_orders_openehr_idx").on(table.openehrorderid),
  })
);

export type PharmacyOrder = typeof pharmacyOrders.$inferSelect;
export type NewPharmacyOrder = typeof pharmacyOrders.$inferInsert;

// ── Order line items ──────────────────────────────────────────────────
export const pharmacyOrderItems = pgTable(
  "pharmacy_order_items",
  {
    itemid: uuid("itemid").primaryKey().defaultRandom(),
    orderid: uuid("orderid")
      .notNull()
      .references(() => pharmacyOrders.orderid, { onDelete: "cascade" }),
    drugid: uuid("drugid")
      .references(() => drugs.drugid, { onDelete: "set null" }),
    batchid: uuid("batchid")
      .references(() => drugBatches.batchid, { onDelete: "set null" }),
    drugname: text("drugname").notNull(), // denormalized for display
    dosage: text("dosage"), // e.g. "500 mg twice daily"
    quantity: integer("quantity").notNull().default(1),
    unitprice: numeric("unitprice", { precision: 12, scale: 2 }),
    status: text("status").notNull().$type<PharmacyItemStatus>().default("PENDING"),
    scannedbarcode: text("scannedbarcode"),
    scannedat: timestamp("scannedat", { withTimezone: true }),
    notes: text("notes"),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderIdx: index("pharmacy_order_items_order_idx").on(table.orderid),
    drugIdx: index("pharmacy_order_items_drug_idx").on(table.drugid),
  })
);

export type PharmacyOrderItem = typeof pharmacyOrderItems.$inferSelect;
export type NewPharmacyOrderItem = typeof pharmacyOrderItems.$inferInsert;
