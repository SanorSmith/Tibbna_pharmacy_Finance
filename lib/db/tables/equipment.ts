/**
 * Equipment Table Schema
 * 
 * Defines laboratory equipment and instruments
 * Tracks equipment details, maintenance schedules, and service history
 * 
 * Features:
 * - Equipment identification and classification
 * - Maintenance scheduling and tracking
 * - Vendor and warranty information
 * - Service history and calibration records
 */

import { pgTable, text, numeric, integer, uuid, index, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user";

export const equipment = pgTable(
  "equipment",
  {
    // Primary identifier
    equipmentid: uuid("equipmentid").primaryKey().defaultRandom(),
    
    // Equipment identification
    model: text("model").notNull(), // Equipment model name
    equipmentidcode: text("equipmentidcode").notNull().unique(), // Equipment ID code
    serialnumber: text("serialnumber").notNull().unique(), // Serial number
    
    // Vendor information
    vendor: text("vendor").notNull(), // Vendor/manufacturer name
    vendoremail: text("vendoremail"), // Vendor contact email
    vendorphone: text("vendorphone"), // Vendor contact phone
    
    // Maintenance and service
    lastservicedate: timestamp("lastservicedate"), // Last service date
    nextservicedate: timestamp("nextservicedate"), // Next service due date
    serviceinterval: integer("serviceinterval"), // Service interval in days
    warrantyexpiry: timestamp("warrantyexpiry"), // Warranty expiry date
    
    // Equipment details
    category: text("category").notNull(), // centrifuge, microscope, incubator, analyzer, etc.
    type: text("type").notNull(), // benchtop, floor, portable, etc.
    status: text("status").notNull().default("active"), // active, inactive, maintenance, decommissioned
    location: text("location"), // Current location within lab
    
    // Calibration and performance
    calibrationdate: timestamp("calibrationdate"), // Last calibration date
    nextcalibrationdate: timestamp("nextcalibrationdate"), // Next calibration due
    calibrationinterval: integer("calibrationinterval"), // Calibration interval in days
    
    // Cost and value
    purchaseprice: numeric("purchaseprice", { precision: 10, scale: 2 }), // Purchase price
    currentvalue: numeric("currentvalue", { precision: 10, scale: 2 }), // Current depreciated value
    
    // Notes and documentation
    notes: text("notes"), // Additional notes
    manualurl: text("manualurl"), // URL to equipment manual
    specifications: text("specifications"), // Equipment specifications
    
    // Audit fields
    createdby: uuid("createdby").notNull().references(() => users.userid),
    createdat: text("createdat").notNull(), // ISO string for consistency
    updatedby: uuid("updatedby").references(() => users.userid),
    updatedat: text("updatedat"), // ISO string for consistency
    
    // Workspace for multi-tenancy
    workspaceid: text("workspaceid").notNull(),
  },
  (table) => ({
    workspaceIdx: index("equipment_workspace_idx").on(table.workspaceid),
    modelIdx: index("equipment_model_idx").on(table.model),
    vendorIdx: index("equipment_vendor_idx").on(table.vendor),
    statusIdx: index("equipment_status_idx").on(table.status),
    serialNumberIdx: index("equipment_serial_number_idx").on(table.serialnumber),
    equipmentIdCodeIdx: index("equipment_id_code_idx").on(table.equipmentidcode),
  })
);

// Relations
export const equipmentRelations = relations(equipment, ({ one }) => ({
  createdByUser: one(users, {
    fields: [equipment.createdby],
    references: [users.userid],
    relationName: "createdBy",
  }),
  updatedByUser: one(users, {
    fields: [equipment.updatedby],
    references: [users.userid],
    relationName: "updatedBy",
  }),
}));

// Types for TypeScript
export type Equipment = typeof equipment.$inferSelect;
export type NewEquipment = typeof equipment.$inferInsert;
