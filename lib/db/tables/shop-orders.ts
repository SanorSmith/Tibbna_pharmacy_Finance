/**
 * Shop Orders Table Schema
 * 
 * Defines laboratory shop orders for materials and equipment
 * Tracks order details, delivery information, and order status
 * 
 * Features:
 * - Order management and tracking
 * - Delivery address and time tracking
 * - Client information
 * - Order status workflow
 */

import { pgTable, text, numeric, integer, uuid, index, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user";

export const shopOrders = pgTable(
  "shop_orders",
  {
    // Primary identifier
    orderid: uuid("orderid").primaryKey().defaultRandom(),
    
    // Order information
    ordernumber: text("ordernumber").notNull().unique(), // Auto-generated order number
    
    // Delivery information
    deliveryaddress: text("deliveryaddress"), // Delivery address
    deliverytime: timestamp("deliverytime"), // Requested delivery time
    
    // Client information
    clientname: text("clientname"), // Client/requester name
    clientemail: text("clientemail"), // Client email
    clientphone: text("clientphone"), // Client phone
    
    // Order metadata
    orderedby: uuid("orderedby").notNull().references(() => users.userid), // User who created the order
    approvedby: uuid("approvedby").references(() => users.userid), // User who approved the order
    
    // Order status
    status: text("status").notNull().default("draft"), // draft, submitted, approved, ordered, delivered, cancelled
    priority: text("priority").default("normal"), // low, normal, high, urgent
    
    // Dates
    orderdate: timestamp("orderdate"), // Date order was submitted
    approveddate: timestamp("approveddate"), // Date order was approved
    delivereddate: timestamp("delivereddate"), // Date order was delivered
    
    // Financial
    totalcost: numeric("totalcost", { precision: 12, scale: 2 }), // Total order cost
    currency: text("currency").default("USD"),
    
    // Notes
    notes: text("notes"), // Additional notes
    internalNotes: text("internalnotes"), // Internal notes (not visible to client)
    
    // Audit fields
    createdby: uuid("createdby").notNull().references(() => users.userid),
    createdat: text("createdat").notNull(), // ISO string for consistency
    updatedby: uuid("updatedby").references(() => users.userid),
    updatedat: text("updatedat"), // ISO string for consistency
    
    // Workspace for multi-tenancy
    workspaceid: text("workspaceid").notNull(),
  },
  (table) => ({
    workspaceIdx: index("shop_orders_workspace_idx").on(table.workspaceid),
    statusIdx: index("shop_orders_status_idx").on(table.status),
    orderedByIdx: index("shop_orders_ordered_by_idx").on(table.orderedby),
    orderNumberIdx: index("shop_orders_order_number_idx").on(table.ordernumber),
    orderDateIdx: index("shop_orders_order_date_idx").on(table.orderdate),
  })
);

export const shopOrderItems = pgTable(
  "shop_order_items",
  {
    // Primary identifier
    itemid: uuid("itemid").primaryKey().defaultRandom(),
    
    // Order reference
    orderid: uuid("orderid").notNull().references(() => shopOrders.orderid, { onDelete: "cascade" }),
    
    // Item information
    itemname: text("itemname").notNull(), // Item name/description
    itemtype: text("itemtype"), // equipment, material, reagent, consumable
    size: text("size"), // Size/quantity description
    number: integer("number").notNull().default(1), // Quantity/number of items
    
    // Reference to catalog items (optional)
    materialid: uuid("materialid"), // Reference to materials table
    equipmentid: uuid("equipmentid"), // Reference to equipment table
    supplierid: uuid("supplierid"), // Reference to suppliers table
    
    // Pricing
    unitprice: numeric("unitprice", { precision: 10, scale: 2 }), // Price per unit
    totalPrice: numeric("totalprice", { precision: 12, scale: 2 }), // Total price for this line item
    
    // Item notes
    notes: text("notes"), // Item-specific notes
    specifications: text("specifications"), // Item specifications
    
    // Sort order
    sortorder: integer("sortorder").default(0),
    
    // Audit fields
    createdat: text("createdat").notNull(), // ISO string for consistency
    updatedat: text("updatedat"), // ISO string for consistency
  },
  (table) => ({
    orderIdIdx: index("shop_order_items_order_id_idx").on(table.orderid),
    itemTypeIdx: index("shop_order_items_item_type_idx").on(table.itemtype),
  })
);

// Relations
export const shopOrdersRelations = relations(shopOrders, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [shopOrders.createdby],
    references: [users.userid],
    relationName: "createdBy",
  }),
  updatedByUser: one(users, {
    fields: [shopOrders.updatedby],
    references: [users.userid],
    relationName: "updatedBy",
  }),
  orderedByUser: one(users, {
    fields: [shopOrders.orderedby],
    references: [users.userid],
    relationName: "orderedBy",
  }),
  approvedByUser: one(users, {
    fields: [shopOrders.approvedby],
    references: [users.userid],
    relationName: "approvedBy",
  }),
  items: many(shopOrderItems),
}));

export const shopOrderItemsRelations = relations(shopOrderItems, ({ one }) => ({
  order: one(shopOrders, {
    fields: [shopOrderItems.orderid],
    references: [shopOrders.orderid],
  }),
}));

// Types for TypeScript
export type ShopOrder = typeof shopOrders.$inferSelect;
export type NewShopOrder = typeof shopOrders.$inferInsert;
export type ShopOrderItem = typeof shopOrderItems.$inferSelect;
export type NewShopOrderItem = typeof shopOrderItems.$inferInsert;
