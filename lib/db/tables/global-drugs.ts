/**
 * Global Drug Catalog Schema (Phase 2 Hybrid Model)
 * 
 * This table contains standardized drug information shared across all workspaces.
 * Each workspace can then select which drugs they stock in their local inventory.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

// ── Global Drug Catalog ───────────────────────────────────────────────
export const globalDrugs = pgTable(
  "global_drugs",
  {
    drugid: uuid("drugid").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    genericname: text("genericname"),
    atccode: text("atccode"),
    form: text("form").notNull(), // tablet, capsule, syrup, injection …
    strength: text("strength").notNull(), // e.g. "500 mg", "10 mg/ml"
    unit: text("unit").notNull().default("tablet"), // tablet, ml, vial …
    nationalcode: text("nationalcode"), // NDL code
    category: text("category"), // Therapeutic category
    description: text("description"), // Full description
    interaction: text("interaction"), // Drug interaction groups
    warning: text("warning"), // General warnings
    pregnancy: text("pregnancy"), // Pregnancy category
    sideeffect: text("sideeffect"), // Common side effects
    storagetype: text("storagetype"), // Storage requirements
    indication: text("indication"), // Therapeutic indications
    traffic: text("traffic"), // Traffic classification
    requiresprescription: boolean("requiresprescription").notNull().default(true),
    // Global metadata
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    // Tracking
    isactive: boolean("isactive").notNull().default(true),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Search indexes
    nameIdx: index("global_drugs_name_idx").on(table.name),
    genericNameIdx: index("global_drugs_generic_name_idx").on(table.genericname),
    atcIdx: index("global_drugs_atc_idx").on(table.atccode),
    nationalCodeIdx: index("global_drugs_national_code_idx").on(table.nationalcode),
    categoryIdx: index("global_drugs_category_idx").on(table.category),
  })
);

export type GlobalDrug = typeof globalDrugs.$inferSelect;
export type NewGlobalDrug = typeof globalDrugs.$inferInsert;
