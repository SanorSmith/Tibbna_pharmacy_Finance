# POS Database Schema

**Created:** April 21, 2026  
**Migration:** `lib/db/migrations/0032_fresh_the_renegades.sql`  
**Schema File:** `lib/db/tables/pos-schema.ts`  
**Status:** ✅ Applied to Neon PostgreSQL

---

## Tables Created

### 1. `pos_sales` — Main Sale Transactions (22 columns)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `saleid` | uuid | NOT NULL | gen_random_uuid() | Primary key |
| `workspaceid` | uuid | NOT NULL | — | FK → workspaces |
| `salenumber` | text | NOT NULL | — | **UNIQUE** sale number (e.g. `SALE-20260421-001`) |
| `saledate` | timestamptz | NOT NULL | now() | When sale occurred |
| `patientid` | uuid | NULLABLE | — | FK → patients (for known patients) |
| `customername` | text | NULLABLE | — | Walk-in customer name |
| `customernationalid` | text | NULLABLE | — | Walk-in national ID |
| `customerphone` | text | NULLABLE | — | Walk-in phone |
| `pharmacyorderid` | uuid | NULLABLE | — | FK → pharmacy_orders (if from dispensed order) |
| `prescriptionid` | text | NULLABLE | — | External prescription reference |
| `saletype` | text | NOT NULL | — | `DISPENSED_ORDER` / `NEW_PRESCRIPTION` / `OTC_WALKIN` |
| `subtotal` | numeric(12,2) | NOT NULL | — | Sum of line items before tax/discount |
| `taxamount` | numeric(12,2) | NOT NULL | 0 | Tax amount |
| `discountamount` | numeric(12,2) | NOT NULL | 0 | Discount amount |
| `totalamount` | numeric(12,2) | NOT NULL | — | Final total (subtotal + tax - discount) |
| `paidamount` | numeric(12,2) | NOT NULL | — | Amount collected |
| `changeamount` | numeric(12,2) | NOT NULL | 0 | Change given |
| `status` | text | NOT NULL | COMPLETED | `COMPLETED` / `CANCELLED` / `REFUNDED` |
| `cashierid` | uuid | NOT NULL | — | FK → users (who processed the sale) |
| `shiftid` | uuid | NULLABLE | — | FK → pos_shifts |
| `createdat` | timestamptz | NOT NULL | now() | Record creation |
| `updatedat` | timestamptz | NOT NULL | now() | Last update |

**Indexes:** workspace, saledate, patient, shift, cashier, status  
**Unique:** salenumber

---

### 2. `pos_sale_items` — Sale Line Items (15 columns)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `itemid` | uuid | NOT NULL | gen_random_uuid() | Primary key |
| `saleid` | uuid | NOT NULL | — | FK → pos_sales (CASCADE DELETE) |
| `drugid` | uuid | NOT NULL | — | FK → drugs |
| `drugname` | text | NOT NULL | — | Denormalized drug name |
| `batchid` | uuid | NULLABLE | — | FK → drug_batches |
| `lotnumber` | text | NULLABLE | — | Batch lot number |
| `expirydate` | date | NULLABLE | — | Batch expiry |
| `quantity` | integer | NOT NULL | — | Quantity sold |
| `unitprice` | numeric(10,2) | NOT NULL | — | Price per unit |
| `discountpercent` | numeric(5,2) | NOT NULL | 0 | Line item discount % |
| `discountamount` | numeric(10,2) | NOT NULL | 0 | Line item discount $ |
| `taxamount` | numeric(10,2) | NOT NULL | 0 | Line item tax |
| `totalamount` | numeric(10,2) | NOT NULL | — | Line total |
| `pharmacyorderitemid` | uuid | NULLABLE | — | FK → pharmacy_order_items |
| `createdat` | timestamptz | NOT NULL | now() | Record creation |

**Indexes:** saleid, drugid

---

### 3. `pos_payments` — Payment Records (19 columns)

