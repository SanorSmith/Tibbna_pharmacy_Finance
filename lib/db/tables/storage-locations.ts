/**
 * Storage Locations Table Schema
 * 
 * Defines physical storage locations in the laboratory
 * Supports hierarchical storage organization (building → room → freezer → rack → position)
 * 
 * Features:
 * - Hierarchical location structure
 * - Location type classification (refrigerator, freezer, room temp, etc.)
 * - Capacity tracking and monitoring
 * - Temperature requirements
 * - Access control and permissions
 */

import { pgTable, text, numeric, integer, uuid, index, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user";

export const storageLocations = pgTable(
  "storage_locations",
  {
    // Primary identifier
    locationid: uuid("locationid").primaryKey().defaultRandom(),
    
    // Basic location information
    name: text("name").notNull(), // e.g., "Main Lab Freezer -80°C"
    code: text("code").notNull().unique(), // e.g., "FREEZER_MAIN_80"
    description: text("description"), // Detailed description
    
    // Location type and classification
    type: text("type").notNull(), // refrigerator, freezer_minus_80, freezer_minus_20, room_temp, incubator, rack, shelf
    category: text("category").notNull(), // storage, processing, quarantine, disposal
    
    // Hierarchical location structure
    building: text("building"), // Building name/number
    room: text("room"), // Room number/name
    equipment: text("equipment"), // Equipment identifier (freezer, refrigerator model)
    section: text("section"), // Section within equipment
    position: text("position"), // Specific position (rack, shelf, slot)
    
    // Capacity and monitoring
    capacity: integer("capacity"), // Maximum sample capacity
    currentcount: integer("currentcount").default(0), // Current sample count
    availableslots: integer("availableslots"), // Available slots calculation
    
    // Environmental requirements
    temperaturemin: numeric("temperaturemin", { precision: 5, scale: 2 }), // Minimum temperature
    temperaturemax: numeric("temperaturemax", { precision: 5, scale: 2 }), // Maximum temperature
    humiditymin: numeric("humiditymin", { precision: 5, scale: 2 }), // Minimum humidity
    humiditymax: numeric("humiditymax", { precision: 5, scale: 2 }), // Maximum humidity
    
    // Access control
    restrictedaccess: boolean("restrictedaccess").default(false), // Requires special access
    accessrequirements: text("accessrequirements"), // Special access requirements
    
    // Status and availability
    status: text("status").notNull().default("active"), // active, inactive, maintenance, decommissioned
    isavailable: boolean("isavailable").default(true), // Available for new samples
    
    // Organization
    sortorder: integer("sortorder").default(0), // Display order
    parentlocationid: uuid("parentlocationid"), // Parent location for hierarchy
    
    // Audit fields
    createdby: uuid("createdby").notNull().references(() => users.userid),
    createdat: text("createdat").notNull(), // ISO string for consistency
    updatedby: uuid("updatedby").references(() => users.userid),
    updatedat: text("updatedat"), // ISO string for consistency
    
    // Workspace for multi-tenancy
    workspaceid: text("workspaceid").notNull(),
  },
  (table) => ({
    workspaceIdx: index("storage_locations_workspace_idx").on(table.workspaceid),
    typeIdx: index("storage_locations_type_idx").on(table.type),
    statusIdx: index("storage_locations_status_idx").on(table.status),
    codeIdx: index("storage_locations_code_idx").on(table.code),
    parentIdx: index("storage_locations_parent_idx").on(table.parentlocationid),
  })
);

// Relations
export const storageLocationsRelations = relations(storageLocations, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [storageLocations.createdby],
    references: [users.userid],
    relationName: "createdBy",
  }),
  updatedByUser: one(users, {
    fields: [storageLocations.updatedby],
    references: [users.userid],
    relationName: "updatedBy",
  }),
  parentLocation: one(storageLocations, {
    fields: [storageLocations.parentlocationid],
    references: [storageLocations.locationid],
    relationName: "parentLocation",
  }),
  childLocations: many(storageLocations),
}));

// Types for TypeScript
export type StorageLocation = typeof storageLocations.$inferSelect;
export type NewStorageLocation = typeof storageLocations.$inferInsert;
