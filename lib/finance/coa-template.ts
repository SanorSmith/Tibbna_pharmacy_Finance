/**
 * Finance Module — Healthcare Pharmacy COA Template
 *
 * Pre-built Chart of Accounts for healthcare/pharmacy workspaces.
 * Seeded via POST /api/d/[workspaceid]/finance/accounts/seed
 */
import type {
  FinAccountType,
  FinAccountSubtype,
  FinNormalBalance,
} from "@/lib/db/tables/finance-enums";

export interface COATemplateAccount {
  accountcode: string;
  accountname: string;
  accounttype: FinAccountType;
  accountsubtype?: FinAccountSubtype;
  parentcode: string | null; // resolved to parentaccountid at insert time
  isgroupaccount: boolean;
  normalbalance: FinNormalBalance;
  description?: string;
}

/**
 * Healthcare Pharmacy COA Template
 *
 * Structure from Phase 2 Architecture Blueprint:
 * 1000 ASSETS
 * 2000 LIABILITIES
 * 3000 EQUITY
 * 4000 REVENUE
 * 5000 COGS / DIRECT COSTS
 * 6000 OPERATING EXPENSES
 */
export const HEALTHCARE_PHARMACY_COA: COATemplateAccount[] = [
  // ═══════════════════════════════════════════════════════════════
  // 1000 — ASSETS
  // ═══════════════════════════════════════════════════════════════
  {
    accountcode: "1000",
    accountname: "Assets",
    accounttype: "ASSET",
    parentcode: null,
    isgroupaccount: true,
    normalbalance: "DEBIT",
  },
  {
    accountcode: "1100",
    accountname: "Current Assets",
    accounttype: "ASSET",
    accountsubtype: "CURRENT_ASSET",
    parentcode: "1000",
    isgroupaccount: true,
    normalbalance: "DEBIT",
  },
  {
    accountcode: "1110",
    accountname: "Cash & Bank",
    accounttype: "ASSET",
    accountsubtype: "CURRENT_ASSET",
    parentcode: "1100",
    isgroupaccount: true,
    normalbalance: "DEBIT",
  },
  {
    accountcode: "1111",
    accountname: "Main Bank Account",
    accounttype: "ASSET",
    accountsubtype: "CURRENT_ASSET",
    parentcode: "1110",
    isgroupaccount: false,
    normalbalance: "DEBIT",
    description: "Primary business bank account",
  },
  {
    accountcode: "1112",
    accountname: "Petty Cash",
    accounttype: "ASSET",
    accountsubtype: "CURRENT_ASSET",
    parentcode: "1110",
    isgroupaccount: false,
    normalbalance: "DEBIT",
  },
  {
    accountcode: "1113",
    accountname: "POS Cash Drawer",
    accounttype: "ASSET",
    accountsubtype: "CURRENT_ASSET",
    parentcode: "1110",
    isgroupaccount: false,
    normalbalance: "DEBIT",
  },
  {
    accountcode: "1120",
    accountname: "Accounts Receivable",
    accounttype: "ASSET",
    accountsubtype: "CURRENT_ASSET",
    parentcode: "1100",
    isgroupaccount: true,
    normalbalance: "DEBIT",
  },
  {
    accountcode: "1121",
    accountname: "Patient AR",
    accounttype: "ASSET",
    accountsubtype: "CURRENT_ASSET",
    parentcode: "1120",
    isgroupaccount: false,
    normalbalance: "DEBIT",
    description: "Receivables from patients (copay, credit sales)",
  },
  {
    accountcode: "1122",
    accountname: "Insurance AR",
    accounttype: "ASSET",
    accountsubtype: "CURRENT_ASSET",
    parentcode: "1120",
    isgroupaccount: false,
    normalbalance: "DEBIT",
    description: "Receivables from insurance companies",
  },
  {
    accountcode: "1130",
    accountname: "Inventory",
    accounttype: "ASSET",
    accountsubtype: "CURRENT_ASSET",
    parentcode: "1100",
    isgroupaccount: true,
    normalbalance: "DEBIT",
  },
  {
    accountcode: "1131",
    accountname: "Drug Inventory",
    accounttype: "ASSET",
    accountsubtype: "CURRENT_ASSET",
    parentcode: "1130",
    isgroupaccount: false,
    normalbalance: "DEBIT",
    description: "Pharmacy drug stock at cost",
  },
  {
    accountcode: "1132",
    accountname: "Supplies Inventory",
    accounttype: "ASSET",
    accountsubtype: "CURRENT_ASSET",
    parentcode: "1130",
    isgroupaccount: false,
    normalbalance: "DEBIT",
  },
  {
    accountcode: "1133",
    accountname: "Goods Received Not Invoiced",
    accounttype: "ASSET",
    accountsubtype: "CURRENT_ASSET",
    parentcode: "1130",
    isgroupaccount: false,
    normalbalance: "DEBIT",
    description: "GRNI accrual — cleared when supplier invoice is received",
  },
  {
    accountcode: "1200",
    accountname: "Fixed Assets",
    accounttype: "ASSET",
    accountsubtype: "FIXED_ASSET",
    parentcode: "1000",
    isgroupaccount: true,
    normalbalance: "DEBIT",
  },
  {
    accountcode: "1210",
    accountname: "Equipment & Fixtures",
    accounttype: "ASSET",
    accountsubtype: "FIXED_ASSET",
    parentcode: "1200",
    isgroupaccount: false,
    normalbalance: "DEBIT",
  },
  {
    accountcode: "1290",
    accountname: "Accumulated Depreciation",
    accounttype: "ASSET",
    accountsubtype: "ACCUMULATED_DEPRECIATION",
    parentcode: "1200",
    isgroupaccount: false,
    normalbalance: "CREDIT",
  },

  // ═══════════════════════════════════════════════════════════════
  // 2000 — LIABILITIES
  // ═══════════════════════════════════════════════════════════════
  {
    accountcode: "2000",
    accountname: "Liabilities",
    accounttype: "LIABILITY",
    parentcode: null,
    isgroupaccount: true,
    normalbalance: "CREDIT",
  },
  {
    accountcode: "2100",
    accountname: "Current Liabilities",
    accounttype: "LIABILITY",
    accountsubtype: "CURRENT_LIABILITY",
    parentcode: "2000",
    isgroupaccount: true,
    normalbalance: "CREDIT",
  },
  {
    accountcode: "2110",
    accountname: "Accounts Payable",
    accounttype: "LIABILITY",
    accountsubtype: "CURRENT_LIABILITY",
    parentcode: "2100",
    isgroupaccount: true,
    normalbalance: "CREDIT",
  },
  {
    accountcode: "2111",
    accountname: "Supplier AP",
    accounttype: "LIABILITY",
    accountsubtype: "CURRENT_LIABILITY",
    parentcode: "2110",
    isgroupaccount: false,
    normalbalance: "CREDIT",
    description: "Amounts owed to drug suppliers",
  },
  {
    accountcode: "2120",
    accountname: "Tax Payable",
    accounttype: "LIABILITY",
    accountsubtype: "CURRENT_LIABILITY",
    parentcode: "2100",
    isgroupaccount: false,
    normalbalance: "CREDIT",
    description: "VAT / sales tax collected but not yet remitted",
  },
  {
    accountcode: "2130",
    accountname: "Accrued Expenses",
    accounttype: "LIABILITY",
    accountsubtype: "CURRENT_LIABILITY",
    parentcode: "2100",
    isgroupaccount: false,
    normalbalance: "CREDIT",
  },
  {
    accountcode: "2200",
    accountname: "Long-Term Liabilities",
    accounttype: "LIABILITY",
    accountsubtype: "LONG_TERM_LIABILITY",
    parentcode: "2000",
    isgroupaccount: true,
    normalbalance: "CREDIT",
  },
  {
    accountcode: "2210",
    accountname: "Long-Term Loans",
    accounttype: "LIABILITY",
    accountsubtype: "LONG_TERM_LIABILITY",
    parentcode: "2200",
    isgroupaccount: false,
    normalbalance: "CREDIT",
  },

  // ═══════════════════════════════════════════════════════════════
  // 3000 — EQUITY
  // ═══════════════════════════════════════════════════════════════
  {
    accountcode: "3000",
    accountname: "Equity",
    accounttype: "EQUITY",
    parentcode: null,
    isgroupaccount: true,
    normalbalance: "CREDIT",
  },
  {
    accountcode: "3100",
    accountname: "Owner's Capital",
    accounttype: "EQUITY",
    accountsubtype: "EQUITY_CAPITAL",
    parentcode: "3000",
    isgroupaccount: false,
    normalbalance: "CREDIT",
  },
  {
    accountcode: "3200",
    accountname: "Retained Earnings",
    accounttype: "EQUITY",
    accountsubtype: "RETAINED_EARNINGS",
    parentcode: "3000",
    isgroupaccount: false,
    normalbalance: "CREDIT",
    description: "Accumulated net income from previous years",
  },

  // ═══════════════════════════════════════════════════════════════
  // 4000 — REVENUE
  // ═══════════════════════════════════════════════════════════════
  {
    accountcode: "4000",
    accountname: "Revenue",
    accounttype: "REVENUE",
    parentcode: null,
    isgroupaccount: true,
    normalbalance: "CREDIT",
  },
  {
    accountcode: "4100",
    accountname: "Drug Sales Revenue",
    accounttype: "REVENUE",
    accountsubtype: "DIRECT_REVENUE",
    parentcode: "4000",
    isgroupaccount: true,
    normalbalance: "CREDIT",
  },
  {
    accountcode: "4110",
    accountname: "Prescription Drug Sales",
    accounttype: "REVENUE",
    accountsubtype: "DIRECT_REVENUE",
    parentcode: "4100",
    isgroupaccount: false,
    normalbalance: "CREDIT",
    description: "Revenue from dispensed prescription medications",
  },
  {
    accountcode: "4120",
    accountname: "OTC Drug Sales",
    accounttype: "REVENUE",
    accountsubtype: "DIRECT_REVENUE",
    parentcode: "4100",
    isgroupaccount: false,
    normalbalance: "CREDIT",
    description: "Revenue from over-the-counter medications",
  },
  {
    accountcode: "4200",
    accountname: "Service Revenue",
    accounttype: "REVENUE",
    accountsubtype: "DIRECT_REVENUE",
    parentcode: "4000",
    isgroupaccount: true,
    normalbalance: "CREDIT",
  },
  {
    accountcode: "4210",
    accountname: "Consultation Fees",
    accounttype: "REVENUE",
    accountsubtype: "DIRECT_REVENUE",
    parentcode: "4200",
    isgroupaccount: false,
    normalbalance: "CREDIT",
  },
  {
    accountcode: "4300",
    accountname: "Other Income",
    accounttype: "REVENUE",
    accountsubtype: "OTHER_REVENUE",
    parentcode: "4000",
    isgroupaccount: true,
    normalbalance: "CREDIT",
  },
  {
    accountcode: "4310",
    accountname: "Late Payment Interest",
    accounttype: "REVENUE",
    accountsubtype: "OTHER_REVENUE",
    parentcode: "4300",
    isgroupaccount: false,
    normalbalance: "CREDIT",
  },
  {
    accountcode: "4320",
    accountname: "Other Income - Misc",
    accounttype: "REVENUE",
    accountsubtype: "OTHER_REVENUE",
    parentcode: "4300",
    isgroupaccount: false,
    normalbalance: "CREDIT",
    description: "Stock gains, rounding adjustments, etc.",
  },

  // ═══════════════════════════════════════════════════════════════
  // 5000 — COST OF GOODS SOLD
  // ═══════════════════════════════════════════════════════════════
  {
    accountcode: "5000",
    accountname: "Cost of Goods Sold",
    accounttype: "EXPENSE",
    parentcode: null,
    isgroupaccount: true,
    normalbalance: "DEBIT",
  },
  {
    accountcode: "5100",
    accountname: "Drug COGS",
    accounttype: "EXPENSE",
    accountsubtype: "COGS",
    parentcode: "5000",
    isgroupaccount: false,
    normalbalance: "DEBIT",
    description: "Cost of drugs dispensed (FIFO by expiry)",
  },
  {
    accountcode: "5200",
    accountname: "Purchase Discounts",
    accounttype: "EXPENSE",
    accountsubtype: "COGS",
    parentcode: "5000",
    isgroupaccount: false,
    normalbalance: "CREDIT",
    description: "Contra-COGS: supplier discounts received",
  },
  {
    accountcode: "5300",
    accountname: "Inventory Losses",
    accounttype: "EXPENSE",
    accountsubtype: "COGS",
    parentcode: "5000",
    isgroupaccount: true,
    normalbalance: "DEBIT",
  },
  {
    accountcode: "5310",
    accountname: "Expired Drug Loss",
    accounttype: "EXPENSE",
    accountsubtype: "COGS",
    parentcode: "5300",
    isgroupaccount: false,
    normalbalance: "DEBIT",
    description: "Write-off of expired pharmaceutical stock",
  },
  {
    accountcode: "5320",
    accountname: "Inventory Write-off",
    accounttype: "EXPENSE",
    accountsubtype: "COGS",
    parentcode: "5300",
    isgroupaccount: false,
    normalbalance: "DEBIT",
    description: "Shrinkage, damage, theft adjustments",
  },

  // ═══════════════════════════════════════════════════════════════
  // 6000 — OPERATING EXPENSES
  // ═══════════════════════════════════════════════════════════════
  {
    accountcode: "6000",
    accountname: "Operating Expenses",
    accounttype: "EXPENSE",
    parentcode: null,
    isgroupaccount: true,
    normalbalance: "DEBIT",
  },
  {
    accountcode: "6100",
    accountname: "Salaries & Wages",
    accounttype: "EXPENSE",
    accountsubtype: "OPERATING_EXPENSE",
    parentcode: "6000",
    isgroupaccount: false,
    normalbalance: "DEBIT",
  },
  {
    accountcode: "6200",
    accountname: "Rent & Utilities",
    accounttype: "EXPENSE",
    accountsubtype: "OPERATING_EXPENSE",
    parentcode: "6000",
    isgroupaccount: false,
    normalbalance: "DEBIT",
  },
  {
    accountcode: "6300",
    accountname: "Depreciation",
    accounttype: "EXPENSE",
    accountsubtype: "OPERATING_EXPENSE",
    parentcode: "6000",
    isgroupaccount: false,
    normalbalance: "DEBIT",
  },
  {
    accountcode: "6400",
    accountname: "Insurance Expense",
    accounttype: "EXPENSE",
    accountsubtype: "OPERATING_EXPENSE",
    parentcode: "6000",
    isgroupaccount: false,
    normalbalance: "DEBIT",
  },
  {
    accountcode: "6500",
    accountname: "Office Supplies",
    accounttype: "EXPENSE",
    accountsubtype: "OPERATING_EXPENSE",
    parentcode: "6000",
    isgroupaccount: false,
    normalbalance: "DEBIT",
  },
  {
    accountcode: "6600",
    accountname: "Marketing & Advertising",
    accounttype: "EXPENSE",
    accountsubtype: "OPERATING_EXPENSE",
    parentcode: "6000",
    isgroupaccount: false,
    normalbalance: "DEBIT",
  },
  {
    accountcode: "6700",
    accountname: "Professional Fees",
    accounttype: "EXPENSE",
    accountsubtype: "OPERATING_EXPENSE",
    parentcode: "6000",
    isgroupaccount: false,
    normalbalance: "DEBIT",
    description: "Legal, accounting, consulting",
  },
  {
    accountcode: "6800",
    accountname: "Bank Charges & Fees",
    accounttype: "EXPENSE",
    accountsubtype: "OPERATING_EXPENSE",
    parentcode: "6000",
    isgroupaccount: false,
    normalbalance: "DEBIT",
  },
  {
    accountcode: "6900",
    accountname: "Miscellaneous Expense",
    accounttype: "EXPENSE",
    accountsubtype: "OPERATING_EXPENSE",
    parentcode: "6000",
    isgroupaccount: false,
    normalbalance: "DEBIT",
  },
];
