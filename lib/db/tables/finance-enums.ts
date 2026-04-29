/**
 * Finance Module — Enums & Constants
 *
 * All finance-specific status types, category types, and constant objects.
 * Follows existing codebase pattern: const objects + inferred types.
 */

// ── Account Types ──────────────────────────────────────────────
export const FIN_ACCOUNT_TYPE = {
  ASSET: "ASSET",
  LIABILITY: "LIABILITY",
  EQUITY: "EQUITY",
  REVENUE: "REVENUE",
  EXPENSE: "EXPENSE",
} as const;
export type FinAccountType =
  (typeof FIN_ACCOUNT_TYPE)[keyof typeof FIN_ACCOUNT_TYPE];

// ── Account Sub-types ──────────────────────────────────────────
export const FIN_ACCOUNT_SUBTYPE = {
  CURRENT_ASSET: "CURRENT_ASSET",
  FIXED_ASSET: "FIXED_ASSET",
  ACCUMULATED_DEPRECIATION: "ACCUMULATED_DEPRECIATION",
  CURRENT_LIABILITY: "CURRENT_LIABILITY",
  LONG_TERM_LIABILITY: "LONG_TERM_LIABILITY",
  EQUITY_CAPITAL: "EQUITY_CAPITAL",
  RETAINED_EARNINGS: "RETAINED_EARNINGS",
  DIRECT_REVENUE: "DIRECT_REVENUE",
  OTHER_REVENUE: "OTHER_REVENUE",
  COGS: "COGS",
  OPERATING_EXPENSE: "OPERATING_EXPENSE",
  NON_OPERATING: "NON_OPERATING",
} as const;
export type FinAccountSubtype =
  (typeof FIN_ACCOUNT_SUBTYPE)[keyof typeof FIN_ACCOUNT_SUBTYPE];

// ── Normal Balance ─────────────────────────────────────────────
export const FIN_NORMAL_BALANCE = {
  DEBIT: "DEBIT",
  CREDIT: "CREDIT",
} as const;
export type FinNormalBalance =
  (typeof FIN_NORMAL_BALANCE)[keyof typeof FIN_NORMAL_BALANCE];

// ── Journal Status ─────────────────────────────────────────────
export const FIN_JOURNAL_STATUS = {
  DRAFT: "DRAFT",
  POSTED: "POSTED",
  REVERSED: "REVERSED",
} as const;
export type FinJournalStatus =
  (typeof FIN_JOURNAL_STATUS)[keyof typeof FIN_JOURNAL_STATUS];

// ── Source Types (idempotency key part 1) ──────────────────────
export const FIN_SOURCE_TYPE = {
  PHARMACY_DISPENSE: "PHARMACY_DISPENSE",
  PHARMACY_INSURANCE_APPLIED: "PHARMACY_INSURANCE_APPLIED",
  PATIENT_PAYMENT: "PATIENT_PAYMENT",
  INSURANCE_PAYMENT: "INSURANCE_PAYMENT",
  SALE_RETURN: "SALE_RETURN",
  GRN_RECEIPT: "GRN_RECEIPT",
  SUPPLIER_INVOICE: "SUPPLIER_INVOICE",
  SUPPLIER_PAYMENT: "SUPPLIER_PAYMENT",
  STOCK_ADJUSTMENT: "STOCK_ADJUSTMENT",
  STOCK_EXPIRED: "STOCK_EXPIRED",
  STOCK_TRANSFER: "STOCK_TRANSFER",
  GENERAL_INVOICE: "GENERAL_INVOICE",
  MANUAL: "MANUAL",
  OPENING_BALANCE: "OPENING_BALANCE",
  PERIOD_CLOSE: "PERIOD_CLOSE",
} as const;
export type FinSourceType =
  (typeof FIN_SOURCE_TYPE)[keyof typeof FIN_SOURCE_TYPE];

// ── Period Status ──────────────────────────────────────────────
export const FIN_PERIOD_STATUS = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
  LOCKED: "LOCKED",
} as const;
export type FinPeriodStatus =
  (typeof FIN_PERIOD_STATUS)[keyof typeof FIN_PERIOD_STATUS];

// ── AP Invoice Status ──────────────────────────────────────────
export const FIN_AP_STATUS = {
  DRAFT: "DRAFT",
  APPROVED: "APPROVED",
  POSTED: "POSTED",
  PARTIAL: "PARTIAL",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
} as const;
export type FinApStatus =
  (typeof FIN_AP_STATUS)[keyof typeof FIN_AP_STATUS];

// ── AR Customer Type ───────────────────────────────────────────
export const FIN_AR_CUSTOMER_TYPE = {
  PATIENT: "PATIENT",
  INSURANCE: "INSURANCE",
} as const;
export type FinArCustomerType =
  (typeof FIN_AR_CUSTOMER_TYPE)[keyof typeof FIN_AR_CUSTOMER_TYPE];

// ── Payment Method ─────────────────────────────────────────────
export const FIN_PAYMENT_METHOD = {
  CASH: "CASH",
  BANK_TRANSFER: "BANK_TRANSFER",
  CHECK: "CHECK",
  CARD: "CARD",
} as const;
export type FinPaymentMethod =
  (typeof FIN_PAYMENT_METHOD)[keyof typeof FIN_PAYMENT_METHOD];

// ── Bank Account Type ──────────────────────────────────────────
export const FIN_BANK_ACCOUNT_TYPE = {
  BANK: "BANK",
  CASH: "CASH",
  PETTY_CASH: "PETTY_CASH",
} as const;
export type FinBankAccountType =
  (typeof FIN_BANK_ACCOUNT_TYPE)[keyof typeof FIN_BANK_ACCOUNT_TYPE];

// ── Tax Type ───────────────────────────────────────────────────
export const FIN_TAX_TYPE = {
  VAT: "VAT",
  SALES_TAX: "SALES_TAX",
  WITHHOLDING: "WITHHOLDING",
  EXEMPT: "EXEMPT",
} as const;
export type FinTaxType =
  (typeof FIN_TAX_TYPE)[keyof typeof FIN_TAX_TYPE];

// ── Valuation Method ───────────────────────────────────────────
export const FIN_VALUATION_METHOD = {
  FIFO: "FIFO",
  WEIGHTED_AVERAGE: "WEIGHTED_AVERAGE",
} as const;
export type FinValuationMethod =
  (typeof FIN_VALUATION_METHOD)[keyof typeof FIN_VALUATION_METHOD];

// ── Audit Action ───────────────────────────────────────────────
export const FIN_AUDIT_ACTION = {
  INSERT: "INSERT",
  UPDATE: "UPDATE",
  REVERSE: "REVERSE",
} as const;
export type FinAuditAction =
  (typeof FIN_AUDIT_ACTION)[keyof typeof FIN_AUDIT_ACTION];
