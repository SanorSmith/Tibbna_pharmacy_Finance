/**
 * POS (Point of Sale) System tables (Drizzle ORM)
 *
 * - pos_sales: main sale transactions
 * - pos_sale_items: line items per sale
 * - pos_payments: payment records (multi-tender)
 * - pos_shifts: cashier shift open/close
 * - patient_credit_accounts: credit/tab accounts for patients
 */
import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  timestamp,
  boolean,
  date,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { users } from "./user";
import { patients } from "./patient";
import { pharmacyOrders, pharmacyOrderItems } from "./pharmacy-orders";
import { insuranceCompanies } from "./pharmacy-insurance";
import { drugs, drugBatches } from "./pharmacy-drugs";

// ── Sale types ──────────────────────────────────────────────────────────
export const POS_SALE_TYPE = {
  DISPENSED_ORDER: "DISPENSED_ORDER",
  NEW_PRESCRIPTION: "NEW_PRESCRIPTION",
  OTC_WALKIN: "OTC_WALKIN",
} as const;

export type PosSaleType = (typeof POS_SALE_TYPE)[keyof typeof POS_SALE_TYPE];

// ── Sale statuses ───────────────────────────────────────────────────────
export const POS_SALE_STATUS = {
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
} as const;

export type PosSaleStatus =
  (typeof POS_SALE_STATUS)[keyof typeof POS_SALE_STATUS];

// ── Payment methods ─────────────────────────────────────────────────────
export const POS_PAYMENT_METHOD = {
  CASH: "CASH",
  CARD: "CARD",
  INSURANCE: "INSURANCE",
  CREDIT_ACCOUNT: "CREDIT_ACCOUNT",
} as const;

export type PosPaymentMethod =
  (typeof POS_PAYMENT_METHOD)[keyof typeof POS_PAYMENT_METHOD];

// ── Payment statuses ────────────────────────────────────────────────────
export const POS_PAYMENT_STATUS = {
  COMPLETED: "COMPLETED",
  PENDING: "PENDING",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;

export type PosPaymentStatus =
  (typeof POS_PAYMENT_STATUS)[keyof typeof POS_PAYMENT_STATUS];

// ── Shift statuses ──────────────────────────────────────────────────────
export const POS_SHIFT_STATUS = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
} as const;

export type PosShiftStatus =
  (typeof POS_SHIFT_STATUS)[keyof typeof POS_SHIFT_STATUS];

// ── Credit account statuses ─────────────────────────────────────────────
export const CREDIT_ACCOUNT_STATUS = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  CLOSED: "CLOSED",
} as const;

export type CreditAccountStatus =
  (typeof CREDIT_ACCOUNT_STATUS)[keyof typeof CREDIT_ACCOUNT_STATUS];

