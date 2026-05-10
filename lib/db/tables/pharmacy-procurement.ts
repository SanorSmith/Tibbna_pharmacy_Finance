import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  numeric,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const pharmacyPoStatusEnum = pgEnum("pharmacy_po_status", [
  "PENDING", "PARTIALLY_DELIVERED", "DELIVERED", "CANCELLED",
]);

export const pharmacyGrnStatusEnum = pgEnum("pharmacy_grn_status", [
  "PENDING", "PARTIAL", "COMPLETE", "CORRECTION",
]);

// ─── Pharmacy Purchase Orders ─────────────────────────────────────────────────

export const pharmacyPurchaseOrders = pgTable("pharmacy_purchase_orders", {
  id:            uuid("id").primaryKey().defaultRandom(),
  workspaceid:   uuid("workspace_id").notNull(),
  ordernumber:   varchar("order_number", { length: 50 }).notNull(),
  orderedby:     varchar("ordered_by", { length: 120 }).notNull(),
  orderdate:     timestamp("order_date", { withTimezone: true }).defaultNow(),
  expecteddate:  timestamp("expected_date", { withTimezone: true }),
  supplierid:    uuid("supplier_id"),
  suppliername:  varchar("supplier_name", { length: 200 }),
  supplieremail: varchar("supplier_email", { length: 200 }),
  supplierphone: varchar("supplier_phone", { length: 50 }),
  status:        pharmacyPoStatusEnum("status").default("PENDING"),
  notes:         text("notes"),
  totalamount:   numeric("total_amount", { precision: 12, scale: 2 }).default("0"),
  isedited:      boolean("is_edited").default(false),
  cancelreason:  text("cancel_reason"),
  createdat:     timestamp("createdat", { withTimezone: true }).defaultNow(),
  updatedat:     timestamp("updatedat", { withTimezone: true }).defaultNow(),
});

// ─── Pharmacy Purchase Order Items ────────────────────────────────────────────

export const pharmacyPurchaseOrderItems = pgTable("pharmacy_purchase_order_items", {
  id:         uuid("id").primaryKey().defaultRandom(),
  orderid:    uuid("order_id").notNull().references(() => pharmacyPurchaseOrders.id, { onDelete: "cascade" }),
  itemid:     uuid("item_id"),
  itemname:   varchar("item_name", { length: 200 }),
  uom:        varchar("uom", { length: 50 }),
  orderedqty: integer("ordered_qty").notNull().default(0),
  unitcost:   numeric("unit_cost", { precision: 10, scale: 2 }),
  totalcost:  numeric("total_cost", { precision: 12, scale: 2 }),
  notes:      text("notes"),
  createdat:  timestamp("createdat", { withTimezone: true }).defaultNow(),
});

// ─── Pharmacy Goods Receipt ───────────────────────────────────────────────────

export const pharmacyGoodsReceipt = pgTable("pharmacy_goods_receipt", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  workspaceid:         uuid("workspace_id").notNull(),
  receiptnumber:       varchar("receipt_number", { length: 50 }).notNull(),
  orderid:             uuid("order_id").references(() => pharmacyPurchaseOrders.id),
  ordernumber:         varchar("order_number", { length: 50 }),
  deliverynotenumber:  varchar("delivery_note_number", { length: 100 }),
  receivedby:          varchar("received_by", { length: 120 }).notNull(),
  receiptdate:         timestamp("receipt_date", { withTimezone: true }).defaultNow(),
  suppliername:        varchar("supplier_name", { length: 200 }),
  supplieremail:       varchar("supplier_email", { length: 200 }),
  status:              pharmacyGrnStatusEnum("status").default("PENDING"),
  notes:               text("notes"),
  isreversal:          boolean("is_reversal").default(false),
  correctionof:        uuid("correction_of"),
  correctionreason:    text("correction_reason"),
  correctedby:         varchar("corrected_by", { length: 120 }),
  correctiontype:      varchar("correction_type", { length: 20 }),
  createdat:           timestamp("createdat", { withTimezone: true }).defaultNow(),
  updatedat:           timestamp("updatedat", { withTimezone: true }).defaultNow(),
});

// ─── Pharmacy Goods Receipt Items ─────────────────────────────────────────────

export const pharmacyGoodsReceiptItems = pgTable("pharmacy_goods_receipt_items", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  receiptid:           uuid("receipt_id").notNull().references(() => pharmacyGoodsReceipt.id, { onDelete: "cascade" }),
  itemid:              uuid("item_id"),
  itemname:            varchar("item_name", { length: 200 }),
  uom:                 varchar("uom", { length: 50 }),
  orderedqty:          integer("ordered_qty").default(0),
  receivedqty:         integer("received_qty").notNull().default(0),
  deliveredtotal:      integer("delivered_total"),
  returnclaim:         integer("return_claim").default(0),
  dnregnum:            varchar("dn_reg_num", { length: 100 }),
  unitcost:            numeric("unit_cost", { precision: 10, scale: 2 }),
  batchnumber:         varchar("batch_number", { length: 100 }),
  lotnumber:           varchar("lot_number", { length: 100 }),
  expirydate:          timestamp("expiry_date", { withTimezone: true }),
  manufacturedate:      timestamp("manufacture_date", { withTimezone: true }),
  notes:               text("notes"),
  correctionofitemid:  uuid("correction_of_item_id"),
  createdat:           timestamp("createdat", { withTimezone: true }).defaultNow(),
});

// ─── Pharmacy Claim Damage ────────────────────────────────────────────────────

export const pharmacyClaimDamage = pgTable("pharmacy_claim_damage", {
  id:        uuid("id").primaryKey().defaultRandom(),
  receiptid: uuid("receipt_id").notNull().references(() => pharmacyGoodsReceipt.id, { onDelete: "cascade" }),
  itemid:    uuid("item_id"),
  itemname:  varchar("item_name", { length: 200 }),
  quantity:  integer("quantity").default(0),
  note:      varchar("note", { length: 200 }),
  createdat: timestamp("createdat", { withTimezone: true }).defaultNow(),
});

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type PharmacyPurchaseOrder = typeof pharmacyPurchaseOrders.$inferSelect;
export type NewPharmacyPurchaseOrder = typeof pharmacyPurchaseOrders.$inferInsert;
export type PharmacyPurchaseOrderItem = typeof pharmacyPurchaseOrderItems.$inferSelect;
export type NewPharmacyPurchaseOrderItem = typeof pharmacyPurchaseOrderItems.$inferInsert;
export type PharmacyGoodsReceiptType = typeof pharmacyGoodsReceipt.$inferSelect;
export type NewPharmacyGoodsReceipt = typeof pharmacyGoodsReceipt.$inferInsert;
export type PharmacyGoodsReceiptItem = typeof pharmacyGoodsReceiptItems.$inferSelect;
export type NewPharmacyGoodsReceiptItem = typeof pharmacyGoodsReceiptItems.$inferInsert;
export type PharmacyClaimDamageType = typeof pharmacyClaimDamage.$inferSelect;
export type NewPharmacyClaimDamage = typeof pharmacyClaimDamage.$inferInsert;
