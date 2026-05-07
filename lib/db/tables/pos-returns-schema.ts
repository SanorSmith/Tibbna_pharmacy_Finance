/**
 * POS Returns/Refunds System tables (Drizzle ORM)
 *
 * - pos_return_reasons: predefined return reason policies
 * - pos_returns: main return transactions
 * - pos_return_items: individual items being returned
 * - pos_refund_transactions: refund payment records
 */
import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { users } from "./user";
import { patients } from "./patient";
import { posSales, posSaleItems, posShifts } from "./pos-schema";

// ── Return types ─────────────────────────────────────────────────────────
export const POS_RETURN_TYPE = {
  FULL_RETURN: "FULL_RETURN",
  PARTIAL_RETURN: "PARTIAL_RETURN",
  EXCHANGE: "EXCHANGE",
} as const;

export type PosReturnType =
  (typeof POS_RETURN_TYPE)[keyof typeof POS_RETURN_TYPE];

// ── Return statuses ──────────────────────────────────────────────────────
export const POS_RETURN_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  COMPLETED: "COMPLETED",
} as const;

export type PosReturnStatus =
  (typeof POS_RETURN_STATUS)[keyof typeof POS_RETURN_STATUS];

// ── Refund methods ───────────────────────────────────────────────────────
export const POS_REFUND_METHOD = {
  CASH: "CASH",
  CARD: "CARD",
  STORE_CREDIT: "STORE_CREDIT",
  ORIGINAL_METHOD: "ORIGINAL_METHOD",
} as const;

export type PosRefundMethod =
  (typeof POS_REFUND_METHOD)[keyof typeof POS_REFUND_METHOD];

// ── Item condition ───────────────────────────────────────────────────────
export const POS_ITEM_CONDITION = {
  NEW: "NEW",
  OPENED: "OPENED",
  DAMAGED: "DAMAGED",
  DEFECTIVE: "DEFECTIVE",
  EXPIRED: "EXPIRED",
} as const;

export type PosItemCondition =
  (typeof POS_ITEM_CONDITION)[keyof typeof POS_ITEM_CONDITION];

