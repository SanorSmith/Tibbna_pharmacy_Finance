# FINANCE SYSTEM ARCHITECTURE BLUEPRINT

**Date:** April 19, 2026  
**Architect:** Cascade (AI Enterprise Architect)  
**Platform:** IQMed — `tibbna/tibbna`  
**Branch:** `PharmacyFinance-integration`  
**Prerequisite:** Phase 1 Discovery Report

---

## 1. DESIGN PRINCIPLES & CONSTRAINTS

### Principles
| # | Principle | Rationale |
|---|-----------|-----------|
| P1 | **Non-invasive** | Finance hooks into existing APIs. Pharmacy/inventory tables never modified. |
| P2 | **Double-entry** | Every event produces balanced journal entry (debits = credits). |
| P3 | **Workspace-scoped** | All finance data scoped to `workspaceid` (multi-tenant). |
| P4 | **Idempotent posting** | Same pharmacy event posted twice produces same result (via idempotency keys). |
| P5 | **Country-agnostic** | Tax rates, currency, COA structure all configurable per workspace. |
| P6 | **Batch/lot aware** | COGS calculated at batch level using FIFO by expiry date. |
| P7 | **Audit-grade** | Every mutation logged with user, timestamp, before/after values. Soft delete only. |
| P8 | **Modular** | Each finance module independently deployable per implementation phase. |

### Hard Constraints
- Must use existing tech stack: Next.js API Routes, Drizzle ORM, Neon PostgreSQL, Vercel
- Must not break existing pharmacy, inventory, or procurement functionality
- Must support multi-branch (workspace) deployment
- Must handle partial payments, insurance splits, and credit sales
- Two existing invoice systems (`pharmacy_invoices` + `invoices`) must both feed into finance

---

## 2. FINANCE MODULE DEFINITION

### 2.1 CORE ACCOUNTING MODULES

#### Module 1: Chart of Accounts (COA)
**Purpose:** Hierarchical account structure for all financial recording.

| Component | Description |
|-----------|-------------|
| Account Categories | Asset, Liability, Equity, Revenue, Expense |
| Account Types | Current Asset, Fixed Asset, Current Liability, Long-term Liability, Direct Revenue, Other Revenue, COGS, Operating Expense, etc. |
| Account Hierarchy | Parent-child tree (unlimited depth) |
| Workspace Templates | Pre-built COA templates (healthcare/pharmacy) per country |
| Branch Segmentation | Accounts optionally tagged to branches for branch P&L |

**Default Healthcare Pharmacy COA (Template):**
```
1000  ASSETS
  1100  Current Assets
    1110  Cash & Bank
      1111  Main Bank Account
      1112  Petty Cash
      1113  POS Cash Drawer
    1120  Accounts Receivable
      1121  Patient AR
      1122  Insurance AR
    1130  Inventory
      1131  Drug Inventory
      1132  Supplies Inventory
      1133  Goods Received Not Invoiced (GRNI)
    1140  Prepaid Expenses
  1200  Fixed Assets
    1210  Equipment
    1220  Furniture & Fixtures
    1230  Accumulated Depreciation

2000  LIABILITIES
  2100  Current Liabilities
    2110  Accounts Payable
      2111  Supplier AP
    2120  Tax Payable
      2121  VAT/Sales Tax Payable
      2122  Income Tax Payable
    2130  Accrued Expenses
    2140  Deferred Revenue
  2200  Long-term Liabilities

3000  EQUITY
  3100  Owner's Equity / Capital
  3200  Retained Earnings

4000  REVENUE
  4100  Pharmacy Sales Revenue
    4110  Prescription Drug Sales
    4120  OTC Drug Sales
    4130  Medical Supplies Sales
  4200  Service Revenue
    4210  Lab Test Revenue
    4220  Consultation Revenue
  4300  Other Income
    4310  Interest Income
    4320  Insurance Reimbursement Revenue

5000  COST OF GOODS SOLD
  5100  Drug COGS
  5200  Supplies COGS
  5300  Inventory Write-offs
    5310  Expired Stock Loss
    5320  Shrinkage Loss

6000  OPERATING EXPENSES
  6100  Salaries & Wages
  6200  Rent & Utilities
  6300  Depreciation
  6400  Insurance Expense
  6500  Marketing & Advertising
  6600  Administrative Expenses
  6700  Bank Charges & Fees

7000  NON-OPERATING
  7100  Interest Expense
  7200  Foreign Exchange Gain/Loss
```

---

#### Module 2: General Ledger (GL)
**Purpose:** Central repository for all double-entry financial transactions.

| Component | Description |
|-----------|-------------|
| Journal Entries | Header + line items; always balanced |
| Posting Engine | Validates and posts journal entries from sub-ledgers |
| Period Management | Fiscal periods (monthly), open/closed/locked states |
| Account Balances | Running balances per account per period |
| Trial Balance | Sum of all debits/credits per account |

**Key Rules:**
- No journal entry can be posted to a closed period
- Every journal must reference a source document (pharmacy order, GRN, payment, etc.)
- Reversal entries (not deletion) for corrections
- Auto-numbering: `JE-YYYY-NNNNNN`

---

#### Module 3: Accounts Payable (AP)
**Purpose:** Manage supplier invoices, credit notes, and payments.

| Component | Description |
|-----------|-------------|
| Vendor Financial Master | Extends existing `vendors` table with finance fields (payment terms, credit limit, GL account) |
| Supplier Invoices | Created from GRN or manually; 3-way match (PO → GRN → Invoice) |
| Credit Notes | Supplier returns/adjustments |
| Payment Processing | Single or batch payments to suppliers |
| AP Aging | 0-30, 31-60, 61-90, 90+ day buckets |
| Vendor Statements | Balance and transaction history per vendor |

