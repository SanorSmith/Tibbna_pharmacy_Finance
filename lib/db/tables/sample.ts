import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { patients } from "./patient";

export const samples = pgTable(
  "samples",
  {
    sampleid: uuid("sampleid").primaryKey().defaultRandom(),
    patientid: uuid("patientid")
      .notNull()
      .references(() => patients.patientid, { onDelete: "cascade" }),
    workspaceid: text("workspaceid").notNull(),
    orderid: text("orderid").notNull(),
    sampletype: text("sampletype").notNull(),
    collectiondate: timestamp("collectiondate", { withTimezone: true }).notNull(),
    receiveddate: timestamp("receiveddate", { withTimezone: true }).notNull(),
    analyzer: text("analyzer"),
    testgroup: text("testgroup").notNull(),
    priority: text("priority").notNull().default("routine"),
    status: text("status").notNull().default("COLLECTED"),
    metadata: jsonb("metadata").default({}),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceidIdx: index("samples_workspaceid_idx").on(table.workspaceid),
    patientidIdx: index("samples_patientid_idx").on(table.patientid),
    statusIdx: index("samples_status_idx").on(table.status),
    testgroupIdx: index("samples_testgroup_idx").on(table.testgroup),
    collectiondateIdx: index("samples_collectiondate_idx").on(table.collectiondate),
  })
);

export const samplesRelations = relations(samples, ({ one }) => ({
  patientid: one(patients, {
    fields: [samples.patientid],
    references: [patients.patientid],
  }),
}));

export type Sample = typeof samples.$inferSelect;
export type NewSample = typeof samples.$inferInsert;
