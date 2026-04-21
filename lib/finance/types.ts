/**
 * Finance Module — Domain Types & Interfaces
 *
 * These are the domain-level types used by services, hooks, and APIs.
 * They are separate from Drizzle ORM inferred types (which are DB-level).
 */
import type {
  FinAccountType,
  FinAccountSubtype,
  FinNormalBalance,
  FinJournalStatus,
  FinSourceType,
  FinPeriodStatus,
  FinApStatus,
  FinArCustomerType,
  FinPaymentMethod,
  FinBankAccountType,
  FinTaxType,
  FinAuditAction,
} from "@/lib/db/tables/finance-enums";

// ── Re-export enums for convenience ──────────────────────────────
export type {
  FinAccountType,
  FinAccountSubtype,
  FinNormalBalance,
  FinJournalStatus,
  FinSourceType,
  FinPeriodStatus,
  FinApStatus,
  FinArCustomerType,
  FinPaymentMethod,
  FinBankAccountType,
  FinTaxType,
  FinAuditAction,
};

// ── Posting Engine Types ─────────────────────────────────────────

export interface PostingLine {
  accountcode: string;
  debit: number;
  credit: number;
  memo?: string;
  costcenterid?: string;
  branchid?: string;
}

export interface PostingRequest {
  workspaceid: string;
  sourcetype: FinSourceType;
  sourceid: string | null;
  date: string; // ISO "2026-04-19"
  description: string;
  lines: PostingLine[];
  metadata?: Record<string, unknown>;
  userid: string;
}

export interface PostingResult {
  success: true;
  journalid: string;
  journalnumber: string;
  status: FinJournalStatus;
  idempotent: boolean;
}

export type PostingErrorCode =
  | "VALIDATION_ERROR"
  | "PERIOD_CLOSED"
  | "DUPLICATE_CONFLICT"
  | "ACCOUNT_NOT_FOUND"
  | "INTERNAL_ERROR";

export interface PostingError {
  success: false;
  error: string;
  code: PostingErrorCode;
  details?: Record<string, unknown>;
}

export type PostingResponse = PostingResult | PostingError;

// ── COGS Types ───────────────────────────────────────────────────

export interface COGSBatchBreakdown {
  batchid: string;
  quantity: number;
  unitcost: number;
  linecost: number;
}

export interface COGSResult {
  totalCost: number;
  batchBreakdown: COGSBatchBreakdown[];
  insufficientData: boolean;
}

// ── AR Types ─────────────────────────────────────────────────────

export interface ArTransactionInput {
  workspaceid: string;
  customertype: FinArCustomerType;
  customerid: string;
  sourcetype: FinSourceType;
  sourceid: string;
  transactiondate: string;
  debitamount: number;
  creditamount: number;
  description?: string;
  journalid?: string;
}

// ── Integration Hook Types ───────────────────────────────────────

export interface DispenseEventData {
  workspaceid: string;
  orderid: string;
  patientid: string | null;
  insuranceid: string | null;
  userid: string;
  dispensedate: string;
  invoiceid: string;
  subtotal: number;
  insurancecovered: number;
  patientcopay: number;
  items: Array<{
    drugid: string;
    batchid: string | null;
    quantity: number;
    unitprice: number;
    linetotal: number;
  }>;
}

export interface PaymentEventData {
  workspaceid: string;
  paymentid: string;
  patientid: string;
  invoiceid: string;
  amount: number;
  paymentmethod: string;
  paymentdate: string;
  userid: string;
}

export interface InsurancePaymentData {
  workspaceid: string;
  paymentid: string;
  insuranceid: string;
  amount: number;
  paymentmethod: string;
  paymentdate: string;
  invoiceids: string[];
  userid: string;
}

export interface GrnEventData {
  workspaceid: string;
  grnid: string;
  poid: string;
  vendorid: string;
  totalamount: number;
  receiptdate: string;
  userid: string;
  items: Array<{
    itemid: string;
    receivedqty: number;
    unitprice: number;
  }>;
}

export interface StockAdjustmentEventData {
  workspaceid: string;
  adjustmentid: string;
  adjustmentquantity: number;
  unitcost: number;
  reason: string;
  adjustmentdate: string;
  userid: string;
}

// ── Report Types ─────────────────────────────────────────────────

export interface TrialBalanceRow {
  accountcode: string;
  accountname: string;
  accounttype: FinAccountType;
  debitbalance: number;
  creditbalance: number;
}

export interface TrialBalanceReport {
  period: { periodcode: string; periodname: string };
  accounts: TrialBalanceRow[];
  totals: {
    totaldebit: number;
    totalcredit: number;
    isbalanced: boolean;
  };
}

export interface IncomeStatementSection {
  accounts: Array<{
    accountcode: string;
    accountname: string;
    amount: number;
  }>;
  total: number;
}

export interface IncomeStatementReport {
  period: { from: string; to: string };
  revenue: IncomeStatementSection;
  cogs: IncomeStatementSection;
  grossProfit: number;
  grossMarginPercent: number;
  expenses: IncomeStatementSection;
  netProfit: number;
  netMarginPercent: number;
}

export interface BalanceSheetSection {
  accounts: Array<{
    accountcode: string;
    accountname: string;
    balance: number;
  }>;
  total: number;
}

export interface BalanceSheetReport {
  asOfDate: string;
  assets: {
    currentAssets: BalanceSheetSection;
    fixedAssets: BalanceSheetSection;
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: BalanceSheetSection;
    longTermLiabilities: BalanceSheetSection;
    totalLiabilities: number;
  };
  equity: BalanceSheetSection & { totalEquity: number };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

export interface FinanceDashboardKPIs {
  currentPeriod: string;
  revenueMTD: number;
  cogsMTD: number;
  grossMarginPercent: number;
  netProfitMTD: number;
  cashBalance: number;
  arOutstanding: number;
  apOutstanding: number;
  inventoryValue: number;
  overdueAR: number;
  overdueAP: number;
}