**Integration with Existing System:**
- `goods_receipt_notes` → triggers GRNI accrual posting
- `purchase_orders` → referenced on AP invoices for matching
- `vendors` table → linked (not replaced) via `vendor_id`

---

#### Module 4: Accounts Receivable (AR)
**Purpose:** Manage customer/patient invoices, insurance claims, and payment collection.

| Component | Description |
|-----------|-------------|
| Customer Financial Master | Extends `patients` with finance fields (credit limit, terms, AR account) |
| Sales Invoices | Auto-created from `pharmacy_invoices` and `invoices` tables |
| Insurance Claims AR | Separate AR sub-account per insurance company |
| Credit Notes | Returns, adjustments |
| Payment Receipts | Links to existing payment APIs |
| AR Aging | 0-30, 31-60, 61-90, 90+ buckets (split by patient vs insurance) |
| Dunning | Overdue notices and collection workflow |

**Integration with Existing System:**
- `pharmacy_invoices` → triggers revenue + AR posting
- `invoices` (general) → triggers revenue + AR posting
- `/api/billing/payments` → triggers cash receipt + AR settlement posting
- `insurance_companies` → linked for claims AR tracking

---

#### Module 5: Inventory Accounting
**Purpose:** Value inventory and calculate COGS at batch level.

| Component | Description |
|-----------|-------------|
| Inventory Valuation | FIFO by expiry date (natural ordering from `drug_batches.expirydate`) |
| COGS Calculation | At dispense time: lookup batch purchase price, multiply by quantity |
| Expiry Write-off | Batch value posted to `Expired Stock Loss` account |
| Adjustment Posting | Stock adjustments posted to `Shrinkage Loss` or `Inventory Gain` |
| Valuation Report | Current inventory value = SUM(batch_qty * batch_cost) |

**FIFO Costing Logic:**
```
When dispensing drug X, quantity 10:
1. Get all batches for drug X ordered by expiry_date ASC (FIFO)
2. For batch 1 (qty=5, cost=2.00): consume 5 → COGS += 5 * 2.00 = 10.00
3. For batch 2 (qty=20, cost=2.50): consume 5 → COGS += 5 * 2.50 = 12.50
4. Total COGS = 22.50
```

**Data Sources:**
- Cost: `drug_batches.purchaseprice` (pharmacy) or `item_batches.unit_cost` (universal inventory)
- Quantity: `pharmacy_stock_levels` or `inventory_stock`
- Movements: `pharmacy_stock_movements` or `stock_transactions`

---

#### Module 6: Cash & Bank Management
**Purpose:** Track cash and bank accounts, reconcile statements.

| Component | Description |
|-----------|-------------|
| Bank Accounts | Master list with GL account mapping |
| Cash Accounts | POS drawers, petty cash |
| Deposits/Withdrawals | Manual entries for non-automated transactions |
| Bank Reconciliation | Match bank statement lines to GL transactions |
| Cash Flow Tracking | Auto-generated from GL cash account movements |

---

#### Module 7: Tax/VAT Management
**Purpose:** Configurable tax engine for multi-country deployment.

| Component | Description |
|-----------|-------------|
| Tax Codes | Master table: code, name, rate, type (VAT/Sales/Withholding) |
| Tax Rules | Per item category or per item; inclusive vs exclusive pricing |
| Tax Calculation | Applied at invoice line level |
| Tax Reporting | Output tax (sales) vs Input tax (purchases) |
| Tax Periods | Monthly/quarterly tax return periods |

**Country Configuration Example:**
```
Iraq:         VAT 0% (currently no VAT)
Saudi Arabia: VAT 15%
UAE:          VAT 5%
Jordan:       Sales Tax 16%
```

---

### 2.2 PHARMACY-SPECIFIC FINANCE MODULES

#### Module 8: Pharmacy Sales Finance
**Purpose:** Bridge between pharmacy dispensing and financial accounting.

| Component | Description |
|-----------|-------------|
| Dispense-to-GL Posting | Auto-posts Revenue + COGS + Tax on dispense |
| Insurance Split Posting | Separate AR postings for patient copay vs insurance covered |
| Returns Processing | Reversal journal entries |
| Discount Handling | Discount recorded as contra-revenue |
| POS Cash Settlement | Daily cash drawer reconciliation |

---

#### Module 9: Insurance & Reimbursement Finance
**Purpose:** Track insurance claims as AR and manage reimbursement.

| Component | Description |
|-----------|-------------|
| Claim Generation | Auto from pharmacy invoice insurance portion |
| Claim Tracking | Submitted → Approved → Paid → Reconciled |
| Claim Aging | Separate from patient AR aging |
| Rejection Handling | Re-submission or write-off workflow |
| Remittance Matching | Match insurance payments to claims |

---

#### Module 10: Procurement Finance
**Purpose:** Financial control over the PR → PO → GRN → Invoice cycle.

| Component | Description |
|-----------|-------------|
| Budget Commitment | PO amount reserved against budget (Phase 3) |
| GRN Accrual | Dr Inventory, Cr GRNI at goods receipt |
| 3-Way Matching | PO qty/price vs GRN qty vs Supplier Invoice |
| Variance Analysis | Purchase price variance (PO price vs actual invoice price) |
| Landed Cost | Freight, customs, handling allocated to inventory cost |

