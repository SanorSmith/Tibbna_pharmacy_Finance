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
  varchar,
  timestamp,
  numeric,
  boolean,
  index,
  date,
} from "drizzle-orm/pg-core";
import { patients } from "./patient";

// ── Insurance companies ───────────────────────────────────────────────
// NOTE: this maps to the EXISTING "insurance_companies" table — the master
// list of insurance providers maintained by Finance (company_id,
// company_name, coverage_percentage, active, plus EDI fields like
// api_endpoint/edi_payer_id used by other systems). We do NOT rename, remove,
// or repurpose any of those columns. We only ADD one new column
// ("insuranceid uuid", via migration) so the pharmacy module's
// patient_insurance / pharmacy_invoices tables (which already had an
// "insuranceid uuid" column) can reference a row here. The pharmacy fields
// alias onto the existing Finance-managed columns:
//   name             -> company_name
//   code             -> company_code
//   phone            -> contact_phone
//   email            -> contact_email
//   coveragepercent  -> coverage_percentage
//   isactive         -> active
export const insuranceCompanies = pgTable("insurance_companies", {
  insuranceid: uuid("insuranceid").notNull().unique().defaultRandom(),
  name: varchar("company_name", { length: 255 }).notNull(),
  code: varchar("company_code", { length: 20 }),
  phone: varchar("contact_phone", { length: 50 }),
  email: varchar("contact_email", { length: 255 }),
  address: text("address"),
  coveragepercent: numeric("coverage_percentage", { precision: 5, scale: 2 }).default("80.00"),
  isactive: boolean("active").default(true),
  createdat: timestamp("createdat", { mode: "string" }).defaultNow(),
  updatedat: timestamp("updatedat", { mode: "string" }).defaultNow(),
});

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
