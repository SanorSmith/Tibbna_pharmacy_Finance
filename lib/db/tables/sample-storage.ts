/**
 * Sample Storage Table Schema
 * 
 * Tracks finished samples moved to storage locations with retention periods
 * Manages sample lifecycle from storage to disposal/retrieval
 * 
 * Features:
 * - Storage date and expiry tracking
 * - Configurable retention periods (default 3 days)
 * - Links to storage locations and samples
 * - Retrieval and disposal tracking
 */

import { pgTable, text, timestamp, integer, uuid, index, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user";
import { accessionSamples } from "./accession-sample";
import { storageLocations } from "./storage-locations";

export const sampleStorage = pgTable(
  "sample_storage",
  {
    // Primary identifier
    storageid: uuid("storageid").primaryKey().defaultRandom(),
    
    // Sample reference
    sampleid: uuid("sampleid")
      .notNull()
      .references(() => accessionSamples.sampleid, { onDelete: "cascade" }),
    
    // Storage location reference
    locationid: uuid("locationid")
      .notNull()
      .references(() => storageLocations.locationid),
    
    // Storage dates
    storagedate: timestamp("storagedate", { withTimezone: true }).notNull().defaultNow(),
    expirydate: timestamp("expirydate", { withTimezone: true }).notNull(), // Calculated from retention period
    
    // Retention period in days (default 3)
    retentiondays: integer("retentiondays").notNull().default(3),
    
    // Storage status
    status: text("status").notNull().default("stored"), // stored, retrieved, expired, disposed
    
    // Retrieval information
    retrieveddate: timestamp("retrieveddate", { withTimezone: true }),
    retrievedby: uuid("retrievedby").references(() => users.userid),
    retrievalreason: text("retrievalreason"),
    
    // Disposal information
    disposeddate: timestamp("disposeddate", { withTimezone: true }),
    disposedby: uuid("disposedby").references(() => users.userid),
    disposalmethod: text("disposalmethod"), // autoclave, incineration, chemical, etc.
    disposalnotes: text("disposalnotes"),
    
    // Notes
    storagenotes: text("storagenotes"),
    
    // Audit fields
    storedby: uuid("storedby").notNull().references(() => users.userid),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
    
    // Workspace for multi-tenancy
    workspaceid: text("workspaceid").notNull(),
  },
  (table) => ({
    workspaceIdx: index("sample_storage_workspace_idx").on(table.workspaceid),
    sampleIdx: index("sample_storage_sample_idx").on(table.sampleid),
    locationIdx: index("sample_storage_location_idx").on(table.locationid),
    statusIdx: index("sample_storage_status_idx").on(table.status),
    expiryIdx: index("sample_storage_expiry_idx").on(table.expirydate),
    storageDateIdx: index("sample_storage_date_idx").on(table.storagedate),
  })
);

// Relations
export const sampleStorageRelations = relations(sampleStorage, ({ one }) => ({
  sample: one(accessionSamples, {
    fields: [sampleStorage.sampleid],
    references: [accessionSamples.sampleid],
  }),
  location: one(storageLocations, {
    fields: [sampleStorage.locationid],
    references: [storageLocations.locationid],
  }),
  storedByUser: one(users, {
    fields: [sampleStorage.storedby],
    references: [users.userid],
    relationName: "storedBy",
  }),
  retrievedByUser: one(users, {
    fields: [sampleStorage.retrievedby],
    references: [users.userid],
    relationName: "retrievedBy",
  }),
  disposedByUser: one(users, {
    fields: [sampleStorage.disposedby],
    references: [users.userid],
    relationName: "disposedBy",
  }),
}));

// Types for TypeScript
export type SampleStorage = typeof sampleStorage.$inferSelect;
export type NewSampleStorage = typeof sampleStorage.$inferInsert;
