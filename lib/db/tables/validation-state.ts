import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { accessionSamples } from "./accession-sample";
import { users } from "./user";

/**
 * Validation State Machine:
 * ANALYZED → TECH_VALIDATED → CLINICALLY_VALIDATED → RELEASED
 *                ↓
 *         RERUN_REQUESTED → back to ANALYZED
 *                ↓
 *            REJECTED
 */
export const validationStates = pgTable(
  "validation_states",
  {
    stateid: uuid("stateid").primaryKey().defaultRandom(),
    sampleid: uuid("sampleid")
      .notNull()
      .references(() => accessionSamples.sampleid, { onDelete: "cascade" })
      .unique(),
    currentstate: text("currentstate").notNull().default("ANALYZED"),
    previousstate: text("previousstate"),
    validatedby: uuid("validatedby").references(() => users.userid),
    validateddate: timestamp("validateddate", { withTimezone: true }),
    releasedby: uuid("releasedby").references(() => users.userid),
    releaseddate: timestamp("releaseddate", { withTimezone: true }),
    rejectedby: uuid("rejectedby").references(() => users.userid),
    rejecteddate: timestamp("rejecteddate", { withTimezone: true }),
    rejectionreason: text("rejectionreason"),
    rerunrequestedby: uuid("rerunrequestedby").references(() => users.userid),
    rerunrequesteddate: timestamp("rerunrequesteddate", { withTimezone: true }),
    rerunreason: text("rerunreason"),
    notes: text("notes"),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sampleidIdx: index("validation_states_sampleid_idx").on(table.sampleid),
    currentstateIdx: index("validation_states_currentstate_idx").on(table.currentstate),
    validateddateIdx: index("validation_states_validateddate_idx").on(table.validateddate),
  })
);

export const validationStatesRelations = relations(validationStates, ({ one }) => ({
  sampleid: one(accessionSamples, {
    fields: [validationStates.sampleid],
    references: [accessionSamples.sampleid],
  }),
  validatedby: one(users, {
    fields: [validationStates.validatedby],
    references: [users.userid],
  }),
  releasedby: one(users, {
    fields: [validationStates.releasedby],
    references: [users.userid],
  }),
  rejectedby: one(users, {
    fields: [validationStates.rejectedby],
    references: [users.userid],
  }),
  rerunrequestedby: one(users, {
    fields: [validationStates.rerunrequestedby],
    references: [users.userid],
  }),
}));

export type ValidationState = typeof validationStates.$inferSelect;
export type NewValidationState = typeof validationStates.$inferInsert;

export const VALIDATION_STATES = {
  ANALYZED: "ANALYZED",
  TECH_VALIDATED: "TECH_VALIDATED",
  CLINICALLY_VALIDATED: "CLINICALLY_VALIDATED",
  RERUN_REQUESTED: "RERUN_REQUESTED",
  REJECTED: "REJECTED",
  RELEASED: "RELEASED",
} as const;

export type ValidationStateType = typeof VALIDATION_STATES[keyof typeof VALIDATION_STATES];
