/**
 * Drug Substitution table (Drizzle ORM)
 *
 * Records when a pharmacist substitutes one drug for another
 * (e.g. generic substitution, out-of-stock replacement).
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { pharmacyOrderItems } from "./pharmacy-orders";
import { drugs } from "./pharmacy-drugs";

export const substitutions = pgTable(
  "pharmacy_substitutions",
  {
    substitutionid: uuid("substitutionid").primaryKey().defaultRandom(),
    orderitemid: uuid("orderitemid")
      .notNull()
      .references(() => pharmacyOrderItems.itemid, { onDelete: "cascade" }),
    originaldrugid: uuid("originaldrugid")
      .references(() => drugs.drugid, { onDelete: "set null" }),
    newdrugid: uuid("newdrugid")
      .notNull()
      .references(() => drugs.drugid, { onDelete: "cascade" }),
    reason: text("reason").notNull(), // "generic", "out_of_stock", "allergy", "cost"
    approvedby: uuid("approvedby"), // pharmacist who approved
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderitemIdx: index("pharmacy_substitutions_item_idx").on(table.orderitemid),
  })
);

export type Substitution = typeof substitutions.$inferSelect;
export type NewSubstitution = typeof substitutions.$inferInsert;
