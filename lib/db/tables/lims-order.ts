/**
 * LIMS Order Tables Schema
 * 
 * Implements the Test Request & Order Entry module for LIMS
 * Following healthcare standards: openEHR, HL7 FHIR ServiceRequest
 * 
 * Key Features:
 * - Support for both clinical and research orders
 * - Multi-test orders with test catalog validation
 * - Role-based access control
 * - Full audit trail
 * - openEHR composition integration
 * - FHIR ServiceRequest compatibility
 */

import { pgTable, text, timestamp, uuid, index, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user";

// Order Status Enum
export const ORDER_STATUS = {
  REQUESTED: "REQUESTED",
  ACCEPTED: "ACCEPTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
} as const;

export type OrderStatusType = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

// Order Priority Enum
export const ORDER_PRIORITY = {
  ROUTINE: "ROUTINE",
  URGENT: "URGENT",
  STAT: "STAT",
  ASAP: "ASAP",
} as const;

export type OrderPriorityType = typeof ORDER_PRIORITY[keyof typeof ORDER_PRIORITY];

// Subject Type Enum
export const SUBJECT_TYPE = {
  PATIENT: "patient",
  RESEARCH_SUBJECT: "research_subject",
} as const;

export type SubjectTypeType = typeof SUBJECT_TYPE[keyof typeof SUBJECT_TYPE];

/**
 * Main LIMS Orders Table
 * Stores test orders from clinicians, researchers, or external systems
 */
export const limsOrders = pgTable(
  "lims_orders",
  {
    // Primary identifier
    orderid: uuid("orderid").primaryKey().defaultRandom(),
    
    // Subject information
    subjecttype: text("subjecttype").notNull(), // patient | research_subject
    subjectidentifier: text("subjectidentifier").notNull(), // Patient ID or Research Subject ID
    
    // Clinical context
    encounterid: text("encounterid"), // For clinical orders
    studyprotocolid: text("studyprotocolid"), // For research orders
    
    // Order metadata
    priority: text("priority").notNull().default("ROUTINE"), // ROUTINE | URGENT | STAT | ASAP
    status: text("status").notNull().default("REQUESTED"),
    
    // Ordering provider
    orderingproviderid: uuid("orderingproviderid").notNull().references(() => users.userid),
    orderingprovidername: text("orderingprovidername"),
    
    // Source system
    sourcesystem: text("sourcesystem").notNull().default("LIMS_UI"), // LIMS_UI | HIS | EHR | API
    
    // Clinical information
    clinicalindication: text("clinicalindication"),
    clinicalnotes: text("clinicalnotes"),
    
    // STAT justification (required for STAT orders)
    statjustification: text("statjustification"),
    
    // openEHR integration
    ehrid: text("ehrid"), // openEHR EHR ID
    compositionuid: text("compositionuid"), // openEHR composition UID
    openehrrequestid: text("openehrrequestid"), // openEHR request id (e.g., testreq-...)
    timecommitted: timestamp("timecommitted", { withTimezone: true }),
    
    // FHIR integration
    fhirservicerequestid: text("fhirservicerequestid"), // FHIR ServiceRequest ID
    
    // Sample collection requirements
    sampletype: text("sample_type"),
    containertype: text("container_type"),
    volume: text("volume"),
    volumeunit: text("volume_unit").default("mL"),
    samplerecommendations: jsonb("sample_recommendations"),
    
    // Workspace for multi-tenancy
    workspaceid: text("workspaceid").notNull(),
    
    // Timestamps
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
    
    // Cancellation/Rejection
    cancelledat: timestamp("cancelledat", { withTimezone: true }),
    cancelledby: uuid("cancelledby").references(() => users.userid),
    cancellationreason: text("cancellationreason"),
  },
  (table) => ({
    workspaceIdx: index("lims_orders_workspace_idx").on(table.workspaceid),
    statusIdx: index("lims_orders_status_idx").on(table.status),
    subjectIdx: index("lims_orders_subject_idx").on(table.subjectidentifier),
    providerIdx: index("lims_orders_provider_idx").on(table.orderingproviderid),
    createdIdx: index("lims_orders_created_idx").on(table.createdat),
  })
);

/**
 * Lab Test Catalog Table
 * Master catalog of available laboratory tests
 */
export const labTestCatalog = pgTable(
  "lab_test_catalog",
  {
    testid: uuid("testid").primaryKey().defaultRandom(),
    
    // Test identification
    testcode: text("testcode").notNull().unique(), // LOINC or internal code
    testname: text("testname").notNull(),
    testdescription: text("testdescription"),
    
    // Test categorization
    testcategory: text("testcategory").notNull(), // Hematology, Biochemistry, Microbiology, etc.
    testpanel: text("testpanel"), // Panel name if part of a panel
    
    // LOINC mapping
    loinccode: text("loinccode"),
    loincname: text("loincname"),
    
    // SNOMED CT mapping
    snomedcode: text("snomedcode"),
    snomedname: text("snomedname"),
    
    // Specimen requirements
    specimentype: text("specimentype").notNull(), // Blood, Urine, etc.
    specimenvolume: text("specimenvolume"),
    specimencontainer: text("specimencontainer"),
    
    // Test parameters
    turnaroundtime: text("turnaroundtime"), // Expected TAT in hours
    fastingrequired: boolean("fastingrequired").default(false),
    
    // Availability
    isactive: boolean("isactive").notNull().default(true),
    
    // Workspace
    workspaceid: text("workspaceid").notNull(),
    
    // Timestamps
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: index("lab_test_catalog_code_idx").on(table.testcode),
    categoryIdx: index("lab_test_catalog_category_idx").on(table.testcategory),
    activeIdx: index("lab_test_catalog_active_idx").on(table.isactive),
    workspaceIdx: index("lab_test_catalog_workspace_idx").on(table.workspaceid),
  })
);