---

### 2.3 MANAGEMENT & REPORTING MODULES

#### Module 11: Financial Reporting
- Income Statement (P&L) — by workspace, by period, by branch
- Balance Sheet — as of date
- Cash Flow Statement — direct method from GL
- Trial Balance — per period
- GL Detail — account-level transaction listing
- Sub-ledger reports — AP, AR detail

#### Module 12: Budgeting & Forecasting (Phase 3)
- Budget entry per GL account per period
- Approval workflow
- Budget vs Actual variance
- Forecast models based on historical trends

#### Module 13: Cost Center Management (Phase 3)
- Cost centers: Pharmacy, Lab, Admin, etc.
- Cost allocation rules
- Cost center P&L

### 2.4 COMPLIANCE & CONTROL MODULES

#### Module 14: Audit Trail
- Every finance table mutation logged (user, timestamp, before/after JSON)
- Immutable audit log (append-only)
- Queryable for compliance review

#### Module 15: Approval Workflows (Phase 2)
- Configurable approval matrix per transaction type and amount threshold
- Multi-level approvals (e.g., payment > $10K needs finance manager)
- Pending approval dashboard

#### Module 16: Period Close & Reconciliation
- Period close checklist (configurable)
- Sub-ledger to GL reconciliation
- Period lock (prevents posting to closed periods)
- Year-end closing entry (Revenue/Expense to Retained Earnings)

---

## 3. INTEGRATION MAPPING

### 3.1 Transaction-to-Accounting Matrix

| # | Pharmacy Event | Source API / Table | GL Posting | Debit Account | Credit Account | Method |
|---|---------------|-------------------|------------|---------------|----------------|--------|
| 1 | **Pharmacy Dispense (cash)** | `POST .../dispense` → `pharmacy_invoices` | Revenue + COGS | Dr 1111 Cash, Dr 5100 COGS | Cr 4110 Sales Revenue, Cr 1131 Inventory | Real-time hook |
| 2 | **Pharmacy Dispense (credit/insurance)** | `POST .../dispense` → `pharmacy_invoices` | Revenue + COGS + AR | Dr 1121 Patient AR + Dr 1122 Insurance AR, Dr 5100 COGS | Cr 4110 Revenue, Cr 1131 Inventory | Real-time hook |
| 3 | **Insurance Applied** | `POST .../insurance` → updates `pharmacy_invoices` | AR reclassification | Dr 1122 Insurance AR | Cr 1121 Patient AR (portion covered) | Real-time hook |
| 4 | **Patient Payment** | `POST /api/billing/payments` | Cash receipt | Dr 1111 Cash/Bank | Cr 1121 Patient AR | Real-time hook |
| 5 | **Insurance Payment** | New API needed | Cash receipt | Dr 1111 Cash/Bank | Cr 1122 Insurance AR | Real-time hook |
| 6 | **Sale Return** | New API needed | Reversal | Dr 4110 Revenue, Dr 1131 Inventory | Cr 1111 Cash/1121 AR, Cr 5100 COGS | Real-time hook |
| 7 | **Goods Receipt (GRN)** | `POST /api/procurement/grn` | Inventory accrual | Dr 1131 Inventory | Cr 1133 GRNI | Real-time hook |
| 8 | **Supplier Invoice** | New API (AP module) | AP recognition | Dr 1133 GRNI | Cr 2111 Supplier AP | Real-time |
| 9 | **Supplier Payment** | New API (AP module) | AP settlement | Dr 2111 Supplier AP | Cr 1111 Cash/Bank | Real-time |
| 10 | **Stock Adjustment (+)** | `POST /api/pharmacy/adjustments` | Inventory gain | Dr 1131 Inventory | Cr 4320 Other Income | Batch hook |
| 11 | **Stock Adjustment (-)** | `POST /api/pharmacy/adjustments` | Inventory loss | Dr 5320 Shrinkage Loss | Cr 1131 Inventory | Batch hook |
| 12 | **Expired Stock Write-off** | `stock_movements` type=EXPIRED | Expiry loss | Dr 5310 Expired Stock Loss | Cr 1131 Inventory | Batch process |
| 13 | **Inter-warehouse Transfer** | `stock_transfers` table | Memo only | Dr 1131 Inventory (dest) | Cr 1131 Inventory (source) | If branches differ |
| 14 | **General Invoice (lab/consult)** | `invoices` table + `/api/billing/payments` | Service revenue | Dr 1111 Cash / 1121 AR | Cr 4210/4220 Service Revenue | Real-time hook |
| 15 | **Tax on Sale** | Calculated by tax engine | Tax liability | Dr 1111 Cash / 1121 AR | Cr 2121 Tax Payable | Part of sale posting |
| 16 | **Tax on Purchase** | From supplier invoice | Input tax | Dr 2121 Tax Receivable | Cr 2111 AP | Part of AP posting |

### 3.2 Integration Method: Posting Engine Hook

```
Existing API (e.g., dispense) executes normally
    │
    ├── Pharmacy tables updated (orders, invoices, stock)  ← unchanged
    │
    └── THEN: financePostingEngine.post({
            sourceType: "PHARMACY_DISPENSE",
            sourceId: order.orderid,
            workspaceid: workspaceid,
            lines: [
              { account: "4110", credit: subtotal },
              { account: "1111", debit: cashAmount },
              { account: "1121", debit: patientAR },
              { account: "1122", debit: insuranceAR },
              { account: "5100", debit: cogsAmount },
              { account: "1131", credit: cogsAmount },
            ]
        })
```

