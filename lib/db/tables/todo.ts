import { pgTable, uuid, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { users } from "./user";
import { workspaces } from "./workspace";

export const todos = pgTable("todos", {
  todoid: uuid("todoid").primaryKey().defaultRandom(),
  workspaceid: uuid("workspaceid")
    .notNull()
    .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  userid: uuid("userid")
    .notNull()
    .references(() => users.userid, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  completed: boolean("completed").notNull().default(false),
  priority: text("priority").notNull().default("medium"), // low, medium, high
  duedate: timestamp("duedate", { withTimezone: true }),
  createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    workspaceIdx: index("todos_workspace_idx").on(table.workspaceid),
    userIdx: index("todos_user_idx").on(table.userid),
  };
});
