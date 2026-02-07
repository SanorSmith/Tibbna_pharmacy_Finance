/**
 * Insurance & Patient Insurance tables (Drizzle ORM)
 *
 * - insurance_companies: master list of insurance providers
 * - patient_insurance: links patients to their insurance plans
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  boolean,
  index,
  date,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspace";
import { patients } from "./patient";

// ── Insurance companies ───────────────────────────────────────────────
export const insuranceCompanies = pgTable(
  "insurance_companies",
  {
    insuranceid: uuid("insuranceid").primaryKey().defaultRandom(),
    workspaceid: uuid("workspaceid")
      .notNull()
      .references(() => workspaces.workspaceid, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code"), // short code e.g. "BCBS"
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    coveragepercent: numeric("coveragepercent", { precision: 5, scale: 2 })
      .notNull()
      .default("80.00"), // default 80% coverage
    isactive: boolean("isactive").notNull().default(true),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
    updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("insurance_companies_ws_idx").on(table.workspaceid),
  })
);

export type InsuranceCompany = typeof insuranceCompanies.$inferSelect;
export type NewInsuranceCompany = typeof insuranceCompanies.$inferInsert;

// ── Patient insurance links ───────────────────────────────────────────
export const patientInsurance = pgTable(
  "patient_insurance",
  {
    patientinsuranceid: uuid("patientinsuranceid").primaryKey().defaultRandom(),
    patientid: uuid("patientid")
      .notNull()
      .references(() => patients.patientid, { onDelete: "cascade" }),
    insuranceid: uuid("insuranceid")
      .notNull()
      .references(() => insuranceCompanies.insuranceid, { onDelete: "cascade" }),
    policynumber: text("policynumber").notNull(),
    groupnumber: text("groupnumber"),
    startdate: date("startdate"),
    enddate: date("enddate"),
    isprimary: boolean("isprimary").notNull().default(true),
    isactive: boolean("isactive").notNull().default(true),
    createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    patientIdx: index("patient_insurance_patient_idx").on(table.patientid),
    insuranceIdx: index("patient_insurance_ins_idx").on(table.insuranceid),
  })
);

export type PatientInsurance = typeof patientInsurance.$inferSelect;
export type NewPatientInsurance = typeof patientInsurance.$inferInsert;