The posting engine:
1. Validates all accounts exist and are active
2. Validates period is open
3. Checks idempotency (sourceType + sourceId unique)
4. Creates journal entry with balanced lines
5. Updates account running balances
6. Logs to audit trail

---

## 4. SOURCE OF TRUTH DEFINITION

| Data Entity | Source of Truth | Finance System | Sync Direction |
|-------------|----------------|----------------|----------------|
| Patients/Customers | Pharmacy (`patients`) | `fin_customers` (linked view) | Pharmacy → Finance (read) |
| Drugs/Products | Pharmacy (`drugs`, `items`) | Referenced for COGS lookup | Pharmacy → Finance (read) |
| Suppliers/Vendors | Pharmacy (`vendors`, `suppliers`) | `fin_vendors` (extended view) | Pharmacy → Finance (read) |
| Workspaces/Branches | Pharmacy (`workspaces`) | Referenced | Pharmacy → Finance (read) |
| Purchase Orders | Pharmacy (`purchase_orders`) | Referenced for matching | Read-only |
| GRN | Pharmacy (`goods_receipt_notes`) | Triggers GL posting | Read + post |
| Pharmacy Invoices | Pharmacy (`pharmacy_invoices`) | Triggers GL posting | Read + post |
| General Invoices | Pharmacy (`invoices`) | Triggers GL posting | Read + post |
| Stock Quantities | Pharmacy (`stock_levels`, `inventory_stock`) | Referenced for valuation | Read-only |
| **Chart of Accounts** | **Finance** (`fin_accounts`) | N/A | Finance only |
| **Journal Entries** | **Finance** (`fin_journal_entries`) | N/A | Finance only |
| **AP Invoices** | **Finance** (`fin_ap_invoices`) | Links to GRN | Finance only |
| **AP Payments** | **Finance** (`fin_ap_payments`) | N/A | Finance only |
| **AR Postings** | **Finance** (`fin_ar_transactions`) | Links to pharmacy invoices | Finance only |
| **Bank/Cash** | **Finance** (`fin_bank_accounts`) | N/A | Finance only |
| **Tax Config** | **Finance** (`fin_tax_codes`) | N/A | Finance only |
| **Inventory Value** | **Finance** (calculated from pharmacy batch data) | N/A | Finance calculates |
| **Payments** | **Shared** | Both record | Bi-directional |

**Key Design Decision:** Finance system does NOT duplicate pharmacy transaction data. It creates journal entries that *reference* pharmacy records via `source_type` + `source_id`. The pharmacy system remains the source of truth for operational data; finance is the source of truth for accounting data.

---

## 5. IMPLEMENTATION PHASES

### Phase 1: Foundation (MVP) — Weeks 1-4

**Goal:** Basic double-entry accounting with manual and auto posting.

| Module | Scope |
|--------|-------|
| Chart of Accounts | Full COA setup with healthcare template |
| General Ledger | Journal entries, posting, period management |
| Posting Engine | Core engine + pharmacy dispense hook |
| AR (Basic) | Auto-posting from pharmacy/general invoices |
| AP (Basic) | Manual supplier invoice entry, payment recording |
| Cash/Bank (Basic) | Bank account master, manual entries |
| Reports (Basic) | Trial Balance, P&L, Balance Sheet |

**Pharmacy Hooks (Phase 1):**
- Dispense → Revenue + COGS
- Patient payment → Cash receipt
- Manual journal entries for everything else

**Deliverables:**
- Functional COA with default template
- Journal entry creation (manual + auto from dispense)
- Basic Trial Balance, P&L, Balance Sheet
- Finance dashboard with key metrics

---

### Phase 2: Automation — Weeks 5-8

**Goal:** Full automated posting from all pharmacy events.

| Module | Scope |
|--------|-------|
| Inventory Accounting | Automated FIFO COGS, batch valuation |
| AR (Full) | Insurance AR split, aging, payment matching |
| AP (Full) | GRN accrual, 3-way matching, batch payments |
| Tax Engine | Configurable tax codes, auto-calculation |
| Approval Workflows | Payment approvals, journal approvals |
| Posting Hooks | All 16 transaction types from integration matrix |

**Deliverables:**
- Automated GL posting for all transactions
- AP aging and vendor statements
- AR aging (patient + insurance split)
- Tax calculation on sales and purchases
- Semi-automated month-end close

---

### Phase 3: Advanced — Weeks 9-12

**Goal:** Full enterprise finance capabilities.

| Module | Scope |
|--------|-------|
| Budgeting | Budget entry, approval, variance |
| Cost Centers | Department-level cost tracking |
| Branch P&L | Per-workspace profitability |
| Bank Reconciliation | Statement import, auto-match |
| Insurance Claims | Claim lifecycle management |
| Fixed Assets (Basic) | Asset register, straight-line depreciation |
| Advanced Reports | Cash flow, branch comparison, margin analysis |

---

### Phase 4: Optimization — Weeks 13+

**Goal:** BI, forecasting, and optimization.

| Module | Scope |
|--------|-------|
| Analytics Dashboard | KPI cards, trend charts, drill-down |
| Forecasting | Revenue/expense projections |
| Margin Analysis | Per-drug, per-category, per-branch |
| Procurement Optimization | Vendor price comparison, reorder optimization |
| Multi-currency | Currency master, exchange rates, conversion |

---

## 6. TECHNICAL ARCHITECTURE