// ═══════════════════════════════════════════════════════════════════════════
// 1. POS Return Reasons (Predefined reason policies)
// ═══════════════════════════════════════════════════════════════════════════
export const posReturnReasons = pgTable(
  "pos_return_reasons",
  {
    reasonid: uuid("reasonid").primaryKey().defaultRandom(),
    workspaceid: uuid("workspaceid")
      .notNull()
      .references(() => workspaces.workspaceid, { onDelete: "cascade" }),

    reasoncode: text("reasoncode").notNull(),
    reasonname: text("reasonname").notNull(),
    reasondescription: text("reasondescription"),

    // Policy settings
    requiresapproval: boolean("requiresapproval").notNull().default(false),
    allowsexchange: boolean("allowsexchange").notNull().default(true),
    applyrestockingfee: boolean("applyrestockingfee").notNull().default(false),
    restockingfeepercentage: numeric("restockingfeepercentage", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("0"),

    isactive: boolean("isactive").notNull().default(true),
    displayorder: integer("displayorder").notNull().default(0),

    createdat: timestamp("createdat", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("idx_pos_return_reasons_workspace").on(
      table.workspaceid
    ),
    activeIdx: index("idx_pos_return_reasons_active").on(table.isactive),
  })
);

export type PosReturnReason = typeof posReturnReasons.$inferSelect;
export type NewPosReturnReason = typeof posReturnReasons.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════
// 2. POS Returns (Main return transactions)
// ═══════════════════════════════════════════════════════════════════════════
export const posReturns = pgTable(
  "pos_returns",
  {
    returnid: uuid("returnid").primaryKey().defaultRandom(),
    returnnumber: text("returnnumber").notNull().unique(),
    workspaceid: uuid("workspaceid")
      .notNull()
      .references(() => workspaces.workspaceid, { onDelete: "cascade" }),

    // Original Sale Reference
    originalsaleid: uuid("originalsaleid")
      .notNull()
      .references(() => posSales.saleid, { onDelete: "restrict" }),
    originalsalenumber: text("originalsalenumber"),
    originalsaledate: timestamp("originalsaledate", { withTimezone: true }),

    // Return Details
    returntype: text("returntype").notNull().$type<PosReturnType>(),
    returndate: timestamp("returndate", { withTimezone: true })
      .notNull()
      .defaultNow(),
    returnreasonid: uuid("returnreasonid").references(
      () => posReturnReasons.reasonid,
      { onDelete: "set null" }
    ),
    returnnotes: text("returnnotes"),

    // Customer Info
    patientid: uuid("patientid").references(() => patients.patientid, {
      onDelete: "set null",
    }),
    customername: text("customername"),
    customerphone: text("customerphone"),

    // Financial
    totalreturnamount: numeric("totalreturnamount", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    restockingfee: numeric("restockingfee", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    refundamount: numeric("refundamount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    refundmethod: text("refundmethod").$type<PosRefundMethod>(),

    // Status
    status: text("status")
      .notNull()
      .$type<PosReturnStatus>()
      .default("PENDING"),

    // Approval workflow
    requiresapproval: boolean("requiresapproval").notNull().default(false),
    approvedby: uuid("approvedby").references(() => users.userid, {
      onDelete: "set null",
    }),
    approvedat: timestamp("approvedat", { withTimezone: true }),
    rejectionreason: text("rejectionreason"),

    // Processing
    processedby: uuid("processedby").references(() => users.userid, {
      onDelete: "set null",
    }),
    processedat: timestamp("processedat", { withTimezone: true }),
    shiftid: uuid("shiftid").references(() => posShifts.shiftid, {
      onDelete: "set null",
    }),

    // Audit
    createdat: timestamp("createdat", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("idx_pos_returns_workspace").on(table.workspaceid),
    originalSaleIdx: index("idx_pos_returns_original_sale").on(
      table.originalsaleid
    ),
    dateIdx: index("idx_pos_returns_date").on(table.returndate),
    statusIdx: index("idx_pos_returns_status").on(table.status),
    numberIdx: index("idx_pos_returns_number").on(table.returnnumber),
    shiftIdx: index("idx_pos_returns_shift").on(table.shiftid),
  })
);

export type PosReturn = typeof posReturns.$inferSelect;
export type NewPosReturn = typeof posReturns.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════
// 3. POS Return Items (Individual items being returned)
// ═══════════════════════════════════════════════════════════════════════════
export const posReturnItems = pgTable(
  "pos_return_items",
  {
    returnitemid: uuid("returnitemid").primaryKey().defaultRandom(),
    returnid: uuid("returnid")
      .notNull()
      .references(() => posReturns.returnid, { onDelete: "cascade" }),

    // Original Sale Item Reference
    originalsaleitemid: uuid("originalsaleitemid").references(
      () => posSaleItems.itemid,
      { onDelete: "set null" }
    ),

    // Product Info (denormalized for historical accuracy)
    drugid: uuid("drugid"),
    drugname: text("drugname").notNull(),
    batchid: uuid("batchid"),
    lotnumber: text("lotnumber"),

    // Quantities
    quantityreturned: integer("quantityreturned").notNull(),
    originalquantity: integer("originalquantity"),

    // Pricing (from original sale)
    unitprice: numeric("unitprice", { precision: 10, scale: 2 }).notNull(),
    totalprice: numeric("totalprice", { precision: 10, scale: 2 }).notNull(),

    // Condition & restocking
    itemcondition: text("itemcondition")
      .$type<PosItemCondition>()
      .default("OPENED"),
    restockeligible: boolean("restockeligible").notNull().default(true),
    restocked: boolean("restocked").notNull().default(false),

    // Notes
    itemnotes: text("itemnotes"),

    createdat: timestamp("createdat", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    returnIdx: index("idx_pos_return_items_return").on(table.returnid),
    drugIdx: index("idx_pos_return_items_drug").on(table.drugid),
  })
);

export type PosReturnItem = typeof posReturnItems.$inferSelect;
export type NewPosReturnItem = typeof posReturnItems.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════
// 4. POS Refund Transactions (Refund payment records)
// ═══════════════════════════════════════════════════════════════════════════
export const posRefundTransactions = pgTable(
  "pos_refund_transactions",
  {
    refundtransactionid: uuid("refundtransactionid")
      .primaryKey()
      .defaultRandom(),
    returnid: uuid("returnid")
      .notNull()
      .references(() => posReturns.returnid, { onDelete: "cascade" }),

    refundamount: numeric("refundamount", { precision: 12, scale: 2 })
      .notNull(),
    refundmethod: text("refundmethod").notNull().$type<PosRefundMethod>(),

    // Payment details
    paymentreference: text("paymentreference"),
    cardlast4: text("cardlast4"),

    // Store credit
    storecreditcode: text("storecreditcode"),

    transactiondate: timestamp("transactiondate", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedby: uuid("processedby").references(() => users.userid, {
      onDelete: "set null",
    }),

    createdat: timestamp("createdat", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    returnIdx: index("idx_pos_refund_trans_return").on(table.returnid),
    methodIdx: index("idx_pos_refund_trans_method").on(table.refundmethod),
  })
);

export type PosRefundTransaction = typeof posRefundTransactions.$inferSelect;
export type NewPosRefundTransaction = typeof posRefundTransactions.$inferInsert;
