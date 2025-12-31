import { pgTable, text, timestamp, uuid, numeric, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { samples } from "./sample";

export const testResults = pgTable(
  "test_results",
  {
    resultid: uuid("resultid").primaryKey().defaultRandom(),
    sampleid: uuid("sampleid")
      .notNull()
      .references(() => samples.sampleid, { onDelete: "cascade" }),
    testcode: text("testcode").notNull(),
    testname: text("testname").notNull(),
    resultvalue: text("resultvalue").notNull(),
    unit: text("unit"),
    referencemin: numeric("referencemin"),
    referencemax: numeric("referencemax"),
    referencerange: text("referencerange"),
    flag: text("flag").notNull().default("normal"),
    iscritical: boolean("iscritical").notNull().default(false),
    previousvalue: text("previousvalue"),
    previousdate: timestamp("previousdate", { withTimezone: true }),
    analyzerresult: text("analyzerresult"),
    validationcomment: text("validationcomment"),
    markedforrerun: boolean("markedforrerun").notNull().default(false),
    rerunreason: text("rerunreason"),
    analyzeddate: timestamp("analyzeddate", { withTimezone: true }).notNull(),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sampleidIdx: index("test_results_sampleid_idx").on(table.sampleid),
    flagIdx: index("test_results_flag_idx").on(table.flag),
    iscriticalIdx: index("test_results_iscritical_idx").on(table.iscritical),
    markedforrerrunIdx: index("test_results_markedforrerun_idx").on(table.markedforrerun),
  })
);

export const testResultsRelations = relations(testResults, ({ one }) => ({
  sampleid: one(samples, {
    fields: [testResults.sampleid],
    references: [samples.sampleid],
  }),
}));

export type TestResult = typeof testResults.$inferSelect;
export type NewTestResult = typeof testResults.$inferInsert;
