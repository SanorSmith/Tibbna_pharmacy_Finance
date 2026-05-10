import { pgTable, uuid, varchar, text, timestamp, index, jsonb } from "drizzle-orm/pg-core";

export const testReferenceAuditLog = pgTable(
  "test_reference_audit_log",
  {
    logid: uuid("logid").defaultRandom().primaryKey(),
    rangeid: uuid("rangeid").notNull(),
    workspaceid: uuid("workspaceid").notNull(),
    
    // What changed
    action: varchar("action", { length: 20 }).notNull(), // CREATE, UPDATE, DELETE
    
    // Who changed it
    userid: uuid("userid").notNull(),
    username: varchar("username", { length: 255 }),
    
    // Why it was changed
    reason: text("reason"),
    
    // What was changed (stores field-level diffs for UPDATE, full snapshot for CREATE/DELETE)
    changes: jsonb("changes"), // { field: { old: "...", new: "..." }, ... }
    snapshot: jsonb("snapshot"), // Full record snapshot at time of change
    
    // When
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    rangeidIdx: index("test_ref_audit_rangeid_idx").on(table.rangeid),
    workspaceIdx: index("test_ref_audit_workspace_idx").on(table.workspaceid),
    actionIdx: index("test_ref_audit_action_idx").on(table.action),
    createdatIdx: index("test_ref_audit_createdat_idx").on(table.createdat),
  })
);

export type TestReferenceAuditLog = typeof testReferenceAuditLog.$inferSelect;
export type NewTestReferenceAuditLog = typeof testReferenceAuditLog.$inferInsert;
