import { pgTable, uuid, varchar, text, numeric, timestamp, index } from "drizzle-orm/pg-core";

export const testReferenceRanges = pgTable(
  "test_reference_ranges",
  {
    rangeid: uuid("rangeid").defaultRandom().primaryKey(),
    workspaceid: uuid("workspaceid").notNull(),
    testcode: varchar("testcode", { length: 50 }).notNull(),
    testname: varchar("testname", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    unit: varchar("unit", { length: 100 }).notNull(),
    
    // Age group: NEO (0-28 days), PED (1 month - 17 years), ADULT (≥18 years), ALL (All ages)
    agegroup: varchar("agegroup", { length: 20 }).notNull().default("ALL"),
    
    // Sex: M (Male), F (Female), ANY (Both)
    sex: varchar("sex", { length: 10 }).notNull().default("ANY"),
    
    // Reference range
    referencemin: numeric("referencemin", { precision: 10, scale: 4 }),
    referencemax: numeric("referencemax", { precision: 10, scale: 4 }),
    referencetext: text("referencetext"), // For non-numeric ranges like "Negative", "Absent"
    
    // Critical/Panic values
    paniclow: numeric("paniclow", { precision: 10, scale: 4 }),
    panichigh: numeric("panichigh", { precision: 10, scale: 4 }),
    panictext: text("panictext"), // For non-numeric panic values like "Present", "Positive"
    
    // Additional metadata
    notes: text("notes"),
    isactive: varchar("isactive", { length: 1 }).notNull().default("Y"),
    
    // Audit fields
    createdby: uuid("createdby").notNull(),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    updatedby: uuid("updatedby"),
    updatedat: timestamp("updatedat", { withTimezone: true }),
  },
  (table) => ({
    workspaceIdx: index("test_ref_ranges_workspace_idx").on(table.workspaceid),
    testcodeIdx: index("test_ref_ranges_testcode_idx").on(table.testcode),
    categoryIdx: index("test_ref_ranges_category_idx").on(table.category),
    ageGroupIdx: index("test_ref_ranges_agegroup_idx").on(table.agegroup),
    activeIdx: index("test_ref_ranges_active_idx").on(table.isactive),
  })
);

export type TestReferenceRange = typeof testReferenceRanges.$inferSelect;
export type NewTestReferenceRange = typeof testReferenceRanges.$inferInsert;
