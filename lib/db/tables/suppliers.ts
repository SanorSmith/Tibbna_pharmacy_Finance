/**
 * Suppliers Table Schema
 * 
 * Defines suppliers and vendors for laboratory equipment and materials
 * Tracks contact information and supplier relationships
 * 
 * Features:
 * - Supplier identification and classification
 * - Contact information and communication details
 * - Address and location information
 * - Supplier performance and rating tracking
 */

import { pgTable, text, numeric, integer, uuid, index, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user";

export const suppliers = pgTable(
  "suppliers",
  {
    // Primary identifier
    supplierid: uuid("supplierid").primaryKey().defaultRandom(),
    
    // Basic supplier information
    name: text("name").notNull(), // Supplier name
    code: text("code").notNull().unique(), // Supplier code
    description: text("description"), // Detailed description
    
    // Contact information
    phonenumber: text("phonenumber"), // Primary phone number
    phonenumber2: text("phonenumber2"), // Secondary phone number
    email: text("email"), // Primary email address
    email2: text("email2"), // Secondary email address
    website: text("website"), // Website URL
    
    // Address information
    addressline1: text("addressline1"), // Address line 1
    addressline2: text("addressline2"), // Address line 2
    city: text("city"), // City
    state: text("state"), // State/Province
    postalcode: text("postalcode"), // Postal/ZIP code
    country: text("country"), // Country
    
    // Business information
    taxid: text("taxid"), // Tax identification number
    licensenumber: text("licensenumber"), // Business license number
    establishedyear: integer("establishedyear"), // Year established
    
    // Contact person
    contactperson: text("contactperson"), // Primary contact person
    contacttitle: text("contacttitle"), // Contact person's title
    contactphone: text("contactphone"), // Contact person's direct phone
    contactemail: text("contactemail"), // Contact person's email
    
    // Supplier classification
    category: text("category").notNull(), // equipment, materials, reagents, consumables, etc.
    type: text("type").notNull(), // manufacturer, distributor, reseller, service, etc.
    specialization: text("specialization"), // Area of specialization
    
    // Performance and rating
    rating: numeric("rating", { precision: 3, scale: 2 }), // Supplier rating (1-5)
    ispreferred: boolean("ispreferred").default(false), // Preferred supplier
    isactive: boolean("isactive").default(true), // Active supplier
    
    // Payment and terms
    paymentterms: text("paymentterms"), // Payment terms (e.g., "Net 30", "COD")
    creditlimit: numeric("creditlimit", { precision: 12, scale: 2 }), // Credit limit
    currency: text("currency").default("USD"), // Default currency
    
    // Service and support
    supportphone: text("supportphone"), // Customer support phone
    supportemail: text("supportemail"), // Customer support email
    technicalcontact: text("technicalcontact"), // Technical support contact
    
    // Notes and documentation
    notes: text("notes"), // Additional notes
    contracturl: text("contracturl"), // URL to contract document
    catalogurl: text("catalogurl"), // URL to product catalog
    
    // Audit fields
    createdby: uuid("createdby").notNull().references(() => users.userid),
    createdat: text("createdat").notNull(), // ISO string for consistency
    updatedby: uuid("updatedby").references(() => users.userid),
    updatedat: text("updatedat"), // ISO string for consistency
    
    // Workspace for multi-tenancy
    workspaceid: text("workspaceid").notNull(),
  },
  (table) => ({
    workspaceIdx: index("suppliers_workspace_idx").on(table.workspaceid),
    nameIdx: index("suppliers_name_idx").on(table.name),
    categoryIdx: index("suppliers_category_idx").on(table.category),
    emailIdx: index("suppliers_email_idx").on(table.email),
    isActiveIdx: index("suppliers_is_active_idx").on(table.isactive),
    isPreferredIdx: index("suppliers_is_preferred_idx").on(table.ispreferred),
  })
);

// Relations
export const suppliersRelations = relations(suppliers, ({ one }) => ({
  createdByUser: one(users, {
    fields: [suppliers.createdby],
    references: [users.userid],
    relationName: "createdBy",
  }),
  updatedByUser: one(users, {
    fields: [suppliers.updatedby],
    references: [users.userid],
    relationName: "updatedBy",
  }),
}));

// Types for TypeScript
export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
