/**
 * Accession Sample Table Schema
 * 
 * Core table for sample registration (accessioning) in LIMS
 * Represents physical samples received in the laboratory
 * 
 * Key Features:
 * - Immutable accessioning data after creation (controlled corrections only)
 * - Full traceability from receipt
 * - Links to orders and patients/subjects
 * - Barcode and QR code support
 * - openEHR composition integration
 * 
 * Data Separation:
 * - LIMS operational data (status, location, workflow) stored here
 * - Clinical record data stored in openEHR compositions
 */

import { pgTable, text, timestamp, numeric, uuid, index, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user";
import { limsOrders } from "./lims-order";

export const accessionSamples = pgTable(
  "accession_samples",
  {
    // Primary identifier
    sampleid: uuid("sampleid").primaryKey().defaultRandom(),
    
    // Human-readable sample ID (e.g., SMP-2025-0001)
    samplenumber: text("samplenumber").notNull().unique(),

    // Scanned / manually entered accession number (unique when present)
    accessionnumber: text("accessionnumber"),
    
    // Sample metadata
    sampletype: text("sampletype").notNull(), // blood, tissue, urine, etc.
    containertype: text("containertype"), // vacutainer, jar, tube, etc. (optional — not all workflows capture this)
    volume: numeric("volume", { precision: 10, scale: 2 }), // numeric value
    volumeunit: text("volumeunit"), // mL, L, etc.
    
    // Collection information
    collectiondate: timestamp("collectiondate", { withTimezone: true }).notNull(),
    collectorid: text("collectorid"), // Person or organization who collected
    collectorname: text("collectorname"),
    
    // Links to other entities
    orderid: uuid("orderid").references(() => limsOrders.orderid), // Reference to local LIMS order (nullable for OpenEHR orders)
    openehrrequestid: text("openehrrequestid"), // OpenEHR request ID for orders from openEHR (e.g., testreq-xxx)
    patientid: text("patientid"), // Reference to patient
    ehrid: text("ehrid"), // openEHR EHR ID
    subjectidentifier: text("subjectidentifier"), // Alternative subject identifier
    
    // Barcode and QR code data
    barcode: text("barcode").notNull().unique(),
    qrcode: text("qrcode").notNull(), // QR code payload (JSON or URL)
    
    // openEHR integration
    openehrcompositionuid: text("openehrcompositionuid"), // openEHR composition UID
    
    // Ordered tests (stored as JSON array for OpenEHR orders)
    tests: jsonb("tests"), // e.g., ["CBC", "HGB", "WBC"]

    // Lab category / department (e.g., 'Hematology', 'Biochemistry')
    labcategory: text("labcategory"),
    
    // Current status
    currentstatus: text("currentstatus").notNull().default("RECEIVED"), // RECEIVED, IN_STORAGE, IN_PROCESS, etc.
    currentlocation: text("currentlocation"), // Physical location in lab
    
    // Audit fields
    accessionedby: uuid("accessionedby").notNull().references(() => users.userid),
    accessionedat: timestamp("accessionedat", { withTimezone: true }).notNull().defaultNow(),
    
    // Workspace for multi-tenancy
    workspaceid: text("workspaceid").notNull(),
    
    // Timestamps
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
    
    // Correction tracking (for controlled modifications)
    correctedat: timestamp("correctedat", { withTimezone: true }),
    correctedby: uuid("correctedby").references(() => users.userid),
    correctionreason: text("correctionreason"),
  },
  (table) => ({
    workspaceIdx: index("accession_samples_workspace_idx").on(table.workspaceid),
    statusIdx: index("accession_samples_status_idx").on(table.currentstatus),
    orderIdx: index("accession_samples_order_idx").on(table.orderid),
    patientIdx: index("accession_samples_patient_idx").on(table.patientid),
    barcodeIdx: index("accession_samples_barcode_idx").on(table.barcode),
  })
);

// Relations
export const accessionSamplesRelations = relations(accessionSamples, ({ one, many }) => ({
  order: one(limsOrders, {
    fields: [accessionSamples.orderid],
    references: [limsOrders.orderid],
  }),
  accessionedByUser: one(users, {
    fields: [accessionSamples.accessionedby],
    references: [users.userid],
    relationName: "accessionedBy",
  }),
  correctedByUser: one(users, {
    fields: [accessionSamples.correctedby],
    references: [users.userid],
    relationName: "correctedBy",
  }),
  statusHistory: many(sampleStatusHistory),
  auditLogs: many(sampleAccessionAuditLog),
}));

// Sample Status History Table
export const sampleStatusHistory = pgTable(
  "sample_status_history",
  {
    historyid: uuid("historyid").primaryKey().defaultRandom(),
    sampleid: uuid("sampleid").notNull().references(() => accessionSamples.sampleid),
    
    // Status change
    previousstatus: text("previousstatus"),
    newstatus: text("newstatus").notNull(),
    
    // Location change
    previouslocation: text("previouslocation"),
    newlocation: text("newlocation"),
    
    // Change metadata
    changedby: uuid("changedby").notNull().references(() => users.userid),
    changedat: timestamp("changedat", { withTimezone: true }).notNull().defaultNow(),
    changereason: text("changereason"),
    metadata: text("metadata"), // JSON for additional context
  },
  (table) => ({
    sampleIdx: index("sample_status_history_sample_idx").on(table.sampleid),
    statusIdx: index("sample_status_history_status_idx").on(table.newstatus),
  })
);

export const sampleStatusHistoryRelations = relations(sampleStatusHistory, ({ one }) => ({
  sample: one(accessionSamples, {
    fields: [sampleStatusHistory.sampleid],
    references: [accessionSamples.sampleid],
  }),
  changedByUser: one(users, {
    fields: [sampleStatusHistory.changedby],
    references: [users.userid],
  }),
}));

// Sample Accession Audit Log
export const sampleAccessionAuditLog = pgTable(
  "sample_accession_audit_log",
  {
    auditid: uuid("auditid").primaryKey().defaultRandom(),
    sampleid: uuid("sampleid").notNull().references(() => accessionSamples.sampleid),
    
    // Action details
    action: text("action").notNull(), // SAMPLE_ACCESSIONED, STATUS_CHANGED, CORRECTED, etc.
    userid: uuid("userid").notNull().references(() => users.userid),
    userrole: text("userrole"),
    
    // Change details
    previousdata: text("previousdata"), // JSON snapshot before change
    newdata: text("newdata"), // JSON snapshot after change
    
    // Context
    reason: text("reason"),
    metadata: text("metadata"), // JSON for additional context
    
    // Timestamp
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    
    // IP and session tracking
    ipaddress: text("ipaddress"),
    sessionid: text("sessionid"),
  },
  (table) => ({
    sampleIdx: index("sample_accession_audit_sample_idx").on(table.sampleid),
    actionIdx: index("sample_accession_audit_action_idx").on(table.action),
    userIdx: index("sample_accession_audit_user_idx").on(table.userid),
    timestampIdx: index("sample_accession_audit_timestamp_idx").on(table.createdat),
  })
);

export const sampleAccessionAuditLogRelations = relations(sampleAccessionAuditLog, ({ one }) => ({
  sample: one(accessionSamples, {
    fields: [sampleAccessionAuditLog.sampleid],
    references: [accessionSamples.sampleid],
  }),
  user: one(users, {
    fields: [sampleAccessionAuditLog.userid],
    references: [users.userid],
  }),
}));

// Type exports
export type AccessionSample = typeof accessionSamples.$inferSelect;
export type NewAccessionSample = typeof accessionSamples.$inferInsert;
export type SampleStatusHistory = typeof sampleStatusHistory.$inferSelect;
export type NewSampleStatusHistory = typeof sampleStatusHistory.$inferInsert;
export type SampleAccessionAuditLog = typeof sampleAccessionAuditLog.$inferSelect;
export type NewSampleAccessionAuditLog = typeof sampleAccessionAuditLog.$inferInsert;

// Sample status constants
export const SAMPLE_STATUS = {
  RECEIVED: "RECEIVED",
  IN_STORAGE: "IN_STORAGE",
  IN_PROCESS: "IN_PROCESS",
  ANALYZED: "ANALYZED",
  DISPOSED: "DISPOSED",
  REJECTED: "REJECTED",
} as const;

export type SampleStatusType = typeof SAMPLE_STATUS[keyof typeof SAMPLE_STATUS];

// Audit action constants
export const ACCESSION_AUDIT_ACTIONS = {
  SAMPLE_ACCESSIONED: "SAMPLE_ACCESSIONED",
  STATUS_CHANGED: "STATUS_CHANGED",
  LOCATION_CHANGED: "LOCATION_CHANGED",
  CORRECTED: "CORRECTED",
  BARCODE_PRINTED: "BARCODE_PRINTED",
  QR_SCANNED: "QR_SCANNED",
} as const;

export type AccessionAuditActionType = typeof ACCESSION_AUDIT_ACTIONS[keyof typeof ACCESSION_AUDIT_ACTIONS];
