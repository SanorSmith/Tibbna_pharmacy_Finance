/**
 * Materials Table Schema
 * 
 * Defines laboratory materials, reagents, and consumables
 * Tracks inventory levels, lot tracking, and expiry dates
 * 
 * Features:
 * - Material identification and classification
 * - Lot and batch tracking
 * - Supplier and cost information
 * - Storage location and expiry management
 */

import { pgTable, text, numeric, integer, uuid, index, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user";
import { suppliers } from "./suppliers";

export const materials = pgTable(
  "materials",
  {
    // Primary identifier
    materialid: uuid("materialid").primaryKey().defaultRandom(),
    
    // Material identification
    name: text("name").notNull(), // Material name
    code: text("code").notNull().unique(), // Material code
    description: text("description"), // Detailed description
    
    // Lot and batch tracking
    lotnumber: text("lotnumber").notNull(), // Lot number
    batchnumber: text("batchnumber"), // Batch number
    manufacturedate: timestamp("manufacturedate"), // Manufacture date
    expirydate: timestamp("expirydate"), // Expiry date
    
    // Supplier information
    supplierid: uuid("supplierid").references(() => suppliers.supplierid), // Reference to supplier
    suppliername: text("suppliername").notNull(), // Supplier name (denormalized for quick access)
    suppliernumber: text("suppliernumber"), // Supplier catalog number
    
    // Physical properties
    size: text("size"), // Size description (e.g., "100ml", "50g", "10 units")
    unit: text("unit").notNull(), // Unit of measure (ml, g, units, etc.)
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(), // Current quantity
    minquantity: numeric("minquantity", { precision: 10, scale: 2 }), // Minimum reorder quantity
    maxquantity: numeric("maxquantity", { precision: 10, scale: 2 }), // Maximum stock quantity
    
    // Storage information
    storage: text("storage").notNull(), // Storage requirements (e.g., "2-8°C", "Room temp", "-20°C")
    storagelocation: text("storagelocation"), // Specific storage location
    storageconditions: text("storageconditions"), // Detailed storage conditions
    
    // Cost information
    price: numeric("price", { precision: 10, scale: 2 }), // Unit price
    totalcost: numeric("totalcost", { precision: 12, scale: 2 }), // Total cost
    currency: text("currency").default("USD"), // Currency code
    
    // Material classification
    category: text("category").notNull(), // reagent, consumable, chemical, biological, etc.
    type: text("type").notNull(), // liquid, solid, powder, equipment, etc.
    hazardlevel: text("hazardlevel"), // low, medium, high
    casnumber: text("casnumber"), // CAS number for chemicals
    
    // Quality and testing
    qualitygrade: text("qualitygrade"), // Grade (e.g., "ACS", "HPLC", "Technical")
    certificatenumber: text("certificatenumber"), // Certificate of analysis number
    testrequired: boolean("testrequired").default(false), // Requires quality testing
    
    // Status and availability
    status: text("status").notNull().default("active"), // active, expired, quarantine, discontinued
    isavailable: boolean("isavailable").default(true), // Available for use
    
    // Notes and documentation
    notes: text("notes"), // Additional notes
    msdsurl: text("msdsurl"), // URL to MSDS/SDS
    specifications: text("specifications"), // Material specifications
    
    // Audit fields
    createdby: uuid("createdby").notNull().references(() => users.userid),
    createdat: text("createdat").notNull(), // ISO string for consistency
    updatedby: uuid("updatedby").references(() => users.userid),
    updatedat: text("updatedat"), // ISO string for consistency
    
    // Workspace for multi-tenancy
    workspaceid: text("workspaceid").notNull(),
  },
  (table) => ({
    workspaceIdx: index("materials_workspace_idx").on(table.workspaceid),
    nameIdx: index("materials_name_idx").on(table.name),
    supplierIdx: index("materials_supplier_idx").on(table.supplierid),
    categoryIdx: index("materials_category_idx").on(table.category),
    lotNumberIdx: index("materials_lot_number_idx").on(table.lotnumber),
    expiryDateIdx: index("materials_expiry_date_idx").on(table.expirydate),
    statusIdx: index("materials_status_idx").on(table.status),
  })
);

// Relations
export const materialsRelations = relations(materials, ({ one }) => ({
  createdByUser: one(users, {
    fields: [materials.createdby],
    references: [users.userid],
    relationName: "createdBy",
  }),
  updatedByUser: one(users, {
    fields: [materials.updatedby],
    references: [users.userid],
    relationName: "updatedBy",
  }),
  supplier: one(suppliers, {
    fields: [materials.supplierid],
    references: [suppliers.supplierid],
    relationName: "supplier",
  }),
}));

// Types for TypeScript
export type Material = typeof materials.$inferSelect;
export type NewMaterial = typeof materials.$inferInsert;