// ═══════════════════════════════════════════════════════════════════════════
// 1. POS Sales (Main transactions)
// ═══════════════════════════════════════════════════════════════════════════
export const posSales = pgTable(
  "pos_sales",
  {
    saleid: uuid("saleid").primaryKey().defaultRandom(),
    workspaceid: uuid("workspaceid")
      .notNull()
      .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
    salenumber: text("salenumber").notNull().unique(),
    saledate: timestamp("saledate", { withTimezone: true }).notNull().defaultNow(),

    // Customer
    patientid: uuid("patientid").references(() => patients.patientid, {
      onDelete: "set null",
    }),
    customername: text("customername"),
    customernationalid: text("customernationalid"),
    customerphone: text("customerphone"),

    // Source tracking
    pharmacyorderid: uuid("pharmacyorderid").references(
      () => pharmacyOrders.orderid,
      { onDelete: "set null" }
    ),
    prescriptionid: text("prescriptionid"),
    saletype: text("saletype").notNull().$type<PosSaleType>(),

    // Financial
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
    taxamount: numeric("taxamount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    discountamount: numeric("discountamount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    totalamount: numeric("totalamount", { precision: 12, scale: 2 }).notNull(),
    paidamount: numeric("paidamount", { precision: 12, scale: 2 }).notNull(),
    changeamount: numeric("changeamount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),

    // Status
    status: text("status")
      .notNull()
      .$type<PosSaleStatus>()
      .default("COMPLETED"),

    // Staff & shift
    cashierid: uuid("cashierid")
      .notNull()
      .references(() => users.userid),
    shiftid: uuid("shiftid"),

    // Timestamps
    createdat: timestamp("createdat", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("idx_pos_sales_workspace").on(table.workspaceid),
    dateIdx: index("idx_pos_sales_date").on(table.saledate),
    patientIdx: index("idx_pos_sales_patient").on(table.patientid),
    shiftIdx: index("idx_pos_sales_shift").on(table.shiftid),
    cashierIdx: index("idx_pos_sales_cashier").on(table.cashierid),
    statusIdx: index("idx_pos_sales_status").on(table.status),
  })
);

export type PosSale = typeof posSales.$inferSelect;
export type NewPosSale = typeof posSales.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════
// 2. POS Sale Items (Line items)
// ═══════════════════════════════════════════════════════════════════════════
export const posSaleItems = pgTable(
  "pos_sale_items",
  {
    itemid: uuid("itemid").primaryKey().defaultRandom(),
    saleid: uuid("saleid")
      .notNull()
      .references(() => posSales.saleid, { onDelete: "cascade" }),

    drugid: uuid("drugid")
      .notNull()
      .references(() => drugs.drugid),
    drugname: text("drugname").notNull(),
    batchid: uuid("batchid").references(() => drugBatches.batchid, {
      onDelete: "set null",
    }),
    lotnumber: text("lotnumber"),
    expirydate: date("expirydate"),

    quantity: integer("quantity").notNull(),
    unitprice: numeric("unitprice", { precision: 10, scale: 2 }).notNull(),
    discountpercent: numeric("discountpercent", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    discountamount: numeric("discountamount", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    taxamount: numeric("taxamount", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    totalamount: numeric("totalamount", { precision: 10, scale: 2 }).notNull(),

    // Source link to pharmacy order item (if from dispensed order)
    pharmacyorderitemid: uuid("pharmacyorderitemid").references(
      () => pharmacyOrderItems.itemid,
      { onDelete: "set null" }
    ),

    createdat: timestamp("createdat", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    saleIdx: index("idx_pos_sale_items_sale").on(table.saleid),
    drugIdx: index("idx_pos_sale_items_drug").on(table.drugid),
  })
);

export type PosSaleItem = typeof posSaleItems.$inferSelect;
export type NewPosSaleItem = typeof posSaleItems.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════
// 3. POS Payments (Payment records — supports split/multi-tender)
// ═══════════════════════════════════════════════════════════════════════════
export const posPayments = pgTable(
  "pos_payments",
  {
    paymentid: uuid("paymentid").primaryKey().defaultRandom(),
    saleid: uuid("saleid")
      .notNull()
      .references(() => posSales.saleid, { onDelete: "cascade" }),

    paymentmethod: text("paymentmethod")
      .notNull()
      .$type<PosPaymentMethod>(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),

    // Card payments
    cardtype: text("cardtype"),
    cardlast4: text("cardlast4"),
    cardholder: text("cardholder"),
    transactionid: text("transactionid"),
    authorizationcode: text("authorizationcode"),

    // Insurance
    insurancecompanyid: uuid("insurancecompanyid").references(
      () => insuranceCompanies.insuranceid,
      { onDelete: "set null" }
    ),
    insuranceclaimnumber: text("insuranceclaimnumber"),
    insurancecoverage: numeric("insurancecoverage", {
      precision: 12,
      scale: 2,
    }),
    patientcopay: numeric("patientcopay", { precision: 12, scale: 2 }),
    approvalcode: text("approvalcode"),

    // Credit account
    creditaccountid: uuid("creditaccountid"),
    creditbalancebefore: numeric("creditbalancebefore", {
      precision: 12,
      scale: 2,
    }),
    creditbalanceafter: numeric("creditbalanceafter", {
      precision: 12,
      scale: 2,
    }),

    status: text("status")
      .notNull()
      .$type<PosPaymentStatus>()
      .default("COMPLETED"),

    createdat: timestamp("createdat", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    saleIdx: index("idx_pos_payments_sale").on(table.saleid),
    methodIdx: index("idx_pos_payments_method").on(table.paymentmethod),
  })
);

export type PosPayment = typeof posPayments.$inferSelect;
export type NewPosPayment = typeof posPayments.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════
// 4. POS Shifts (Cashier shift open/close & reconciliation)
// ═══════════════════════════════════════════════════════════════════════════
export const posShifts = pgTable(
  "pos_shifts",
  {
    shiftid: uuid("shiftid").primaryKey().defaultRandom(),
    workspaceid: uuid("workspaceid")
      .notNull()
      .references(() => workspaces.workspaceid, { onDelete: "cascade" }),

    cashierid: uuid("cashierid")
      .notNull()
      .references(() => users.userid),
    shiftnumber: text("shiftnumber").notNull().unique(),

    openingtime: timestamp("openingtime", { withTimezone: true })
      .notNull()
      .defaultNow(),
    closingtime: timestamp("closingtime", { withTimezone: true }),

    openingcash: numeric("openingcash", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    expectedcash: numeric("expectedcash", { precision: 12, scale: 2 }),
    actualcash: numeric("actualcash", { precision: 12, scale: 2 }),
    variance: numeric("variance", { precision: 12, scale: 2 }),
    variancereason: text("variancereason"),

    // Sales summary (auto-calculated on close)
    totalsales: numeric("totalsales", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    totalcashsales: numeric("totalcashsales", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    totalcardsales: numeric("totalcardsales", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    totalinsurancesales: numeric("totalinsurancesales", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalcreditsales: numeric("totalcreditsales", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    transactioncount: integer("transactioncount").notNull().default(0),

    status: text("status")
      .notNull()
      .$type<PosShiftStatus>()
      .default("OPEN"),

    notes: text("notes"),

    createdat: timestamp("createdat", { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedat: timestamp("closedat", { withTimezone: true }),
  },
  (table) => ({
    workspaceIdx: index("idx_pos_shifts_workspace").on(table.workspaceid),
    cashierIdx: index("idx_pos_shifts_cashier").on(table.cashierid),
    statusIdx: index("idx_pos_shifts_status").on(table.status),
  })
);

export type PosShift = typeof posShifts.$inferSelect;
export type NewPosShift = typeof posShifts.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════
// 5. Patient Credit Accounts (credit/tab for regular patients)
// ═══════════════════════════════════════════════════════════════════════════
export const patientCreditAccounts = pgTable(
  "patient_credit_accounts",
  {
    accountid: uuid("accountid").primaryKey().defaultRandom(),
    workspaceid: uuid("workspaceid")
      .notNull()
      .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
    patientid: uuid("patientid")
      .notNull()
      .references(() => patients.patientid),

    creditlimit: numeric("creditlimit", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    currentbalance: numeric("currentbalance", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    availablecredit: numeric("availablecredit", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),

    status: text("status")
      .notNull()
      .$type<CreditAccountStatus>()
      .default("ACTIVE"),

    createdat: timestamp("createdat", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("idx_patient_credit_workspace").on(table.workspaceid),
    patientIdx: index("idx_patient_credit_patient").on(table.patientid),
    uniquePatient: unique("unique_patient_credit").on(
      table.workspaceid,
      table.patientid
    ),
  })
);

export type PatientCreditAccount = typeof patientCreditAccounts.$inferSelect;
export type NewPatientCreditAccount = typeof patientCreditAccounts.$inferInsert;
