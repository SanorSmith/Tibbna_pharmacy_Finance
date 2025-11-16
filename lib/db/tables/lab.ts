/**
 * Lab table (Drizzle ORM)
 * - Workspace-scoped labs with unique ID, name, and contact details.
 * - Used for organizing laboratory facilities.
 */
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";

export const labs = pgTable("labs", {
  labid: uuid("labid").primaryKey().defaultRandom(),
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

export type Lab = typeof labs.$inferSelect;
export type NewLab = typeof labs.$inferInsert;