Supports **multi-tender** (split payments: part cash, part card, part insurance).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `paymentid` | uuid | NOT NULL | gen_random_uuid() | Primary key |
| `saleid` | uuid | NOT NULL | — | FK → pos_sales (CASCADE DELETE) |
| `paymentmethod` | text | NOT NULL | — | `CASH` / `CARD` / `INSURANCE` / `CREDIT_ACCOUNT` |
| `amount` | numeric(12,2) | NOT NULL | — | Amount for this payment method |
| `cardtype` | text | NULLABLE | — | Visa/Mastercard/etc |
| `cardlast4` | text | NULLABLE | — | Last 4 digits |
| `cardholder` | text | NULLABLE | — | Card holder name |
| `transactionid` | text | NULLABLE | — | POS terminal transaction ID |
| `authorizationcode` | text | NULLABLE | — | Card auth code |
| `insurancecompanyid` | uuid | NULLABLE | — | Insurance company reference |
| `insuranceclaimnumber` | text | NULLABLE | — | Claim number |
| `insurancecoverage` | numeric(12,2) | NULLABLE | — | Amount covered by insurance |
| `patientcopay` | numeric(12,2) | NULLABLE | — | Patient copay amount |
| `approvalcode` | text | NULLABLE | — | Insurance approval code |
| `creditaccountid` | uuid | NULLABLE | — | Patient credit account reference |
| `creditbalancebefore` | numeric(12,2) | NULLABLE | — | Balance before charge |
| `creditbalanceafter` | numeric(12,2) | NULLABLE | — | Balance after charge |
| `status` | text | NOT NULL | COMPLETED | `COMPLETED` / `PENDING` / `FAILED` / `REFUNDED` |
| `createdat` | timestamptz | NOT NULL | now() | Record creation |

**Indexes:** saleid, paymentmethod

---

### 4. `pos_shifts` — Cashier Shifts (21 columns)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `shiftid` | uuid | NOT NULL | gen_random_uuid() | Primary key |
| `workspaceid` | uuid | NOT NULL | — | FK → workspaces |
| `cashierid` | uuid | NOT NULL | — | FK → users |
| `shiftnumber` | text | NOT NULL | — | **UNIQUE** shift number |
| `openingtime` | timestamptz | NOT NULL | now() | Shift start |
| `closingtime` | timestamptz | NULLABLE | — | Shift end |
| `openingcash` | numeric(12,2) | NOT NULL | 0 | Cash in drawer at open |
| `expectedcash` | numeric(12,2) | NULLABLE | — | Calculated expected cash |
| `actualcash` | numeric(12,2) | NULLABLE | — | Counted cash at close |
| `variance` | numeric(12,2) | NULLABLE | — | actual - expected |
| `variancereason` | text | NULLABLE | — | Explanation for variance |
| `totalsales` | numeric(12,2) | NOT NULL | 0 | Total sales amount |
| `totalcashsales` | numeric(12,2) | NOT NULL | 0 | Cash portion |
| `totalcardsales` | numeric(12,2) | NOT NULL | 0 | Card portion |
| `totalinsurancesales` | numeric(12,2) | NOT NULL | 0 | Insurance portion |
| `totalcreditsales` | numeric(12,2) | NOT NULL | 0 | Credit account portion |
| `transactioncount` | integer | NOT NULL | 0 | Number of transactions |
| `status` | text | NOT NULL | OPEN | `OPEN` / `CLOSED` |
| `notes` | text | NULLABLE | — | Shift notes |
| `createdat` | timestamptz | NOT NULL | now() | Record creation |
| `closedat` | timestamptz | NULLABLE | — | When shift was closed |

**Indexes:** workspace, cashier, status  
**Unique:** shiftnumber

---

### 5. `patient_credit_accounts` — Patient Credit/Tab Accounts (9 columns)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `accountid` | uuid | NOT NULL | gen_random_uuid() | Primary key |
| `workspaceid` | uuid | NOT NULL | — | FK → workspaces |
| `patientid` | uuid | NOT NULL | — | FK → patients |
| `creditlimit` | numeric(12,2) | NOT NULL | 0 | Maximum credit allowed |
| `currentbalance` | numeric(12,2) | NOT NULL | 0 | Amount currently owed |
| `availablecredit` | numeric(12,2) | NOT NULL | 0 | Remaining credit (limit - balance) |
| `status` | text | NOT NULL | ACTIVE | `ACTIVE` / `SUSPENDED` / `CLOSED` |
| `createdat` | timestamptz | NOT NULL | now() | Record creation |
| `updatedat` | timestamptz | NOT NULL | now() | Last update |

**Indexes:** workspace, patient  
**Unique:** (workspaceid, patientid) — one credit account per patient per workspace