### 6.1 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│              EXISTING PHARMACY SYSTEM                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Pharmacy │ │Inventory │ │Procure-  │ │  Billing  │  │
│  │ Orders   │ │ & Stock  │ │  ment    │ │& Payments │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
│       │            │            │              │         │
└───────┼────────────┼────────────┼──────────────┼─────────┘
        │            │            │              │
        └────────────┴────────────┴──────────────┘
                          │
                   POSTING ENGINE
                   (lib/finance/posting-engine.ts)
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Validation  │ │   Journal    │ │   Balance    │
│  & Rules     │ │   Creation   │ │   Update     │
└──────────────┘ └──────────────┘ └──────────────┘
                          │
┌─────────────────────────┼───────────────────────────────┐
│               FINANCE SYSTEM (New)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │  General │ │ Accounts │ │ Accounts │ │   Cash &  │  │
│  │  Ledger  │ │ Payable  │ │Receivable│ │   Bank    │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │Inventory │ │ Tax/VAT  │ │  Audit   │ │ Reports & │  │
│  │Accounting│ │  Engine  │ │  Trail   │ │ Analytics │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 6.2 File Structure (New Code)

```
lib/
  finance/
    posting-engine.ts          # Core: validates + creates journal entries
    cogs-calculator.ts         # FIFO batch-level COGS calculation
    tax-calculator.ts          # Tax computation per line item
    period-manager.ts          # Fiscal period open/close/lock
    balance-calculator.ts      # Running balance updates
    hooks/
      pharmacy-dispense.ts     # Hook: dispense → Revenue + COGS
      pharmacy-payment.ts      # Hook: patient payment → Cash + AR
      grn-receipt.ts           # Hook: GRN → Inventory + GRNI
      stock-adjustment.ts      # Hook: adjustment → Loss/Gain
      general-invoice.ts       # Hook: general invoice → Revenue + AR

lib/db/tables/
  finance-accounts.ts          # Chart of Accounts
  finance-journal.ts           # Journal entries + lines
  finance-periods.ts           # Fiscal periods
  finance-ap.ts                # AP invoices, payments
  finance-ar.ts                # AR transactions
  finance-bank.ts              # Bank/cash accounts
  finance-tax.ts               # Tax codes, tax rules
  finance-audit.ts             # Finance audit log
  finance-budget.ts            # Budgets (Phase 3)
  finance-cost-centers.ts      # Cost centers (Phase 3)

app/api/d/[workspaceid]/finance/
  accounts/route.ts            # COA CRUD
  journal-entries/route.ts     # Journal entry CRUD
  journal-entries/post/route.ts # Post journal to GL
  ap/invoices/route.ts         # AP invoice CRUD
  ap/payments/route.ts         # AP payment processing
  ar/transactions/route.ts     # AR transaction listing
  ar/aging/route.ts            # AR aging report
  bank/accounts/route.ts       # Bank account CRUD
  bank/reconciliation/route.ts # Bank reconciliation
  tax/codes/route.ts           # Tax code CRUD
  reports/trial-balance/route.ts
  reports/income-statement/route.ts
  reports/balance-sheet/route.ts
  reports/gl-detail/route.ts
  periods/route.ts             # Period management
  dashboard/route.ts           # Finance dashboard stats

app/d/[workspaceid]/finance/
  page.tsx                     # Finance dashboard
  accounts/page.tsx            # COA management
  journal/page.tsx             # Journal entries
  ap/page.tsx                  # Accounts payable
  ar/page.tsx                  # Accounts receivable
  bank/page.tsx                # Bank management
  reports/page.tsx             # Financial reports
  settings/page.tsx            # Finance settings (tax, periods)
```

### 6.3 Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Database** | Same Neon PostgreSQL, `fin_` prefixed tables | Simplicity, transactional consistency, no extra infra |
| **ORM** | Drizzle ORM (same as pharmacy) | Consistency, existing team knowledge |
| **Integration** | Direct function call from pharmacy API routes | Simpler than event bus for Vercel serverless; can upgrade to queue later |
| **Costing Method** | FIFO by expiry date | Natural fit for pharmacy (dispense oldest first); data already exists |
| **Currency** | Single currency per workspace (configurable), multi-currency Phase 4 | Matches current USD-only reality |
| **Posting Timing** | Synchronous (Phase 1), async queue (Phase 4) | Real-time accuracy first, performance optimization later |
| **Reversal vs Delete** | Reversal journal entries only, never delete | Audit compliance |

### 6.4 Posting Engine Design

```
postFinancialEvent({
  workspaceid: string,
  sourceType: "PHARMACY_DISPENSE" | "PAYMENT_RECEIVED" | "GRN_RECEIPT" | ...,
  sourceId: string,           // idempotency: pharmacy order ID, payment ID, etc.
  date: Date,
  description: string,
  lines: Array<{
    accountCode: string,      // e.g., "4110"
    debit: number,            // one of debit/credit must be > 0
    credit: number,
    costCenterId?: string,    // Phase 3
    branchId?: string,        // for multi-branch
    memo?: string,
  }>,
  metadata?: Record<string, unknown>,
}) → { journalId: string, journalNumber: string }

Validation:
1. workspaceid exists
2. All account codes exist and are active
3. Current period is open for the given date
4. Total debits === total credits
5. No duplicate sourceType + sourceId (idempotency)
6. User has permission to post
```

---

## 7. DOMAIN MODEL & DATABASE DESIGN

### 7.1 Finance Tables (Drizzle ORM)

All tables prefixed with `fin_` to avoid conflicts with existing schema.

