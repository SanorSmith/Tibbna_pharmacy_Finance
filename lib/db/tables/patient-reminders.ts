import { pgTable, uuid, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";

export const patientReminders = pgTable("patient_reminders", {
  reminderid:  uuid("reminderid").primaryKey().defaultRandom(),
  workspaceid: uuid("workspaceid")
    .notNull()
    .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  patientid:   text("patientid"),
  patientname: text("patientname"),
  title:       text("title").notNull(),
  description: text("description"),
  reminderdate: timestamp("reminderdate", { withTimezone: true }),
  completed:   boolean("completed").notNull().default(false),
  isread:      boolean("isread").notNull().default(false), // notification "read" status, separate from completed
  priority:    text("priority").notNull().default("medium"), // low | medium | high
  createdby:   text("createdby"),
  createdat:   timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  updatedat:   timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  workspaceIdx: index("patient_reminders_workspace_idx").on(table.workspaceid),
  patientIdx:   index("patient_reminders_patient_idx").on(table.patientid),
}));
