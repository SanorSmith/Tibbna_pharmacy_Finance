import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspaces } from "./workspace";

/**
 * Worklists - Groups of samples/orders for batch processing
 * Used to organize work by department, analyzer, or test type
 */
export const worklists = pgTable(
  "worklists",
  {
    worklistid: uuid("worklistid").primaryKey().defaultRandom(),
    worklistname: text("worklistname").notNull(),
    worklisttype: text("worklisttype").notNull(), // 'department', 'analyzer', 'test_type', 'manual'
    department: text("department"), // e.g., 'Hematology', 'Biochemistry', 'Microbiology'
    analyzer: text("analyzer"), // e.g., 'Sysmex XN-1000', 'Cobas 6000'
    priority: text("priority").notNull().default("routine"), // 'stat', 'urgent', 'routine'
    status: text("status").notNull().default("pending"), // 'pending', 'in_progress', 'completed', 'cancelled'
    createdby: uuid("createdby"), // User ID of creator
    createdbyname: text("createdbyname"), // Name of creator
    assignedto: uuid("assignedto"), // User ID of assigned technician
    assignedtoname: text("assignedtoname"), // Name of assigned technician
    description: text("description"),
    createdat: timestamp("createdat").notNull().defaultNow(),
    updatedat: timestamp("updatedat").notNull().defaultNow(),
    completedat: timestamp("completedat"),
    workspaceid: uuid("workspaceid")
      .notNull()
      .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
  },
  (table) => ({
    workspaceIdx: index("worklists_workspace_idx").on(table.workspaceid),
    statusIdx: index("worklists_status_idx").on(table.status),
    departmentIdx: index("worklists_department_idx").on(table.department),
    assignedIdx: index("worklists_assigned_idx").on(table.assignedto),
  })
);

/**
 * Worklist Items - Individual orders/samples in a worklist
 */
export const worklistItems = pgTable(
  "worklist_items",
  {
    worklistitemid: uuid("worklistitemid").primaryKey().defaultRandom(),
    worklistid: uuid("worklistid")
      .notNull()
      .references(() => worklists.worklistid, { onDelete: "cascade" }),
    orderid: text("orderid"), // Reference to lims_orders (nullable for OpenEHR samples)
    sampleid: text("sampleid"), // Reference to accession_samples
    testcode: text("testcode"), // Specific test code if worklist is test-specific
    testname: text("testname"),
    status: text("status").notNull().default("pending"), // 'pending', 'in_progress', 'completed', 'failed'
    position: text("position"), // Position in analyzer rack/tray
    addedby: uuid("addedby").notNull(),
    addedbyname: text("addedbyname"),
    addedat: timestamp("addedat").notNull().defaultNow(),
    startedat: timestamp("startedat"),
    completedat: timestamp("completedat"),
    notes: text("notes"),
  },
  (table) => ({
    worklistIdx: index("worklist_items_worklist_idx").on(table.worklistid),
    orderIdx: index("worklist_items_order_idx").on(table.orderid),
    sampleIdx: index("worklist_items_sample_idx").on(table.sampleid),
    statusIdx: index("worklist_items_status_idx").on(table.status),
  })
);

// Relations
export const worklistsRelations = relations(worklists, ({ many }) => ({
  items: many(worklistItems),
}));

export const worklistItemsRelations = relations(worklistItems, ({ one }) => ({
  worklist: one(worklists, {
    fields: [worklistItems.worklistid],
    references: [worklists.worklistid],
  }),
}));

// Status constants
export const WORKLIST_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const WORKLIST_ITEM_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const WORKLIST_PRIORITY = {
  STAT: "stat",
  URGENT: "urgent",
  ROUTINE: "routine",
} as const;

export const WORKLIST_TYPE = {
  DEPARTMENT: "department",
  ANALYZER: "analyzer",
  TEST_TYPE: "test_type",
  MANUAL: "manual",
} as const;

export type Worklist = typeof worklists.$inferSelect;
export type NewWorklist = typeof worklists.$inferInsert;
export type WorklistItem = typeof worklistItems.$inferSelect;
export type NewWorklistItem = typeof worklistItems.$inferInsert;