#### `fin_accounts` — Chart of Accounts
| Column | Type | Notes |
|--------|------|-------|
| accountid | UUID PK | |
| workspaceid | UUID FK → workspaces | |
| accountcode | text | Unique per workspace (e.g., "4110") |
| accountname | text | |
| accounttype | text | ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE |
| accountsubtype | text | CURRENT_ASSET/FIXED_ASSET/COGS/OPERATING_EXPENSE/... |
| parentaccountid | UUID FK → self | For hierarchy |
| isgroupaccount | boolean | True = summary account (no direct posting) |
| isactive | boolean | |
| normbalance | text | DEBIT or CREDIT |
| description | text | |
| createdat, updatedat | timestamp | |

#### `fin_fiscal_periods` — Period Management
| Column | Type | Notes |
|--------|------|-------|
| periodid | UUID PK | |
| workspaceid | UUID FK | |
| periodname | text | e.g., "2026-04" |
| startdate | date | |
| enddate | date | |
| status | text | OPEN / CLOSED / LOCKED |
| closedby | UUID FK → users | |
| closedat | timestamp | |

#### `fin_journal_entries` — Journal Header
| Column | Type | Notes |
|--------|------|-------|
| journalid | UUID PK | |
| workspaceid | UUID FK | |
| journalnumber | text | Auto: JE-2026-000001 |
| journaldate | date | |
| periodid | UUID FK → fin_fiscal_periods | |
| sourcetype | text | PHARMACY_DISPENSE / PAYMENT / GRN / MANUAL / ... |
| sourceid | text | Pharmacy order ID, payment ID, etc. |
| description | text | |
| totaldebit | numeric(14,2) | |
| totalcredit | numeric(14,2) | |
| status | text | DRAFT / POSTED / REVERSED |
| postedby | UUID FK → users | |
| postedat | timestamp | |
| reversalof | UUID FK → self | If this reverses another entry |
| createdat, updatedat | timestamp | |
| createdby | UUID FK → users | |

**Unique constraint:** `(workspaceid, sourcetype, sourceid)` — idempotency

#### `fin_journal_lines` — Journal Line Items
| Column | Type | Notes |
|--------|------|-------|
| lineid | UUID PK | |
| journalid | UUID FK → fin_journal_entries | |
| accountid | UUID FK → fin_accounts | |
| debit | numeric(14,2) | Default 0 |
| credit | numeric(14,2) | Default 0 |
| memo | text | Line-level description |
| costcenterid | UUID FK (Phase 3) | |
| branchid | UUID (Phase 3) | |

#### `fin_account_balances` — Running Balances
| Column | Type | Notes |
|--------|------|-------|
| balanceid | UUID PK | |
| accountid | UUID FK → fin_accounts | |
| periodid | UUID FK → fin_fiscal_periods | |
| openingdebit | numeric(14,2) | |
| openingcredit | numeric(14,2) | |
| perioddebit | numeric(14,2) | Sum of debits in period |
| periodcredit | numeric(14,2) | Sum of credits in period |
| closingdebit | numeric(14,2) | opening + period |
| closingcredit | numeric(14,2) | |

**Unique constraint:** `(accountid, periodid)`

#### `fin_ap_invoices` — Supplier Invoices
| Column | Type | Notes |
|--------|------|-------|
| apinvoiceid | UUID PK | |
| workspaceid | UUID FK | |
| vendorid | UUID | Links to `vendors.id` |
| invoicenumber | text | Supplier's invoice number |
| invoicedate | date | |
| duedate | date | |
| grnid | UUID | Links to `goods_receipt_notes.id` |
| poid | UUID | Links to `purchase_orders.id` |
| subtotal | numeric(14,2) | |
| taxamount | numeric(14,2) | |
| totalamount | numeric(14,2) | |
| paidamount | numeric(14,2) | Default 0 |
| balancedue | numeric(14,2) | |
| status | text | DRAFT / APPROVED / PARTIAL / PAID / CANCELLED |
| journalid | UUID FK → fin_journal_entries | GL posting reference |
| createdat, updatedat | timestamp | |
| createdby | UUID FK → users | |

#### `fin_ap_payments` — Supplier Payments
| Column | Type | Notes |
|--------|------|-------|
| paymentid | UUID PK | |
| workspaceid | UUID FK | |
| vendorid | UUID | |
| paymentdate | date | |
| amount | numeric(14,2) | |
| paymentmethod | text | BANK_TRANSFER / CHECK / CASH |
| bankaccountid | UUID FK → fin_bank_accounts | |
| reference | text | Check number, transfer ref |
| journalid | UUID FK → fin_journal_entries | |
| createdat | timestamp | |
| createdby | UUID FK → users | |

#### `fin_ap_payment_allocations` — Payment-to-Invoice Mapping
| Column | Type | Notes |
|--------|------|-------|
| allocationid | UUID PK | |
| paymentid | UUID FK → fin_ap_payments | |
| apinvoiceid | UUID FK → fin_ap_invoices | |
| amount | numeric(14,2) | |

#### `fin_ar_transactions` — AR Tracking
| Column | Type | Notes |
|--------|------|-------|
| artransactionid | UUID PK | |
| workspaceid | UUID FK | |
| customertype | text | PATIENT / INSURANCE |
| customerid | text | `patients.patientid` or `insurance_companies.insuranceid` |
| sourcetype | text | PHARMACY_INVOICE / GENERAL_INVOICE / PAYMENT / CREDIT_NOTE |
| sourceid | text | Invoice ID or payment ID |
| transactiondate | date | |
| debitamount | numeric(14,2) | Invoice amount (increases AR) |
| creditamount | numeric(14,2) | Payment amount (decreases AR) |
| balance | numeric(14,2) | Running balance |
| journalid | UUID FK → fin_journal_entries | |
| createdat | timestamp | |