---

## Relationships to Existing Tables

```
pos_sales.workspaceid      → workspaces.workspaceid (CASCADE)
pos_sales.patientid        → patients.patientid (SET NULL)
pos_sales.pharmacyorderid  → pharmacy_orders.orderid (SET NULL)
pos_sales.cashierid        → users.userid

pos_sale_items.saleid              → pos_sales.saleid (CASCADE)
pos_sale_items.drugid              → drugs.drugid
pos_sale_items.batchid             → drug_batches.batchid (SET NULL)
pos_sale_items.pharmacyorderitemid → pharmacy_order_items.itemid (SET NULL)

pos_payments.saleid                → pos_sales.saleid (CASCADE)
pos_payments.insurancecompanyid    → (application-level, FK deferred*)

pos_shifts.workspaceid             → workspaces.workspaceid (CASCADE)
pos_shifts.cashierid               → users.userid

patient_credit_accounts.workspaceid → workspaces.workspaceid (CASCADE)
patient_credit_accounts.patientid   → patients.patientid
```

*Note: Insurance FK deferred due to dual-schema issue (DB table uses `company_id` not `insuranceid`). Will be resolved when insurance schema is unified.

---

## Indexes Summary (23 total)

| Table | Index | Column(s) |
|-------|-------|-----------|
| pos_sales | idx_pos_sales_workspace | workspaceid |
| pos_sales | idx_pos_sales_date | saledate |
| pos_sales | idx_pos_sales_patient | patientid |
| pos_sales | idx_pos_sales_shift | shiftid |
| pos_sales | idx_pos_sales_cashier | cashierid |
| pos_sales | idx_pos_sales_status | status |
| pos_sales | pos_sales_salenumber_unique | salenumber |
| pos_sale_items | idx_pos_sale_items_sale | saleid |
| pos_sale_items | idx_pos_sale_items_drug | drugid |
| pos_payments | idx_pos_payments_sale | saleid |
| pos_payments | idx_pos_payments_method | paymentmethod |
| pos_shifts | idx_pos_shifts_workspace | workspaceid |
| pos_shifts | idx_pos_shifts_cashier | cashierid |
| pos_shifts | idx_pos_shifts_status | status |
| pos_shifts | pos_shifts_shiftnumber_unique | shiftnumber |
| patient_credit_accounts | idx_patient_credit_workspace | workspaceid |
| patient_credit_accounts | idx_patient_credit_patient | patientid |
| patient_credit_accounts | unique_patient_credit | (workspaceid, patientid) |

---

## TypeScript Types Exported

From `lib/db/tables/pos-schema.ts`:

```typescript
// Tables
posSales, posSaleItems, posPayments, posShifts, patientCreditAccounts

// Select types
PosSale, PosSaleItem, PosPayment, PosShift, PatientCreditAccount

// Insert types
NewPosSale, NewPosSaleItem, NewPosPayment, NewPosShift, NewPatientCreditAccount

// Enums/constants
POS_SALE_TYPE, POS_SALE_STATUS, POS_PAYMENT_METHOD, POS_PAYMENT_STATUS
POS_SHIFT_STATUS, CREDIT_ACCOUNT_STATUS

// Type aliases
PosSaleType, PosSaleStatus, PosPaymentMethod, PosPaymentStatus
PosShiftStatus, CreditAccountStatus
```

All re-exported via `lib/db/schema.ts` → `export * from "./tables/pos-schema"`.

---

## Migration Details

- **File:** `lib/db/migrations/0032_fresh_the_renegades.sql`
- **Statements:** 37 (5 CREATE TABLE + 13 FK constraints + 15 indexes + 2 ALTER TABLE + 2 FK for existing tables)
- **Applied:** April 21, 2026
- **No existing tables modified** — only new tables + 2 already-existing columns confirmed (dispenselocationid, reservedquantity)

---

## Existing Tables NOT Modified

Per the critical rules, these tables were **NOT touched**:
- `pharmacy_orders`
- `pharmacy_order_items`
- `pharmacy_invoices`
- `pharmacy_invoice_lines`
- `drugs`
- `drug_batches`
- `pharmacy_stock_levels`
- `pharmacy_stock_locations`
- `pharmacy_stock_movements`
- All finance tables (`fin_*`)
- All other existing tables
