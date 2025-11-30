/**
 * Patients table (Drizzle ORM)
 * - Stores patient demographic and contact info, scoped by workspace.
 * - Foreign key: workspaceid -> workspaces.workspaceid (cascade on delete).
 * - EHR linkage: optional `ehrid` stores the EHRbase EHR identifier created for this patient.
 * - Exposes select/insert types for use throughout the app.
 */
import { pgTable, uuid, text, timestamp, jsonb, date, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";

export const patients = pgTable("patients", {
  patientid: uuid("patientid").primaryKey().defaultRandom(),
  workspaceid: uuid("workspaceid")
    .notNull()
    .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  firstname: text("firstname").notNull(),
  middlename: text("middlename"),
  lastname: text("lastname").notNull(),
  nationalid: text("nationalid"),
  dateofbirth: date("dateofbirth"),
  gender: text("gender"),
  bloodgroup: text("bloodgroup"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  ehrid: text("ehrid"),
  medicalhistory: jsonb("medicalhistory").$type<Record<string, unknown>>().default({}),
  createdat: timestamp("createdat").defaultNow(),
  updatedat: timestamp("updatedat").defaultNow(),
}, (table) => {
  return {
    workspaceIdx: index("patients_workspace_idx").on(table.workspaceid),
  };
});

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