#### `fin_bank_accounts` — Bank/Cash Accounts
| Column | Type | Notes |
|--------|------|-------|
| bankaccountid | UUID PK | |
| workspaceid | UUID FK | |
| accountname | text | e.g., "Main Business Account" |
| banknametext | text | |
| accountnumber | text | |
| currency | text | Default from workspace |
| glaccountid | UUID FK → fin_accounts | Maps to COA (e.g., 1111) |
| currentbalance | numeric(14,2) | |
| isactive | boolean | |

#### `fin_tax_codes` — Tax Configuration
| Column | Type | Notes |
|--------|------|-------|
| taxcodeid | UUID PK | |
| workspaceid | UUID FK | |
| code | text | e.g., "VAT15", "EXEMPT" |
| name | text | e.g., "VAT 15%" |
| rate | numeric(5,2) | e.g., 15.00 |
| taxtype | text | VAT / SALES_TAX / WITHHOLDING |
| isinclusive | boolean | True = price includes tax |
| glaccountid | UUID FK → fin_accounts | Tax payable/receivable account |
| isactive | boolean | |
| effectivefrom | date | |
| effectiveto | date | Nullable |

#### `fin_audit_log` — Financial Audit Trail
| Column | Type | Notes |
|--------|------|-------|
| auditid | UUID PK | |
| workspaceid | UUID FK | |
| tablename | text | e.g., "fin_journal_entries" |
| recordid | UUID | PK of modified record |
| action | text | INSERT / UPDATE / REVERSE |
| userid | UUID FK → users | |
| timestamp | timestamp | |
| ipaddress | text | |
| beforedata | jsonb | Previous state (null for INSERT) |
| afterdata | jsonb | New state |

---

## 8. SECURITY & AUDIT MODEL

### 8.1 Finance Roles (New)

| Role | Permissions |
|------|-------------|
| `finance_manager` | Full access: COA, GL, AP, AR, Bank, Reports, Period Close, Settings |
| `accountant` | Create/edit journal entries, AP/AR transactions, run reports. Cannot close periods. |
| `ap_clerk` | AP invoices and payments only. Cannot access AR, GL, or reports. |
| `ar_clerk` | AR transactions and patient/insurance payments. Cannot access AP. |
| `cashier` | Record cash receipts/payments. POS settlement. Cannot access GL or reports. |
| `finance_auditor` | Read-only access to ALL finance data including audit logs. Cannot create/edit. |
| `branch_manager` | Read-only access to own branch financial reports. |

**Implementation:** Add to existing `WorkspaceUserRole` type union and `workspaceusers.role` field.

### 8.2 Permission Matrix

| Action | fin_manager | accountant | ap_clerk | ar_clerk | cashier | auditor |
|--------|:-----------:|:----------:|:--------:|:--------:|:-------:|:-------:|
| View COA | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Edit COA | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create Journal | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Post Journal | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create AP Invoice | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve AP Payment | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Record Cash Receipt | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| View AR Aging | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| View AP Aging | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Run Reports | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Close Period | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Audit Log | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |

### 8.3 Audit Requirements

| Requirement | Implementation |
|-------------|---------------|
| Every mutation logged | `fin_audit_log` with before/after JSON |
| Immutable journal entries | Status changes only (DRAFT→POSTED→REVERSED), never deleted |
| Period lock | `fin_fiscal_periods.status = LOCKED` prevents all posting |
| Soft delete only | `isactive = false` instead of DELETE across all finance tables |
| User + timestamp on everything | `createdby`, `createdat`, `updatedby`, `updatedat` on all tables |
| Approval trail | Approval status + approver + timestamp on AP payments, journals |

---

## 9. REPORTING MODEL

### 9.1 Standard Financial Reports (Phase 1)

| # | Report | Data Source | Parameters |
|---|--------|------------|------------|
| 1 | **Trial Balance** | `fin_account_balances` | Period, as-of date |
| 2 | **Income Statement (P&L)** | `fin_account_balances` where type=REVENUE or EXPENSE | Period range, branch (optional) |
| 3 | **Balance Sheet** | `fin_account_balances` where type=ASSET, LIABILITY, EQUITY | As-of date |
| 4 | **General Ledger Detail** | `fin_journal_entries` + `fin_journal_lines` | Account, date range |
| 5 | **Journal Entry Listing** | `fin_journal_entries` | Date range, source type |

### 9.2 Sub-Ledger Reports (Phase 2)

| # | Report | Data Source |
|---|--------|------------|
| 6 | **AP Aging** | `fin_ap_invoices` grouped by vendor, age buckets |
| 7 | **AR Aging (Patient)** | `fin_ar_transactions` where customertype=PATIENT |
| 8 | **AR Aging (Insurance)** | `fin_ar_transactions` where customertype=INSURANCE |
| 9 | **Vendor Statement** | `fin_ap_invoices` + `fin_ap_payments` per vendor |
| 10 | **Patient Statement** | `fin_ar_transactions` per patient |
| 11 | **Inventory Valuation** | `drug_batches` + `pharmacy_stock_levels` (FIFO calc) |
| 12 | **COGS Report** | `fin_journal_lines` where account in COGS accounts |
| 13 | **Tax Summary** | `fin_journal_lines` where account = tax payable |

### 9.3 Pharmacy-Specific Finance Reports (Phase 2-3)

