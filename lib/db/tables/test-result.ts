import { pgTable, text, timestamp, uuid, numeric, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user";
import { accessionSamples } from "./accession-sample";
import { worklists } from "./worklist";

export const testResults = pgTable(
  "test_results",
  {
    resultid: uuid("resultid").primaryKey().defaultRandom(),
    sampleid: uuid("sampleid")
      .notNull()
      .references(() => accessionSamples.sampleid, { onDelete: "cascade" }),
    accessionsampleid: uuid("accessionsampleid")
      .references(() => accessionSamples.sampleid),
    worklistid: uuid("worklistid")
      .references(() => worklists.worklistid),
    testcode: text("testcode").notNull(),
    testname: text("testname").notNull(),
    resultvalue: text("resultvalue").notNull(),
    resultnumeric: numeric("resultnumeric", { precision: 15, scale: 4 }),
    resulttext: text("resulttext"),
    resultcode: text("resultcode"),
    unit: text("unit"),
    referencemin: numeric("referencemin"),
    referencemax: numeric("referencemax"),
    referencerange: text("referencerange"),
    flag: text("flag").notNull().default("normal"),
    isabormal: boolean("isabormal").notNull().default(false),
    iscritical: boolean("iscritical").notNull().default(false),
    interpretation: text("interpretation"),
    previousvalue: text("previousvalue"),
    previousdate: timestamp("previousdate", { withTimezone: true }),
    analyzerresult: text("analyzerresult"),
    
    // Validation workflow
    status: text("status").notNull().default("draft"),
    
    // Entry information
    enteredby: uuid("enteredby").references(() => users.userid),
    entereddate: timestamp("entereddate", { withTimezone: true }),
    entrymethod: text("entrymethod"),
    instrumentid: text("instrumentid"),
    
    // Technical validation
    technicalvalidatedby: uuid("technicalvalidatedby").references(() => users.userid),
    technicalvalidateddate: timestamp("technicalvalidateddate", { withTimezone: true }),
    technicalvalidationcomment: text("technicalvalidationcomment"),
    
    // Medical validation
    medicalvalidatedby: uuid("medicalvalidatedby").references(() => users.userid),
    medicalvalidateddate: timestamp("medicalvalidateddate", { withTimezone: true }),
    medicalvalidationcomment: text("medicalvalidationcomment"),
    
    // Release information
    releasedby: uuid("releasedby").references(() => users.userid),
    releaseddate: timestamp("releaseddate", { withTimezone: true }),
    
    // QC fields
    isqc: boolean("isqc").notNull().default(false),
    qclevel: text("qclevel"),
    qcstatus: text("qcstatus"),
    
    validationcomment: text("validationcomment"),
    markedforrerun: boolean("markedforrerun").notNull().default(false),
    rerunreason: text("rerunreason"),
    isrepeat: boolean("isrepeat").notNull().default(false),
    repeatreason: text("repeatreason"),
    originalresultid: uuid("originalresultid"),
    
    comment: text("comment"),
    techniciannotes: text("techniciannotes"),
    alerts: text("alerts"),
    metadata: jsonb("metadata"),
    
    analyzeddate: timestamp("analyzeddate", { withTimezone: true }).notNull(),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
    createdby: uuid("createdby").references(() => users.userid),
    updatedby: uuid("updatedby").references(() => users.userid),
    workspaceid: text("workspaceid").notNull(),
  },
  (table) => ({
    sampleidIdx: index("test_results_sampleid_idx").on(table.sampleid),
    accessionsampleidIdx: index("test_results_accessionsampleid_idx").on(table.accessionsampleid),
    worklistidIdx: index("test_results_worklistid_idx").on(table.worklistid),
    testcodeIdx: index("test_results_testcode_idx").on(table.testcode),
    statusIdx: index("test_results_status_idx").on(table.status),
    flagIdx: index("test_results_flag_idx").on(table.flag),
    iscriticalIdx: index("test_results_iscritical_idx").on(table.iscritical),
    markedforrerrunIdx: index("test_results_markedforrerun_idx").on(table.markedforrerun),
    workspaceidIdx: index("test_results_workspaceid_idx").on(table.workspaceid),
    entereddateIdx: index("test_results_entereddate_idx").on(table.entereddate),
  })
);

export const resultValidationHistory = pgTable(
  "result_validation_history",
  {
    historyid: uuid("historyid").primaryKey().defaultRandom(),
    resultid: uuid("resultid").notNull().references(() => testResults.resultid, { onDelete: "cascade" }),
    action: text("action").notNull(),
    previousstatus: text("previousstatus"),
    newstatus: text("newstatus").notNull(),
    previousvalue: text("previousvalue"),
    newvalue: text("newvalue"),
    validatedby: uuid("validatedby").notNull().references(() => users.userid),
    validateddate: timestamp("validateddate", { withTimezone: true }).notNull().defaultNow(),
    validationlevel: text("validationlevel"),
    comment: text("comment"),
    rejectionreason: text("rejectionreason"),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    workspaceid: text("workspaceid").notNull(),
  },
  (table) => ({
    resultidIdx: index("result_validation_history_resultid_idx").on(table.resultid),
    validatedbyIdx: index("result_validation_history_validatedby_idx").on(table.validatedby),
    validateddateIdx: index("result_validation_history_validateddate_idx").on(table.validateddate),
  })
);

export const testResultsRelations = relations(testResults, ({ one, many }) => ({
  sample: one(accessionSamples, {
    fields: [testResults.sampleid],
    references: [accessionSamples.sampleid],
  }),
  accessionSample: one(accessionSamples, {
    fields: [testResults.accessionsampleid],
    references: [accessionSamples.sampleid],
  }),
  worklist: one(worklists, {
    fields: [testResults.worklistid],
    references: [worklists.worklistid],
  }),
  enteredByUser: one(users, {
    fields: [testResults.enteredby],
    references: [users.userid],
    relationName: "enteredBy",
  }),
  technicalValidatedByUser: one(users, {
    fields: [testResults.technicalvalidatedby],
    references: [users.userid],
    relationName: "technicalValidatedBy",
  }),
  medicalValidatedByUser: one(users, {
    fields: [testResults.medicalvalidatedby],
    references: [users.userid],
    relationName: "medicalValidatedBy",
  }),
  releasedByUser: one(users, {
    fields: [testResults.releasedby],
    references: [users.userid],
    relationName: "releasedBy",
  }),
  createdByUser: one(users, {
    fields: [testResults.createdby],
    references: [users.userid],
    relationName: "createdBy",
  }),
  updatedByUser: one(users, {
    fields: [testResults.updatedby],
    references: [users.userid],
    relationName: "updatedBy",
  }),
  validationHistory: many(resultValidationHistory),
}));

export const resultValidationHistoryRelations = relations(resultValidationHistory, ({ one }) => ({
  result: one(testResults, {
    fields: [resultValidationHistory.resultid],
    references: [testResults.resultid],
  }),
  validatedByUser: one(users, {
    fields: [resultValidationHistory.validatedby],
    references: [users.userid],
  }),
}));

export type TestResult = typeof testResults.$inferSelect;
export type NewTestResult = typeof testResults.$inferInsert;
export type ResultValidationHistory = typeof resultValidationHistory.$inferSelect;
export type NewResultValidationHistory = typeof resultValidationHistory.$inferInsert;
