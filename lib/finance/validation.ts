/**
 * Finance Module — Zod Validation Schemas
 *
 * Input validation for all finance API endpoints.
 * Uses Zod v4 (installed in project).
 */
import { z } from "zod";

// ── Account Schemas ──────────────────────────────────────────────

export const CreateAccountSchema = z.object({
  accountcode: z
    .string()
    .min(1, "Account code is required")
    .max(20, "Account code max 20 characters"),
  accountname: z
    .string()
    .min(1, "Account name is required")
    .max(200, "Account name max 200 characters"),
  accounttype: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
  accountsubtype: z
    .enum([
      "CURRENT_ASSET",
      "FIXED_ASSET",
      "ACCUMULATED_DEPRECIATION",
      "CURRENT_LIABILITY",
      "LONG_TERM_LIABILITY",
      "EQUITY_CAPITAL",
      "RETAINED_EARNINGS",
      "DIRECT_REVENUE",
      "OTHER_REVENUE",
      "COGS",
      "OPERATING_EXPENSE",
      "NON_OPERATING",
    ])
    .optional(),
  parentaccountid: z.string().uuid().optional().nullable(),
  isgroupaccount: z.boolean().default(false),
  normalbalance: z.enum(["DEBIT", "CREDIT"]).default("DEBIT"),
  description: z.string().max(500).optional().nullable(),
});

export const UpdateAccountSchema = CreateAccountSchema.partial().extend({
  isactive: z.boolean().optional(),
});

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;

// ── Journal Entry Schemas ────────────────────────────────────────

export const JournalLineSchema = z
  .object({
    accountcode: z.string().min(1, "Account code is required"),
    debit: z.number().min(0, "Debit must be >= 0"),
    credit: z.number().min(0, "Credit must be >= 0"),
    memo: z.string().max(500).optional().nullable(),
  })
  .refine(
    (line) => !(line.debit > 0 && line.credit > 0),
    "Line cannot have both debit and credit > 0"
  )
  .refine(
    (line) => line.debit > 0 || line.credit > 0,
    "Line must have debit or credit > 0"
  );

export const CreateJournalEntrySchema = z
  .object({
    journaldate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
    description: z.string().max(500).optional(),
    lines: z
      .array(JournalLineSchema)
      .min(2, "Journal entry must have at least 2 lines"),
  })
  .refine(
    (data) => {
      const totalDebit = data.lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = data.lines.reduce((sum, l) => sum + l.credit, 0);
      return Math.abs(totalDebit - totalCredit) < 0.01;
    },
    "Journal entry must be balanced (total debit = total credit)"
  );

export type CreateJournalEntryInput = z.infer<
  typeof CreateJournalEntrySchema
>;

// ── Posting Schema ───────────────────────────────────────────────

export const PostingRequestSchema = z
  .object({
    sourcetype: z.enum([
      "PHARMACY_DISPENSE",
      "PHARMACY_INSURANCE_APPLIED",
      "PATIENT_PAYMENT",
      "INSURANCE_PAYMENT",
      "SALE_RETURN",
      "GRN_RECEIPT",
      "SUPPLIER_INVOICE",
      "SUPPLIER_PAYMENT",
      "STOCK_ADJUSTMENT",
      "STOCK_EXPIRED",
      "STOCK_TRANSFER",
      "GENERAL_INVOICE",
      "MANUAL",
      "OPENING_BALANCE",
      "PERIOD_CLOSE",
    ]),
    sourceid: z.string().optional().nullable(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
    description: z.string().max(500).optional(),
    lines: z
      .array(JournalLineSchema)
      .min(2, "At least 2 lines required"),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (data) => {
      const totalDebit = data.lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = data.lines.reduce((sum, l) => sum + l.credit, 0);
      return Math.abs(totalDebit - totalCredit) < 0.01;
    },
    "Posting must be balanced (total debit = total credit)"
  );

export type PostingRequestInput = z.infer<typeof PostingRequestSchema>;

// ── Fiscal Period Schemas ────────────────────────────────────────

export const GeneratePeriodsSchema = z.object({
  year: z
    .number()
    .int()
    .min(2020, "Year must be >= 2020")
    .max(2099, "Year must be <= 2099"),
  type: z.enum(["MONTH"]).default("MONTH"),
});

export type GeneratePeriodsInput = z.infer<typeof GeneratePeriodsSchema>;

// ── AP Schemas ───────────────────────────────────────────────────

export const CreateApInvoiceSchema = z.object({
  vendorid: z.string().uuid(),
  invoicenumber: z.string().min(1).max(50),
  supplierinvoicenumber: z.string().max(50).optional().nullable(),
  invoicedate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  duedate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  grnid: z.string().uuid().optional().nullable(),
  poid: z.string().uuid().optional().nullable(),
  subtotal: z.number().min(0),
  taxamount: z.number().min(0).default(0),
  totalamount: z.number().min(0),
});

export type CreateApInvoiceInput = z.infer<typeof CreateApInvoiceSchema>;

export const CreateApPaymentSchema = z.object({
  vendorid: z.string().uuid(),
  paymentdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  paymentmethod: z.enum(["CASH", "BANK_TRANSFER", "CHECK", "CARD"]),
  bankaccountid: z.string().uuid().optional().nullable(),
  reference: z.string().max(100).optional().nullable(),
  totalamount: z.number().min(0.01, "Amount must be > 0"),
  allocations: z
    .array(
      z.object({
        apinvoiceid: z.string().uuid(),
        amount: z.number().min(0.01),
      })
    )
    .min(1, "At least one allocation required"),
});

export type CreateApPaymentInput = z.infer<typeof CreateApPaymentSchema>;

// ── Bank Account Schemas ─────────────────────────────────────────

export const CreateBankAccountSchema = z.object({
  accountname: z.string().min(1).max(200),
  bankname: z.string().max(200).optional().nullable(),
  accountnumber: z.string().max(50).optional().nullable(),
  accounttype: z.enum(["BANK", "CASH", "PETTY_CASH"]),
  currencycode: z.string().max(3).default("USD"),
  glaccountid: z.string().uuid(),
});

export type CreateBankAccountInput = z.infer<
  typeof CreateBankAccountSchema
>;

// ── Tax Code Schemas ─────────────────────────────────────────────

export const CreateTaxCodeSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  rate: z.number().min(0).max(100),
  taxtype: z.enum(["VAT", "SALES_TAX", "WITHHOLDING", "EXEMPT"]),
  isinclusive: z.boolean().default(false),
  glaccountid: z.string().uuid().optional().nullable(),
  effectivefrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  effectiveto: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional()
    .nullable(),
});

export type CreateTaxCodeInput = z.infer<typeof CreateTaxCodeSchema>;

// ── COA Seed Schema ──────────────────────────────────────────────

export const SeedCOASchema = z.object({
  template: z
    .enum(["healthcare_pharmacy"])
    .default("healthcare_pharmacy"),
});

export type SeedCOAInput = z.infer<typeof SeedCOASchema>;