| # | Report | Purpose |
|---|--------|---------|
| 14 | **Sales by Drug/Category** | Revenue breakdown |
| 15 | **Gross Margin by Drug** | (Revenue - COGS) per drug |
| 16 | **Slow-Moving Inventory** | Items with no movement in N days |
| 17 | **Expiry Loss Report** | Value of expired stock written off |
| 18 | **Purchase Price Variance** | PO price vs actual invoice price |
| 19 | **Insurance Collection Efficiency** | Claims submitted vs collected, average days |
| 20 | **Branch P&L Comparison** | Side-by-side P&L per workspace |
| 21 | **Daily Cash Report** | Cash in + Cash out = Closing balance |
| 22 | **Budget vs Actual** | Budgeted vs actual per GL account |

### 9.4 Finance Dashboard KPIs

| KPI | Calculation |
|-----|-------------|
| Total Revenue (MTD) | Sum of Revenue account credits this period |
| Total COGS (MTD) | Sum of COGS account debits this period |
| Gross Margin % | (Revenue - COGS) / Revenue * 100 |
| Net Profit (MTD) | Revenue - COGS - Expenses |
| Cash Balance | Sum of all Cash/Bank GL accounts |
| AR Outstanding | Sum of AR account balances |
| AP Outstanding | Sum of AP account balances |
| Inventory Value | FIFO valuation of all stock |
| Overdue AR | AR aged > 30 days |
| Overdue AP | AP aged past due date |

---

## 10. MIGRATION & CUTOVER PLAN

### 10.1 Data Migration Strategy

| Step | Action | Details |
|------|--------|---------|
| 1 | **COA Setup** | Create workspace-specific COA from healthcare template |
| 2 | **Tax Code Setup** | Configure applicable tax codes per country |
| 3 | **Bank Account Setup** | Create bank/cash account masters with GL mapping |
| 4 | **Opening Balances** | Single journal entry with all account opening balances as of cutover date |
| 5 | **AR Opening** | For each unpaid pharmacy invoice: create AR transaction |
| 6 | **AP Opening** | For each unpaid vendor obligation: create AP invoice |
| 7 | **Inventory Value** | Calculate FIFO value of all current stock → set as opening inventory balance |

### 10.2 Historical Transaction Import (Optional)

If retrospective GL entries are desired:
1. Query all `pharmacy_invoices` with `status != CANCELLED` → create Revenue + COGS journals
2. Query all `goods_receipt_notes` → create Inventory + GRNI journals
3. Query all payments in `invoices` table → create Cash + AR journals
4. Run trial balance to verify balance

**Recommendation:** Start with opening balances only. Historical import is complex and error-prone.

### 10.3 Cutover Approach

| Phase | Duration | Activity |
|-------|----------|----------|
| **Pre-cutover** | 1 week | COA setup, tax config, bank accounts, opening balances |
| **Parallel Run** | 2 weeks | Finance system runs alongside manual bookkeeping; compare outputs |
| **Cutover** | 1 day (month-end) | Switch to finance system as primary; disable manual bookkeeping |
| **Post-cutover** | 2 weeks | Monitor, fix issues, reconcile first month-end close |

### 10.4 Rollback Plan

- Finance tables are additive (no pharmacy tables modified)
- Rollback = disable finance posting hooks + ignore `fin_*` tables
- Zero risk to existing pharmacy/inventory operations

---

## 11. APPENDIX: OPEN QUESTIONS & DECISIONS

### Decisions Made

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| D1 | Database location | Same Neon PostgreSQL, `fin_` prefix | Transactional consistency, no extra cost |
| D2 | Costing method | FIFO by expiry date | Natural for pharmacy, data exists |
| D3 | Accounting basis | Accrual (revenue at dispense, not at payment) | Standard for businesses |
| D4 | Reversal vs delete | Reversal entries only | Audit compliance |
| D5 | Currency scope (Phase 1) | Single currency per workspace | Matches reality, simplifies MVP |
| D6 | Tax approach | Configurable per workspace, default 0% | Supports Iraq (0%) and future countries |
| D7 | Integration method | Synchronous function call in API routes | Simple, reliable for Vercel serverless |
| D8 | COA structure | Template-based, customizable per workspace | Balances standardization with flexibility |

### Open Questions (Need Customer Input)

| # | Question | Impact | Default Assumption |
|---|----------|--------|-------------------|
| Q1 | What is the fiscal year? Calendar (Jan-Dec) or custom? | Period setup | Calendar year |
| Q2 | Which tax rates apply? (VAT rate, exemptions) | Tax engine config | 0% (Iraq) |
| Q3 | Should insurance claims have a separate workflow? | AR module scope | Simple AR tracking (no claim forms) |
| Q4 | Credit policy for patients? (limits, terms) | AR module | No credit limits (pay at dispense) |
| Q5 | Approval thresholds for payments? | Workflow config | All payments need finance_manager approval |
| Q6 | Do branches need separate COAs or shared? | COA design | Shared COA, branch tag on journal lines |
| Q7 | Bank statement format for reconciliation? | Bank module | Manual reconciliation (Phase 1) |
| Q8 | Reporting currency if multi-country? | Currency | USD functional, local display currency |
| Q9 | Depreciation method for assets? | Fixed assets | Straight-line |
| Q10 | Integration with external accounting (QuickBooks, etc.)? | Export | No external integration (standalone) |

---

*End of Architecture Blueprint — Phase 2*

**Next Step:** Phase 3 — Database Schema Implementation (Code)
