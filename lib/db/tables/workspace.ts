import {
  pgTable,
  uuid,
  text,
  timestamp,
  primaryKey,
  foreignKey,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./user";

export type WorkspaceType = "hospital" | "laboratory" | "pharmacy";
export type WorkspaceUserRole =
  | "doctor"
  | "nurse"
  | "lab_technician"
  | "pharmacist"
  | "receptionist"
  | "administrator";

export interface WorkspaceSettings {
  icon?: string;
  [key: string]: unknown; // Allow for future settings
}

export const workspaces = pgTable("workspaces", {
  workspaceid: uuid("workspaceid").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull().$type<WorkspaceType>(),
  description: text("description"),
  settings: jsonb("settings").default("{}").$type<WorkspaceSettings>(),
  createdat: timestamp("createdat").defaultNow().notNull(),
  updatedat: timestamp("updatedat").defaultNow().notNull(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

export const workspaceusers = pgTable(
  "workspaceusers",
  {
    workspaceid: uuid("workspaceid").notNull(),
    userid: uuid("userid").notNull(),
    role: text("role").notNull().$type<WorkspaceUserRole>(),
    createdat: timestamp("createdat").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.workspaceid, table.userid] }),
    workspaceRef: foreignKey({
      columns: [table.workspaceid],
      foreignColumns: [workspaces.workspaceid],
      name: "workspaceuser_workspace_fk",
    }).onDelete("cascade"),
    userRef: foreignKey({
      columns: [table.userid],
      foreignColumns: [users.userid],
      name: "workspaceuser_user_fk",
    }).onDelete("cascade"),
  }),
);

export type WorkspaceUser = typeof workspaceusers.$inferSelect;
export type NewWorkspaceUser = typeof workspaceusers.$inferInsert;

export type UserWorkspace = {
  workspace: Workspace;
  role: WorkspaceUserRole;
};
