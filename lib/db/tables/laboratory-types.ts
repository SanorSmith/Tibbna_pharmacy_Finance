/**
 * Laboratory Types Table Schema
 * 
 * Defines laboratory types and specializations
 * Used for categorizing different laboratory departments
 * 
 * Features:
 * - Laboratory type classification
 * - Specialization tracking
 * - Hierarchical organization
 */

import { pgTable, text, uuid, index, boolean, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user";

export const laboratoryTypes = pgTable(
  "laboratory_types",
  {
    // Primary identifier
    typeid: uuid("typeid").primaryKey().defaultRandom(),
    
    // Laboratory type information
    name: text("name").notNull(), // Type name (e.g., "Immunology & Serology")
    code: text("code").notNull().unique(), // Type code
    description: text("description"), // Detailed description
    
    // Classification
    category: text("category").notNull(), // clinical, research, reference, etc.
    specialization: text("specialization"), // Specific specialization
    
    // Organization
    parenttypeid: uuid("parenttypeid"), // Parent type for hierarchy
    sortorder: integer("sortorder").default(0), // Display order
    
    // Status
    isactive: boolean("isactive").default(true), // Active type
    
    // Audit fields
    createdby: uuid("createdby").notNull().references(() => users.userid),
    createdat: text("createdat").notNull(), // ISO string for consistency
    updatedby: uuid("updatedby").references(() => users.userid),
    updatedat: text("updatedat"), // ISO string for consistency
    
    // Workspace for multi-tenancy
    workspaceid: text("workspaceid").notNull(),
  },
  (table) => ({
    workspaceIdx: index("laboratory_types_workspace_idx").on(table.workspaceid),
    nameIdx: index("laboratory_types_name_idx").on(table.name),
    categoryIdx: index("laboratory_types_category_idx").on(table.category),
    isActiveIdx: index("laboratory_types_is_active_idx").on(table.isactive),
  })
);

// Relations
export const laboratoryTypesRelations = relations(laboratoryTypes, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [laboratoryTypes.createdby],
    references: [users.userid],
    relationName: "createdBy",
  }),
  updatedByUser: one(users, {
    fields: [laboratoryTypes.updatedby],
    references: [users.userid],
    relationName: "updatedBy",
  }),
  parentType: one(laboratoryTypes, {
    fields: [laboratoryTypes.parenttypeid],
    references: [laboratoryTypes.typeid],
    relationName: "parentType",
  }),
  childTypes: many(laboratoryTypes),
}));

// Types for TypeScript
export type LaboratoryType = typeof laboratoryTypes.$inferSelect;
export type NewLaboratoryType = typeof laboratoryTypes.$inferInsert;
