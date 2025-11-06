/**
 * Appointments table (Drizzle ORM)
 * - Workspace-scoped appointments linking patients to a doctor (user).
 * - Used by the doctor's schedule view and side panel status lists.
 */
import { pgTable, uuid, text, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { patients } from "./patient";
import { users } from "./user";

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "scheduled",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
]);

export const appointments = pgTable("appointments", {
  appointmentid: uuid("appointmentid").primaryKey().defaultRandom(),
  workspaceid: uuid("workspaceid")
    .notNull()
    .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  patientid: uuid("patientid")
    .notNull()
    .references(() => patients.patientid, { onDelete: "cascade" }),
  doctorid: uuid("doctorid")
    .notNull()
    .references(() => users.userid, { onDelete: "cascade" }),
  starttime: timestamp("starttime", { withTimezone: true }).notNull(),
  endtime: timestamp("endtime", { withTimezone: true }).notNull(),
  location: text("location"),
  status: appointmentStatusEnum("status").notNull().default("scheduled"),
  notes: jsonb("notes").$type<Record<string, unknown>>().default({}),
  createdat: timestamp("createdat").defaultNow(),
  updatedat: timestamp("updatedat").defaultNow(),
});

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
