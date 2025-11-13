/**
 * Staff table (Drizzle ORM)
 * - Workspace-scoped staff with role, name, unit (department) and contacts.
 * - Used by API /api/d/[workspaceid]/staff for GET/POST.
 * - Roles include doctor, nurse, lab_technician, pharmacist, receptionist, administrator.
 */
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";

export type StaffRole =
  | "doctor"
  | "nurse"
  | "lab_technician"
  | "pharmacist"
  | "receptionist"
  | "administrator";

export const staff = pgTable("staff", {
  staffid: uuid("staffid").primaryKey().defaultRandom(),
  workspaceid: uuid("workspaceid")
    .notNull()
    .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  role: text("role").notNull().$type<StaffRole>(),
  firstname: text("firstname").notNull(),
  middlename: text("middlename"),
  lastname: text("lastname").notNull(),
  unit: text("unit"),
  specialty: text("specialty"), // relevant to doctors
  phone: text("phone"),
  email: text("email"),
  createdat: timestamp("createdat").defaultNow().notNull(),
  updatedat: timestamp("updatedat").defaultNow().notNull(),
});

export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;