/**
 * Order Tests Junction Table
 * Links orders to requested tests (many-to-many)
 */
export const limsOrderTests = pgTable(
  "lims_order_tests",
  {
    ordertestid: uuid("ordertestid").primaryKey().defaultRandom(),
    
    // References
    orderid: uuid("orderid").notNull().references(() => limsOrders.orderid, { onDelete: "cascade" }),
    testid: uuid("testid").references(() => labTestCatalog.testid), // Nullable to support testReferenceRanges
    
    // Test identification (for tests from testReferenceRanges)
    testcode: text("testcode"), // Test code when testid is null
    testname: text("testname"), // Test name when testid is null
    
    // Test-specific details
    teststatus: text("teststatus").notNull().default("REQUESTED"), // REQUESTED, IN_PROGRESS, COMPLETED, CANCELLED
    
    // Specimen information for this specific test
    specimenid: uuid("specimenid"), // Link to accession sample if collected
    
    // Results
    resultvalue: text("resultvalue"),
    resultunit: text("resultunit"),
    resultstatus: text("resultstatus"), // PRELIMINARY, FINAL, CORRECTED
    resultedby: uuid("resultedby").references(() => users.userid),
    resultedat: timestamp("resultedat", { withTimezone: true }),
    
    // Timestamps
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderIdx: index("lims_order_tests_order_idx").on(table.orderid),
    testIdx: index("lims_order_tests_test_idx").on(table.testid),
    statusIdx: index("lims_order_tests_status_idx").on(table.teststatus),
  })
);

/**
 * Study Protocols Table
 * For research orders
 */
export const studyProtocols = pgTable(
  "study_protocols",
  {
    protocolid: uuid("protocolid").primaryKey().defaultRandom(),
    
    // Protocol information
    protocolnumber: text("protocolnumber").notNull().unique(),
    protocolname: text("protocolname").notNull(),
    protocoldescription: text("protocoldescription"),
    
    // Principal investigator
    principalinvestigatorid: uuid("principalinvestigatorid").references(() => users.userid),
    principalinvestigatorname: text("principalinvestigatorname"),
    
    // IRB/Ethics
    irbapprovaldate: timestamp("irbapprovaldate", { withTimezone: true }),
    irbapprovalnumber: text("irbapprovalnumber"),
    
    // Status
    isactive: boolean("isactive").notNull().default(true),
    
    // Workspace
    workspaceid: text("workspaceid").notNull(),
    
    // Timestamps
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    numberIdx: index("study_protocols_number_idx").on(table.protocolnumber),
    activeIdx: index("study_protocols_active_idx").on(table.isactive),
    workspaceIdx: index("study_protocols_workspace_idx").on(table.workspaceid),
  })
);

// Relations
export const limsOrdersRelations = relations(limsOrders, ({ one, many }) => ({
  orderingProvider: one(users, {
    fields: [limsOrders.orderingproviderid],
    references: [users.userid],
    relationName: "orderingProvider",
  }),
  cancelledByUser: one(users, {
    fields: [limsOrders.cancelledby],
    references: [users.userid],
    relationName: "cancelledBy",
  }),
  orderTests: many(limsOrderTests),
}));

export const labTestCatalogRelations = relations(labTestCatalog, ({ many }) => ({
  orderTests: many(limsOrderTests),
}));

export const limsOrderTestsRelations = relations(limsOrderTests, ({ one }) => ({
  order: one(limsOrders, {
    fields: [limsOrderTests.orderid],
    references: [limsOrders.orderid],
  }),
  test: one(labTestCatalog, {
    fields: [limsOrderTests.testid],
    references: [labTestCatalog.testid],
  }),
  resultedByUser: one(users, {
    fields: [limsOrderTests.resultedby],
    references: [users.userid],
  }),
}));

export const studyProtocolsRelations = relations(studyProtocols, ({ one }) => ({
  principalInvestigator: one(users, {
    fields: [studyProtocols.principalinvestigatorid],
    references: [users.userid],
  }),
}));

// Type exports
export type LimsOrder = typeof limsOrders.$inferSelect;
export type NewLimsOrder = typeof limsOrders.$inferInsert;
export type LabTestCatalog = typeof labTestCatalog.$inferSelect;
export type NewLabTestCatalog = typeof labTestCatalog.$inferInsert;
export type LimsOrderTest = typeof limsOrderTests.$inferSelect;
export type NewLimsOrderTest = typeof limsOrderTests.$inferInsert;
export type StudyProtocol = typeof studyProtocols.$inferSelect;
export type NewStudyProtocol = typeof studyProtocols.$inferInsert;
