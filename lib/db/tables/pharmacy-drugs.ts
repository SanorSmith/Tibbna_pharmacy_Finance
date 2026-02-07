/**
 * Pharmacy Drug Catalog & Batch tables (Drizzle ORM)
 *
 * - drugs: master drug catalog (name, ATC code, form, strength, barcode, etc.)
 * - drug_batches: individual batches with lot number, expiry, and purchase price
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  boolean,
  index,
  date,
  jsonb,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";

// ── Drug master catalog ───────────────────────────────────────────────
export const drugs = pgTable(
  "drugs",
  {
    drugid: uuid("drugid").primaryKey().defaultRandom(),
    workspaceid: uuid("workspaceid")
      .notNull()
      .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
    name: text("name").notNull(),
    genericname: text("genericname"),
    atccode: text("atccode"),
    form: text("form").notNull(), // tablet, capsule, syrup, injection …
    strength: text("strength").notNull(), // e.g. "500 mg", "10 mg/ml"
    unit: text("unit").notNull().default("tablet"), // tablet, ml, vial …
    barcode: text("barcode"),
    manufacturer: text("manufacturer"),
    nationalcode: text("nationalcode"),
    category: text("category"),
    description: text("description"),
    interaction: text("interaction"),
    warning: text("warning"),
    pregnancy: text("pregnancy"),
    sideeffect: text("sideeffect"),
    storagetype: text("storagetype"),
    indication: text("indication"),
    traffic: text("traffic"),
    notes: text("notes"),
    insuranceapproved: boolean("insuranceapproved").default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    requiresprescription: boolean("requiresprescription").notNull().default(true),
    isactive: boolean("isactive").notNull().default(true),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("drugs_workspace_idx").on(table.workspaceid),
    barcodeIdx: index("drugs_barcode_idx").on(table.barcode),
    atcIdx: index("drugs_atc_idx").on(table.atccode),
  })
);

export type Drug = typeof drugs.$inferSelect;
export type NewDrug = typeof drugs.$inferInsert;

// ── Drug batches (lot tracking) ───────────────────────────────────────
export const drugBatches = pgTable(
  "drug_batches",
  {
    batchid: uuid("batchid").primaryKey().defaultRandom(),
    drugid: uuid("drugid")
      .notNull()
      .references(() => drugs.drugid, { onDelete: "cascade" }),
    lotnumber: text("lotnumber").notNull(),
    expirydate: date("expirydate").notNull(),
    purchaseprice: numeric("purchaseprice", { precision: 12, scale: 2 }),
    sellingprice: numeric("sellingprice", { precision: 12, scale: 2 }),
    barcode: text("barcode"), // batch-specific barcode if different
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    drugIdx: index("drug_batches_drug_idx").on(table.drugid),
    expiryIdx: index("drug_batches_expiry_idx").on(table.expirydate),
  })
);

export type DrugBatch = typeof drugBatches.$inferSelect;
export type NewDrugBatch = typeof drugBatches.$inferInsert;
