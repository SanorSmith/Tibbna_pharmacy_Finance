import { pgTable, text, timestamp, uuid, numeric, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user";
import { equipment } from "./equipment";

export const qcRuns = pgTable(
  "qc_runs",
  {
    qcid: uuid("qcid").primaryKey().defaultRandom(),

    // What kind of run this is
    qctype: text("qctype").notNull(), // QC | CALIBRATION

    // Instrument / analyzer
    equipmentid: uuid("equipmentid").references(() => equipment.equipmentid),
    equipmentname: text("equipmentname"),

    // QC metadata
    qclevel: text("qclevel"), // L1/L2/L3
    lotnumber: text("lotnumber"),

    // Measurement
    analyte: text("analyte"),
    resultvalue: numeric("resultvalue", { precision: 15, scale: 4 }),
    unit: text("unit"),
    expectedmin: numeric("expectedmin", { precision: 15, scale: 4 }),
    expectedmax: numeric("expectedmax", { precision: 15, scale: 4 }),
    pass: boolean("pass").notNull().default(true),

    // Operator notes
    notes: text("notes"),

    // When performed
    runat: timestamp("runat", { withTimezone: true }).notNull().defaultNow(),

    // Audit
    performedby: uuid("performedby").references(() => users.userid),
    performedbyname: text("performedbyname"),
    workspaceid: text("workspaceid").notNull(),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("qc_runs_workspace_idx").on(table.workspaceid),
    equipmentIdx: index("qc_runs_equipment_idx").on(table.equipmentid),
    typeIdx: index("qc_runs_type_idx").on(table.qctype),
    runatIdx: index("qc_runs_runat_idx").on(table.runat),
  })
);

export const qcRunsRelations = relations(qcRuns, ({ one }) => ({
  performedByUser: one(users, {
    fields: [qcRuns.performedby],
    references: [users.userid],
  }),
  equipment: one(equipment, {
    fields: [qcRuns.equipmentid],
    references: [equipment.equipmentid],
  }),
}));

export type QcRun = typeof qcRuns.$inferSelect;
export type NewQcRun = typeof qcRuns.$inferInsert;
