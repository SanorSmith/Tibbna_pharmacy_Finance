/**
 * Database Schema: Drug Interaction Logs
 * Tracks all interaction checks and pharmacist decisions
 */

import { pgTable, uuid, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";

export const drugInteractionLogs = pgTable("drug_interaction_logs", {
  logid: uuid("logid").primaryKey().defaultRandom(),
  workspaceid: uuid("workspaceid").notNull(),
  patientid: uuid("patientid"), // Optional - if checking for specific patient
  orderid: uuid("orderid"), // Optional - if part of order dispensing
  
  // Drugs involved
  drugs: jsonb("drugs").notNull(), // Array of {name, genericName}
  
  // Interactions found
  interactions: jsonb("interactions").notNull(), // Array of interaction objects
  interactionCount: text("interaction_count").notNull(), // "0", "1", "2+", etc.
  highestSeverity: text("highest_severity"), // "critical", "major", "moderate", "minor", null
  
  // Pharmacist decision
  pharmacistId: uuid("pharmacist_id").notNull(),
  pharmacistName: text("pharmacist_name").notNull(),
  decision: text("decision").notNull(), // "proceeded", "cancelled", "no_interactions"
  justification: text("justification"), // Required if proceeded with interactions
  acknowledgedRisk: boolean("acknowledged_risk").default(false),
  
  // Metadata
  checkedAt: timestamp("checked_at").notNull().defaultNow(),
  dispensedAt: timestamp("dispensed_at"), // When actually dispensed (if proceeded)
  
  // Audit
  createdat: timestamp("createdat").notNull().defaultNow(),
});

export const patientMedications = pgTable("patient_medications", {
  medicationid: uuid("medicationid").primaryKey().defaultRandom(),
  workspaceid: uuid("workspaceid").notNull(),
  patientid: uuid("patientid").notNull(),
  
  // Drug information
  drugid: uuid("drugid"),
  drugname: text("drugname").notNull(),
  genericname: text("genericname"),
  strength: text("strength"),
  form: text("form"),
  
  // Prescription details
  prescribedBy: text("prescribed_by"),
  prescribedDate: timestamp("prescribed_date"),
  dosage: text("dosage"),
  frequency: text("frequency"),
  route: text("route"),
  
  // Status
  status: text("status").notNull().default("active"), // "active", "discontinued", "completed"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  discontinuedReason: text("discontinued_reason"),
  
  // Audit
  createdat: timestamp("createdat").notNull().defaultNow(),
  updatedat: timestamp("updatedat").notNull().defaultNow(),
  createdby: uuid("createdby"),
});

export const patientAllergies = pgTable("patient_allergies", {
  allergyid: uuid("allergyid").primaryKey().defaultRandom(),
  workspaceid: uuid("workspaceid").notNull(),
  patientid: uuid("patientid").notNull(),
  
  // Allergy information
  allergen: text("allergen").notNull(), // Drug name or substance
  allergenType: text("allergen_type").notNull(), // "drug", "food", "environmental"
  reaction: text("reaction").notNull(), // Description of reaction
  severity: text("severity").notNull(), // "mild", "moderate", "severe", "life-threatening"
  
  // Details
  onsetDate: timestamp("onset_date"),
  notes: text("notes"),
  verifiedBy: text("verified_by"),
  
  // Status
  status: text("status").notNull().default("active"), // "active", "resolved", "unverified"
  
  // Audit
  createdat: timestamp("createdat").notNull().defaultNow(),
  updatedat: timestamp("updatedat").notNull().defaultNow(),
  createdby: uuid("createdby"),
});
