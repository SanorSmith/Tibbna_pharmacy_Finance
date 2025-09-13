import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export type UserTheme = "light" | "dark" | "system";
export type UserLanguage = "en" | "sv";
export type UserPermissions = "admin" | "";

export const users = pgTable("users", {
  userid: uuid("userid").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  image: text("image"),
  password: text("password"),
  theme: text("theme").default("system").$type<UserTheme>(),
  language: text("language").default("en").$type<UserLanguage>(),
  permissions: jsonb("permissions").default("[]").$type<UserPermissions[]>(),
  createdat: timestamp("createdat").defaultNow().notNull(),
  updatedat: timestamp("updatedat").defaultNow().notNull(),
});

export const userSessions = pgTable("usersessions", {
  sessionid: uuid("sessionid").primaryKey().defaultRandom(),
  userid: uuid("userid")
    .notNull()
    .references(() => users.userid, { onDelete: "cascade" }),
  sessiontoken: text("sessiontoken").notNull().unique(),
  deviceinfo: text("deviceinfo"),
  ipaddress: text("ipaddress"),
  useragent: text("useragent"),
  createdat: timestamp("createdat").defaultNow().notNull(),
  lastactive: timestamp("lastactive").defaultNow().notNull(),
  expiresat: timestamp("expiresat").notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
export type UserPreferences = {
  theme?: UserTheme;
  language?: UserLanguage;
};
