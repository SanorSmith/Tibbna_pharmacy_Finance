import { pgTable, uuid, varchar, text, numeric, timestamp, index } from "drizzle-orm/pg-core";

export const testReferenceRanges = pgTable(
  "test_reference_ranges",
  {
    rangeid: uuid("rangeid").defaultRandom().primaryKey(),
    workspaceid: uuid("workspaceid").notNull(),
    testcode: varchar("testcode", { length: 50 }).notNull(),
    testname: varchar("testname", { length: 255 }).notNull(),
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
    
    // Laboratory and specimen information
    labtype: varchar("labtype", { length: 100 }), // Lab type/department
    grouptests: varchar("grouptests", { length: 255 }), // Group tests (panel name)
    sampletype: varchar("sampletype", { length: 100 }), // Sample type (Blood, Urine, etc.)
    containertype: varchar("containertype", { length: 100 }), // Container type (EDTA tube, etc.)
    bodysite: varchar("bodysite", { length: 100 }), // Body site for specimen collection
    
    // Clinical information
    clinicalindication: text("clinicalindication"), // Clinical indication for test
    additionalinformation: text("additionalinformation"), // Additional information
    
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
    ageGroupIdx: index("test_ref_ranges_agegroup_idx").on(table.agegroup),
    activeIdx: index("test_ref_ranges_active_idx").on(table.isactive),
    labtypeIdx: index("test_ref_ranges_labtype_idx").on(table.labtype),
    sampletypeIdx: index("test_ref_ranges_sampletype_idx").on(table.sampletype),
    bodysiteIdx: index("test_ref_ranges_bodysite_idx").on(table.bodysite),
  })
);

export type TestReferenceRange = typeof testReferenceRanges.$inferSelect;
export type NewTestReferenceRange = typeof testReferenceRanges.$inferInsert;
