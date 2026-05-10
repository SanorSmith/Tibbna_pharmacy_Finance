# FINANCE SYSTEM — TECHNICAL DESIGN DOCUMENT (Part 2)

**Continuation of:** `docs/FINANCE_TECHNICAL_DESIGN.md`

---

## TABLE OF CONTENTS (Part 2)

4. [Integration Hook Design](#4-integration-hook-design)
5. [COGS & Inventory Valuation Engine](#5-cogs--inventory-valuation-engine)
6. [Security & Permissions Design](#6-security--permissions-design)
7. [Testing Strategy](#7-testing-strategy)
8. [Deployment & Migration Plan](#8-deployment--migration-plan)

---

## 4. INTEGRATION HOOK DESIGN

### 4.1 Architecture Overview

Each integration hook is a **standalone async function** in `lib/finance/hooks/` that:
1. Accepts pharmacy event data as a typed interface
2. Calculates financial amounts (including COGS if needed)
3. Calls the posting engine with correct GL account codes
4. Creates sub-ledger records (AR/AP) as needed

**Critical rule:** Hooks are wrapped in try/catch. Finance failure **never** blocks the pharmacy operation. Errors are logged for manual resolution.

### 4.2 Hook File Map

| Hook | File | Triggered By |
|------|------|-------------|
| `onPharmacyDispense` | `lib/finance/hooks/pharmacy-dispense.ts` | Dispense API route |
| `onPatientPayment` | `lib/finance/hooks/patient-payment.ts` | Billing payments API |
| `onInsurancePayment` | `lib/finance/hooks/insurance-payment.ts` | Insurance payment API |
| `onGrnReceipt` | `lib/finance/hooks/grn-receipt.ts` | Procurement GRN API |
| `onSupplierInvoice` | `lib/finance/hooks/supplier-invoice.ts` | AP invoice creation |
| `onSupplierPayment` | `lib/finance/hooks/supplier-payment.ts` | AP payment API |
| `onStockAdjustment` | `lib/finance/hooks/stock-adjustment.ts` | Stock adjustment API |
| `onStockExpiry` | `lib/finance/hooks/stock-expiry.ts` | Expiry batch process |
| `onInsuranceApplied` | `lib/finance/hooks/insurance-applied.ts` | Insurance apply API |

### 4.3 Hook: Pharmacy Dispense (Most Complex)

**File:** `lib/finance/hooks/pharmacy-dispense.ts`

**Input interface:**
```typescript
interface DispenseEventData {
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
```

**Journal entries created:**

| Scenario | Debit Account | Credit Account | Amount |
|----------|--------------|----------------|--------|
| Revenue recognition | — | 4110 (Drug Sales) | subtotal |
| Patient copay receivable | 1121 (Patient AR) | — | patientcopay |
| Insurance receivable | 1122 (Insurance AR) | — | insurancecovered |
| COGS recognition | 5100 (Drug COGS) | — | FIFO cost |
| Inventory reduction | — | 1131 (Drug Inventory) | FIFO cost |

**Example for a $150 sale (insurance covers $100, patient pays $50, COGS = $85.50):**
```
Dr 1121 Patient AR          $50.00
Dr 1122 Insurance AR       $100.00
    Cr 4110 Drug Sales               $150.00
Dr 5100 Drug COGS           $85.50
    Cr 1131 Drug Inventory            $85.50
```

**Injection point:** `app/api/pharmacy/orders/[orderid]/dispense/route.ts` — after line ~174, before final `return NextResponse.json(...)`.

```typescript
// Injection pattern (added at end of dispense handler):
try {
  const { onPharmacyDispense } = await import("@/lib/finance/hooks/pharmacy-dispense");
  await onPharmacyDispense({
    workspaceid,
    orderid,
    patientid: order.patientid,
    insuranceid: null,  // set later when insurance is applied
    userid: user.userid,
    dispensedate: new Date().toISOString().split("T")[0],
    invoiceid: inv.invoiceid,
    subtotal,
    insurancecovered: 0,
    patientcopay: subtotal,
    items: items.map(item => ({
      drugid: item.drugid!,
      batchid: item.batchid,
      quantity: item.quantity,
      unitprice: parseFloat(item.unitprice || "0"),
      linetotal: parseFloat(item.unitprice || "0") * item.quantity,
    })),
  });
} catch (finErr) {
  console.error("[Finance] Dispense posting failed:", finErr);
}
```

### 4.4 Hook: Patient Payment

**Input:**
```typescript
interface PaymentEventData {
  workspaceid: string;
  paymentid: string;
  patientid: string;
  invoiceid: string;
  amount: number;
  paymentmethod: string;
  paymentdate: string;
  userid: string;
}
```

**Journal:**
```
Dr 1111 Cash/Bank          $50.00
    Cr 1121 Patient AR              $50.00
```

**Injection point:** `app/api/billing/payments/route.ts` — after payment record created.

### 4.5 Hook: Insurance Payment

**Input:**
```typescript
interface InsurancePaymentData {
  workspaceid: string;
  paymentid: string;
  insuranceid: string;
  amount: number;
  paymentmethod: string;
  paymentdate: string;
  invoiceids: string[];    // pharmacy invoices being settled
  userid: string;
}
```

**Journal:**
```
Dr 1111 Cash/Bank         $100.00
    Cr 1122 Insurance AR           $100.00
```

### 4.6 Hook: GRN Receipt

**Input:**
```typescript
interface GrnEventData {
  workspaceid: string;
  grnid: string;
  poid: string;
  vendorid: string;
  totalamount: number;
  receiptdate: string;
  userid: string;
  items: Array<{ itemid: string; receivedqty: number; unitprice: number }>;
}
```

**Journal:**
```
Dr 1131 Drug Inventory     $5,000.00
    Cr 1133 GRNI (Goods Received Not Invoiced)  $5,000.00
```

**Injection point:** `app/api/procurement/grn/route.ts` — after GRN creation.

### 4.7 Hook: Supplier Invoice (AP)

**Input:**
```typescript
interface SupplierInvoiceData {
  workspaceid: string;
  apinvoiceid: string;
  vendorid: string;
  totalamount: number;
  taxamount: number;
  invoicedate: string;
  grnid: string | null;
  userid: string;
}
```

**Journal (reverses GRNI accrual and creates AP):**
```
Dr 1133 GRNI               $5,000.00
    Cr 2111 Supplier AP              $5,000.00
```

### 4.8 Hook: Supplier Payment

**Journal:**
```
Dr 2111 Supplier AP        $5,000.00
    Cr 1111 Cash/Bank               $5,000.00
```

### 4.9 Hook: Stock Adjustment

**Loss scenario (shrinkage, damage):**
```
Dr 5320 Inventory Write-off  $200.00
    Cr 1131 Drug Inventory            $200.00
```

**Gain scenario (found items):**
```
Dr 1131 Drug Inventory       $200.00
    Cr 4320 Other Income              $200.00
```

**Injection point:** `app/api/pharmacy/adjustments/route.ts` — after adjustment recorded.

### 4.10 Hook: Stock Expiry Write-off

**Journal (batch process — runs on schedule or manually):**
```
Dr 5310 Expired Drug Loss    $350.00
    Cr 1131 Drug Inventory            $350.00
```

### 4.11 Complete GL Account Code Reference

| Code | Account Name | Type | Used By |
|------|-------------|------|---------|
| 1111 | Main Bank Account | Asset | Payments received/made |
| 1112 | Petty Cash | Asset | Small cash payments |
| 1113 | POS Cash Drawer | Asset | POS transactions |
| 1121 | Patient AR | Asset | Patient invoices/payments |
| 1122 | Insurance AR | Asset | Insurance claims/payments |
| 1131 | Drug Inventory | Asset | COGS, GRN, adjustments |
| 1133 | GRNI (Goods Received Not Invoiced) | Asset | GRN accrual |
| 2111 | Supplier AP | Liability | Supplier invoices/payments |
| 2120 | Tax Payable | Liability | Tax collection |
| 3100 | Owner's Capital | Equity | Opening balance |
| 3200 | Retained Earnings | Equity | Period close |
| 4110 | Prescription Drug Sales | Revenue | Dispense |
| 4120 | OTC Drug Sales | Revenue | OTC sales |
| 4320 | Other Income | Revenue | Stock gains |
| 5100 | Drug COGS | Expense | Dispense COGS |
| 5310 | Expired Drug Loss | Expense | Expiry write-off |
| 5320 | Inventory Write-off | Expense | Stock adjustment loss |
| 6100 | Salaries & Wages | Expense | Manual journal |
| 6200 | Rent & Utilities | Expense | Manual journal |

---

## 5. COGS & INVENTORY VALUATION ENGINE

### 5.1 FIFO by Expiry Date

**File:** `lib/finance/cogs-calculator.ts`

**Algorithm:**

```
function calculateFIFOCogs(drugid, quantityNeeded, preferredBatchid?):
  1. Query: SELECT batchid, expirydate, purchaseprice, quantity
     FROM drug_batches JOIN pharmacy_stock_levels
     WHERE drugid = ? AND quantity > 0
     ORDER BY expirydate ASC   ← FIFO: earliest expiry consumed first

  2. If preferredBatchid given → move that batch to front of list

  3. For each batch (in FIFO order):
     consume = MIN(remaining, available_qty)
     linecost = consume × purchaseprice
     totalCOGS += linecost
     remaining -= consume
     If remaining = 0 → break

  4. Return { totalCost, batchBreakdown[] }
     If remaining > 0 → log warning (insufficient data) but return partial
```

**Data sources:**
- **Primary:** `drug_batches.purchaseprice` + `pharmacy_stock_levels.quantity`
- **Fallback:** `item_batches.unit_cost` (universal inventory system)

### 5.2 Inventory Valuation Report

```
function calculateInventoryValuation(workspaceid):
  1. Query: drugs JOIN drug_batches JOIN pharmacy_stock_levels
     WHERE workspaceid = ? AND stock_qty > 0
     ORDER BY drugname, expirydate

  2. For each drug:
     totalQty = SUM(batch_qty)
     totalValue = SUM(batch_qty × batch_purchaseprice)
     avgCost = totalValue / totalQty

  3. Return per-drug breakdown with batch detail
```

### 5.3 Inventory GL Reconciliation

The inventory GL balance (`fin_account_balances` for account 1131) should match the sum of all batch values. A reconciliation report compares:

- **GL balance:** `fin_account_balances.closing` for account code 1131
- **Physical value:** `SUM(stock_qty × purchaseprice)` across all batches
- **Variance:** GL − Physical (should be 0 if all transactions posted correctly)

---

## 6. SECURITY & PERMISSIONS DESIGN

### 6.1 New Finance Roles

Extend `WorkspaceUserRole` in `lib/db/tables/workspace.ts`:

```typescript
export type WorkspaceUserRole =
  | "doctor" | "nurse" | "lab_technician" | "pharmacist"
  | "receptionist" | "administrator"
  // New finance roles:
  | "finance_manager" | "accountant" | "ap_clerk"
  | "ar_clerk" | "cashier" | "finance_auditor";
```

### 6.2 Permission Matrix

| Permission | finance_manager | accountant | ap_clerk | ar_clerk | cashier | finance_auditor | administrator |
|-----------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `finance:accounts:read` | ✅ | ✅ | | | | ✅ | ✅ |
| `finance:accounts:write` | ✅ | | | | | | ✅ |
| `finance:journal:read` | ✅ | ✅ | | | | ✅ | ✅ |
| `finance:journal:create` | ✅ | ✅ | | | | | |
| `finance:journal:post` | ✅ | ✅ | | | | | |
| `finance:journal:reverse` | ✅ | | | | | | |
| `finance:ap:read` | ✅ | ✅ | ✅ | | | ✅ | |
| `finance:ap:write` | ✅ | ✅ | ✅ | | | | |
| `finance:ap:approve` | ✅ | | | | | | |
| `finance:ap:pay` | ✅ | ✅ | | | | | |
| `finance:ar:read` | ✅ | ✅ | | ✅ | | ✅ | |
| `finance:ar:write` | ✅ | ✅ | | ✅ | | | |
| `finance:bank:read` | ✅ | ✅ | | | ✅ | ✅ | |
| `finance:bank:write` | ✅ | | | | | | |
| `finance:reports:read` | ✅ | ✅ | | | | ✅ | ✅ |
| `finance:periods:close` | ✅ | | | | | | |
| `finance:audit:read` | ✅ | | | | | ✅ | |
| `finance:settings:write` | ✅ | | | | | | ✅ |

### 6.3 Middleware Pattern

**File:** `lib/finance/permissions.ts`

Every finance API route uses:
```typescript
async function requireFinancePermission(
  request: NextRequest,
  workspaceid: string,
  permission: FinancePermission
): Promise<{ user: User; role: WorkspaceUserRole } | NextResponse>
```

This function:
1. Gets authenticated user via `getUser()`
2. Verifies workspace membership via `workspaceusers` table
3. Checks role against permission matrix
4. Returns `{ user, role }` on success or `403 NextResponse` on failure

---

## 7. TESTING STRATEGY

### 7.1 Test Categories

| Category | Tool | Location | Count |
|----------|------|----------|-------|
| Unit Tests | Vitest | `__tests__/finance/unit/` | ~30 |
| Integration Tests | Vitest + DB | `__tests__/finance/integration/` | ~20 |
| Accounting Scenarios | Vitest | `__tests__/finance/scenarios/` | ~15 |
| E2E Tests | Playwright | `e2e/finance/` | ~10 |

### 7.2 Unit Tests

#### Posting Engine (`__tests__/finance/unit/posting-engine.test.ts`)

**Validation tests:**
- Rejects unbalanced journal (debit ≠ credit)
- Rejects inactive account code
- Rejects group account (no direct posting)
- Rejects posting to closed period
- Rejects line with both debit AND credit > 0
- Rejects line with debit = 0 AND credit = 0
- Rejects negative amounts
- Rejects unknown account code
- Rejects empty lines array

**Idempotency tests:**
- Returns existing journal for duplicate (sourcetype, sourceid)
- Allows same sourcetype with different sourceid
- Allows MANUAL entries with null sourceid (no idempotency check)

**Journal creation tests:**
- Creates header with correct totals
- Creates all line items with correct account IDs
- Generates sequential journal numbers per workspace
- Sets status POSTED for system-generated entries
- Sets status DRAFT for manual entries

**Balance update tests:**
- Creates new balance row if none exists for (account, period)
- Updates existing balance with deltas
- Carries forward opening from previous period
- closing = opening + period amounts

#### FIFO COGS Calculator (`__tests__/finance/unit/cogs-calculator.test.ts`)

- Consumes oldest expiry batch first
- Splits across multiple batches when qty exceeds single batch
- Uses preferred batch when specified
- Returns partial COGS when insufficient batch data
- Handles zero-cost batches (purchaseprice null → cost = 0)
- Calculates correct total: sum(qty × unitcost) per batch consumed

#### Tax Calculator (`__tests__/finance/unit/tax-calculator.test.ts`)

- Exclusive tax: amount × rate (e.g., 100 × 15% = 15)
- Inclusive tax: amount − amount / (1 + rate) (e.g., 115 − 115/1.15 = 15)
- Returns 0 for EXEMPT tax code
- Uses rate based on effective date range

#### Journal Number Generator (`__tests__/finance/unit/journal-number.test.ts`)

- Generates "JE-YYYY-000001" for first entry
- Increments correctly: 000001, 000002, ..., 999999
- Generates per-workspace (workspace A and B have independent sequences)

### 7.3 Integration Tests

#### Pharmacy → Finance (`__tests__/finance/integration/pharmacy-finance.test.ts`)

```
test: "Dispense creates revenue + COGS journal"
  Setup: drug, batch (purchaseprice=10), stock=50, order with 5 items
  Act: POST /dispense
  Assert:
    - fin_journal_entries has 1 new POSTED entry
    - Journal has sourcetype=PHARMACY_DISPENSE, sourceid=orderid
    - Revenue line: Cr 4110 = subtotal
    - COGS line: Dr 5100 = 5 × $10 = $50
    - Inventory line: Cr 1131 = $50
    - fin_account_balances updated for 4110, 5100, 1131
    - fin_ar_transactions has patient AR debit

test: "Duplicate dispense is idempotent"
  Setup: same order already dispensed
  Act: call onPharmacyDispense again with same orderid
  Assert:
    - No new journal created
    - Returns idempotent: true with existing journalid

test: "Patient payment settles AR"
  Setup: existing invoice + AR balance of $50
  Act: POST /billing/payments with $50
  Assert:
    - Dr Cash $50, Cr Patient AR $50
    - AR transaction has creditamount = $50
    - Net AR balance for patient = 0
```

#### Procurement → Finance (`__tests__/finance/integration/procurement-finance.test.ts`)

```
test: "GRN creates inventory accrual"
  Setup: PO, vendor
  Act: Create GRN with totalamount = $5000
  Assert:
    - Dr 1131 Inventory $5000, Cr 1133 GRNI $5000

test: "Supplier invoice reverses GRNI and creates AP"
  Setup: existing GRN
  Act: Create AP invoice linked to GRN
  Assert:
    - Dr 1133 GRNI $5000, Cr 2111 AP $5000

test: "Supplier payment settles AP"
  Act: AP payment of $5000
  Assert:
    - Dr 2111 AP $5000, Cr 1111 Cash $5000
    - AP invoice status = PAID
```

#### Stock Adjustment → Finance (`__tests__/finance/integration/stock-adjustment-finance.test.ts`)

```
test: "Stock loss creates write-off journal"
  Act: adjustment of -10 units at $20/unit
  Assert: Dr 5320 $200, Cr 1131 $200

test: "Stock gain creates other income journal"
  Act: adjustment of +5 units at $20/unit
  Assert: Dr 1131 $100, Cr 4320 $100
```

### 7.4 Accounting Scenario Tests

#### Trial Balance (`__tests__/finance/scenarios/trial-balance.test.ts`)

```
test: "Trial balance is always balanced after any posting"
  Act: Post 10 random valid journals
  Assert: SUM(debit_balances) === SUM(credit_balances) for every period

test: "Trial balance matches journal line totals"
  Assert: For each account, balance = SUM of all posted journal lines
```

#### P&L Accuracy (`__tests__/finance/scenarios/income-statement.test.ts`)

```
test: "Revenue matches sum of Revenue account credits"
test: "COGS matches sum of COGS account debits"
test: "Net profit = Revenue - COGS - Expenses"
```

#### Balance Sheet (`__tests__/finance/scenarios/balance-sheet.test.ts`)

```
test: "Assets = Liabilities + Equity + Net Profit"
test: "AR balance matches outstanding invoice totals"
test: "AP balance matches unpaid supplier invoices"
test: "Inventory GL matches physical inventory valuation"
```

#### Complete Sale Cycle (`__tests__/finance/scenarios/sale-cycle.test.ts`)

```
test: "Full sale cycle from order to payment"
  1. Create order → dispense → invoice created
  2. Verify: Revenue posted, COGS posted, AR created
  3. Apply insurance coverage (80%)
  4. Verify: Insurance AR = 80%, Patient AR = 20%
  5. Patient pays copay
  6. Verify: Cash increased, Patient AR = 0
  7. Insurance company pays
  8. Verify: Cash increased, Insurance AR = 0
  9. Run trial balance → balanced
  10. Run P&L → revenue = sale amount
  11. Run balance sheet → assets = liabilities + equity

test: "Partial payment scenario"
  1. Invoice for $100
  2. Patient pays $40
  3. Verify: AR = $60, Cash += $40
  4. Patient pays remaining $60
  5. Verify: AR = $0, Cash += $100 total

test: "Complete procurement cycle"
  1. Create PO → GRN (Dr Inventory, Cr GRNI)
  2. Supplier invoice (Dr GRNI, Cr AP)
  3. Supplier payment (Dr AP, Cr Cash)
  4. Verify: Inventory up, Cash down, AP = 0, GRNI = 0
```

#### Period Close (`__tests__/finance/scenarios/period-close.test.ts`)

```
test: "Period close transfers balances"
  1. Post multiple journals in January
  2. Close January period
  3. Verify: February opening = January closing
  4. Verify: Cannot post to January after close

test: "Year-end close moves net income to retained earnings"
  1. Post revenue and expense journals for full year
  2. Run year-end close
  3. Verify: Revenue/Expense accounts reset to 0
  4. Verify: Net income transferred to Retained Earnings (3200)
```

### 7.5 Test Setup Helpers

**File:** `__tests__/finance/helpers/setup.ts`

```typescript
// Helper functions for test setup:
async function createTestWorkspace(): Promise<string>
async function seedTestCOA(workspaceid: string): Promise<void>
async function createTestPeriods(workspaceid: string, year: number): Promise<void>
async function createTestDrug(workspaceid: string): Promise<{ drugid, batchid }>
async function createTestStock(drugid: string, batchid: string, qty: number): Promise<void>
async function createTestOrder(workspaceid: string, patientid: string): Promise<string>
async function cleanupFinanceData(workspaceid: string): Promise<void>
```

---

## 8. DEPLOYMENT & MIGRATION PLAN

### 8.1 Migration Strategy

Since we use Drizzle ORM with Neon PostgreSQL, migrations are managed via `drizzle-kit`.

**Migration steps:**
1. Add finance table files to `lib/db/tables/finance-*.ts`
2. Add re-exports to `lib/db/schema.ts`
3. Run `npx drizzle-kit generate` → creates migration SQL
4. Run `npx drizzle-kit push` → applies to database
5. Verify tables created with correct indexes and constraints

**Migration order (dependency-aware):**
```
1. finance-enums.ts        (no deps)
2. finance-accounts.ts     (deps: workspaces, users)
3. finance-periods.ts      (deps: workspaces, users)
4. finance-bank.ts         (deps: workspaces, fin_accounts)
5. finance-tax.ts          (deps: workspaces, fin_accounts)
6. finance-journal.ts      (deps: workspaces, users, fin_accounts, fin_periods)
7. finance-balances.ts     (deps: fin_accounts, fin_periods)
8. finance-ap.ts           (deps: workspaces, users, fin_journal_entries, fin_bank_accounts)
9. finance-ar.ts           (deps: workspaces, fin_journal_entries)
10. finance-audit.ts       (deps: workspaces, users)
```

### 8.2 COA Seed Data

After migration, each workspace needs its COA seeded:

```
POST /api/d/{workspaceid}/finance/accounts/seed
{ "template": "healthcare_pharmacy" }
```

This seeds 42 accounts from the template defined in `docs/FINANCE_SYSTEM_ARCHITECTURE_BLUEPRINT.md` Section 2.1.

### 8.3 Fiscal Period Setup

After COA seed, generate fiscal periods:

```
POST /api/d/{workspaceid}/finance/periods/generate
{ "year": 2026, "type": "MONTH" }
```

Creates 12 monthly periods + 4 quarterly + 1 annual.

### 8.4 Implementation Phases

| Phase | Weeks | Deliverables |
|-------|-------|-------------|
| **Phase 1** | Wk 1-4 | COA, GL, Posting Engine, Basic AP/AR, Trial Balance, P&L, Balance Sheet |
| **Phase 2** | Wk 5-8 | Automated COGS, Full AP/AR with aging, Tax Engine, Approval Workflows |
| **Phase 3** | Wk 9-12 | Budgets, Cost Centers, Branch P&L, Bank Reconciliation, Insurance Claims |
| **Phase 4** | Wk 13+ | Analytics, Forecasting, Multi-currency, Dashboard |

### 8.5 Phase 1 Implementation Checklist

```
[ ] Create lib/db/tables/finance-enums.ts
[ ] Create lib/db/tables/finance-accounts.ts
[ ] Create lib/db/tables/finance-periods.ts
[ ] Create lib/db/tables/finance-journal.ts
[ ] Create lib/db/tables/finance-balances.ts
[ ] Create lib/db/tables/finance-bank.ts
[ ] Create lib/db/tables/finance-tax.ts
[ ] Create lib/db/tables/finance-audit.ts
[ ] Create lib/db/tables/finance-ap.ts
[ ] Create lib/db/tables/finance-ar.ts
[ ] Update lib/db/schema.ts with re-exports
[ ] Run drizzle-kit generate + push
[ ] Create lib/finance/posting-engine.ts
[ ] Create lib/finance/cogs-calculator.ts
[ ] Create lib/finance/permissions.ts
[ ] Create lib/finance/hooks/pharmacy-dispense.ts
[ ] Create lib/finance/hooks/patient-payment.ts
[ ] Create lib/finance/hooks/grn-receipt.ts
[ ] Create app/api/d/[workspaceid]/finance/accounts/route.ts (GET, POST)
[ ] Create app/api/d/[workspaceid]/finance/accounts/seed/route.ts (POST)
[ ] Create app/api/d/[workspaceid]/finance/periods/route.ts (GET, POST)
[ ] Create app/api/d/[workspaceid]/finance/periods/generate/route.ts (POST)
[ ] Create app/api/d/[workspaceid]/finance/journal-entries/route.ts (GET, POST)
[ ] Create app/api/d/[workspaceid]/finance/journal-entries/[id]/post/route.ts
[ ] Create app/api/d/[workspaceid]/finance/posting/route.ts (POST)
[ ] Create app/api/d/[workspaceid]/finance/reports/trial-balance/route.ts
[ ] Create app/api/d/[workspaceid]/finance/reports/income-statement/route.ts
[ ] Create app/api/d/[workspaceid]/finance/reports/balance-sheet/route.ts
[ ] Create app/api/d/[workspaceid]/finance/reports/dashboard/route.ts
[ ] Inject finance hook into dispense API
[ ] Inject finance hook into billing payments API
[ ] Write unit tests for posting engine
[ ] Write unit tests for COGS calculator
[ ] Write integration tests for dispense → finance
[ ] Write accounting scenario tests
```

### 8.6 Rollback Plan

If finance tables need to be reverted:
1. Remove hook calls from existing pharmacy API routes (revert injection)
2. Drop all `fin_*` tables via migration rollback
3. Remove finance table files and re-exports
4. No existing pharmacy data is affected (non-invasive design)

---

## APPENDIX A: DATA FLOW DIAGRAMS

### A.1 Pharmacy Dispense → Finance

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Pharmacist  │────▶│ Dispense API │────▶│ Update Order/     │
│  scans items │     │   route.ts   │     │ Stock/Invoice     │
└──────────────┘     └──────┬───────┘     └────────┬─────────┘
                            │                       │
                            ▼                       │
                     ┌──────────────┐               │
                     │  Finance     │◀──────────────┘
                     │  Hook Call   │
                     └──────┬───────┘
                            │
                 ┌──────────┼──────────┐
                 ▼          ▼          ▼
          ┌───────────┐ ┌────────┐ ┌────────┐
          │FIFO COGS  │ │Posting │ │  AR    │
          │Calculator │ │Engine  │ │Manager │
          └─────┬─────┘ └───┬────┘ └───┬────┘
                │            │          │
                ▼            ▼          ▼
          ┌───────────────────────────────────┐
          │         PostgreSQL (Neon)          │
          │  fin_journal_entries               │
          │  fin_journal_lines                 │
          │  fin_account_balances              │
          │  fin_ar_transactions               │
          │  fin_audit_log                     │
          └───────────────────────────────────┘
```

### A.2 Report Generation

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Finance User   │────▶│  Report API      │────▶│  Query           │
│  requests P&L   │     │  (GET)           │     │  fin_account_    │
└─────────────────┘     └──────────────────┘     │  balances        │
                                                  └────────┬─────────┘
                                                           │
                                                           ▼
                                                  ┌──────────────────┐
                                                  │  Aggregate by    │
                                                  │  account type:   │
                                                  │  Revenue, COGS,  │
                                                  │  Expenses        │
                                                  └────────┬─────────┘
                                                           │
                                                           ▼
                                                  ┌──────────────────┐
                                                  │  Return P&L:     │
                                                  │  Revenue: $112K  │
                                                  │  COGS: $67K      │
                                                  │  Net: $25.5K     │
                                                  └──────────────────┘
```

---

## APPENDIX B: ERROR HANDLING

| Error | Code | Handling |
|-------|------|----------|
| Unbalanced journal | VALIDATION_ERROR | Reject with debit/credit totals |
| Closed period | PERIOD_CLOSED | Reject, user must reopen or use next period |
| Duplicate source | — | Return existing journal (idempotent) |
| Account not found | VALIDATION_ERROR | Reject with missing code |
| Group account posting | VALIDATION_ERROR | Reject, suggest child account |
| Finance hook failure | — | Log error, pharmacy operation continues |
| COGS data missing | — | Post with partial COGS, log warning |
| Concurrent balance update | — | DB transaction ensures atomicity |

---

**END OF TECHNICAL DESIGN DOCUMENT**

Ready for developer implementation upon approval.
