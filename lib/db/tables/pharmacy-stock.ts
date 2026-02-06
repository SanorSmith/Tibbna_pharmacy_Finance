/**
 * Pharmacy Stock Management tables (Drizzle ORM)
 *
 * - stock_locations: physical storage locations (shelf, fridge, etc.)
 * - stock_levels: current quantity per drug-batch at a location
 * - stock_movements: audit trail of every qty change (receive, dispense, adjust, transfer)
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { drugs, drugBatches } from "./pharmacy-drugs";

// ── Stock locations ───────────────────────────────────────────────────
export const stockLocations = pgTable(
  "pharmacy_stock_locations",
  {
    locationid: uuid("locationid").primaryKey().defaultRandom(),
    workspaceid: uuid("workspaceid")
      .notNull()
      .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g. "Shelf A-1", "Fridge 2"
    type: text("type").notNull().default("shelf"), // shelf, fridge, vault, etc.
    description: text("description"),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("pharmacy_stock_locations_ws_idx").on(table.workspaceid),
  })
);

export type StockLocation = typeof stockLocations.$inferSelect;
export type NewStockLocation = typeof stockLocations.$inferInsert;

// ── Stock levels (current inventory snapshot) ─────────────────────────
export const stockLevels = pgTable(
  "pharmacy_stock_levels",
  {
    stocklevelid: uuid("stocklevelid").primaryKey().defaultRandom(),
    drugid: uuid("drugid")
      .notNull()
      .references(() => drugs.drugid, { onDelete: "cascade" }),
    batchid: uuid("batchid")
      .references(() => drugBatches.batchid, { onDelete: "set null" }),
    locationid: uuid("locationid")
      .notNull()
      .references(() => stockLocations.locationid, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0),
    updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    drugIdx: index("pharmacy_stock_levels_drug_idx").on(table.drugid),
    locationIdx: index("pharmacy_stock_levels_loc_idx").on(table.locationid),
  })
);

export type StockLevel = typeof stockLevels.$inferSelect;
export type NewStockLevel = typeof stockLevels.$inferInsert;

// ── Stock movements (audit log) ───────────────────────────────────────
export const STOCK_MOVEMENT_TYPES = {
  RECEIVE: "RECEIVE",
  DISPENSE: "DISPENSE",
  ADJUST: "ADJUST",
  TRANSFER: "TRANSFER",
  RETURN: "RETURN",
  EXPIRED: "EXPIRED",
} as const;

export type StockMovementType =
  (typeof STOCK_MOVEMENT_TYPES)[keyof typeof STOCK_MOVEMENT_TYPES];

export const stockMovements = pgTable(
  "pharmacy_stock_movements",
  {
    movementid: uuid("movementid").primaryKey().defaultRandom(),
    drugid: uuid("drugid")
      .notNull()
      .references(() => drugs.drugid, { onDelete: "cascade" }),
    batchid: uuid("batchid")
      .references(() => drugBatches.batchid, { onDelete: "set null" }),
    locationid: uuid("locationid")
      .notNull()
      .references(() => stockLocations.locationid, { onDelete: "cascade" }),
    type: text("type").notNull().$type<StockMovementType>(),
    quantity: integer("quantity").notNull(), // +receive / -dispense
    reason: text("reason"),
    referenceid: text("referenceid"), // links to order or invoice
    performedby: uuid("performedby"),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    drugIdx: index("pharmacy_stock_movements_drug_idx").on(table.drugid),
    typeIdx: index("pharmacy_stock_movements_type_idx").on(table.type),
  })
);

export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;
