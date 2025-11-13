/**
 * Department table (Drizzle ORM)
 * - Workspace-scoped departments with unique ID, name, and contact details.
 * - Used for organizing hospital/clinic departments.
 */
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";

export const departments = pgTable("departments", {
  departmentid: uuid("departmentid").primaryKey().defaultRandom(),
  workspaceid: uuid("workspaceid")
    .notNull()
    .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  createdat: timestamp("createdat").defaultNow().notNull(),
  updatedat: timestamp("updatedat").defaultNow().notNull(),
});

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
