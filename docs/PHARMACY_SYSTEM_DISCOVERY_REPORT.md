# PHARMACY SYSTEM DISCOVERY REPORT

**Date:** April 19, 2026  
**Analyst:** Cascade (AI Solution Architect)  
**Repository:** `tibbna/tibbna` — Branch: `PharmacyFinance-integration`  
**Purpose:** Comprehensive analysis of existing pharmacy & inventory system to design finance module integration

---

## 1. EXECUTIVE SUMMARY

### System Overview
The **IQMed** platform is a multi-tenant healthcare information system built on Next.js 15, covering:
- **Electronic Health Records (EHR)** with openEHR integration
- **Pharmacy Management** — orders, dispensing, invoicing, insurance
- **Inventory Management** — warehouses, items, batches, procurement (PR → PO → GRN)
- **Laboratory Information Management (LIMS)** — samples, test results, validation
- **Patient Management** — registration, demographics, insurance links
- **Staff & Scheduling** — roles, appointments, departments

### Technology Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15.4.8, React 19.1.1, TypeScript 5, TailwindCSS 4 |
| UI Components | Radix UI (shadcn/ui pattern), Lucide icons, Recharts |
| Backend | Next.js API Routes (App Router), Server Actions |
| ORM | Drizzle ORM 0.31.4 |
| Database | Neon PostgreSQL (cloud) |
| Authentication | NextAuth 5 (beta.25) — Google OAuth + Credentials |
| Hosting | Vercel (serverless) |
| EHR Integration | openEHR (EHRBase) |
| Testing | Playwright |

### Current Financial Capabilities
- ✅ Pharmacy invoices generated at dispense time
- ✅ Insurance coverage calculation (% split)
- ✅ Invoice status tracking (DRAFT → ISSUED → PAID)
- ✅ General invoices for non-pharmacy services (lab, consultations)
- ✅ Payment recording with partial payment support
- ✅ Purchase orders with cost tracking
- ✅ Batch-level purchase & selling price tracking
- ✅ Stock movements with audit trail

### Critical Finance Gaps Identified
- ❌ No Chart of Accounts (COA)
- ❌ No General Ledger (GL) / Journal Entries
- ❌ No Cost of Goods Sold (COGS) calculation
- ❌ No Accounts Payable (AP) sub-ledger
- ❌ No Accounts Receivable (AR) aging
- ❌ No Tax/VAT engine
- ❌ No Financial Statements (P&L, Balance Sheet, Cash Flow)
- ❌ No Budget management
- ❌ No Cost Centers / Profit Centers
- ❌ No Bank Reconciliation
- ❌ No Multi-currency support (hardcoded USD)
- ❌ No Audit trail for financial transactions

---

## 2. TECHNICAL ARCHITECTURE

### Directory Structure
```
PharmacyFinance/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing/Login page
│   ├── layout.tsx                # Root layout with providers
│   ├── globals.css               # Global styles (Tailwind)
│   ├── api/                      # ~259 items — all API routes
│   │   ├── auth/                 # NextAuth endpoints
│   │   ├── billing/payments/     # Payment recording
│   │   ├── d/[workspaceid]/      # Workspace-scoped APIs (~87 items)
│   │   ├── pharmacy/             # Pharmacy APIs (orders, inventory, etc.)
│   │   ├── procurement/          # PR, PO, GRN APIs
│   │   ├── reports/              # Stock & consumption reports
│   │   ├── vendors/              # Vendor management
│   │   ├── warehouses/           # Warehouse management
│   │   └── ...                   # EHR, LIMS, admin, etc.
│   ├── d/[workspaceid]/          # Protected workspace pages
│   │   ├── pharmacy/             # Pharmacy dashboard, orders, dispense
│   │   ├── pharmacy-inventory/   # Inventory management UI (141KB page)
│   │   ├── patients/             # Patient management
│   │   ├── ehr/                  # EHR module
│   │   ├── lab-tech/             # Lab technician views
│   │   ├── lims/                 # LIMS management
│   │   ├── billing/              # Billing page (placeholder)
│   │   ├── insurance/            # Insurance management
│   │   └── shared/               # Shared pages (dashboard, staff, etc.)
│   ├── procurement/              # Procurement pages (PR, PO, GRN)
│   ├── vendors/                  # Vendor management page
│   └── warehouses/               # Warehouse management page
├── components/                   # Shared React components (84 items)
│   ├── ui/                       # shadcn/ui components (47 items)
│   ├── sidebar/                  # Navigation sidebar
│   ├── admin/                    # Admin panels
│   └── ...                       # Module-specific components
├── lib/                          # Core libraries
│   ├── db/                       # Database layer
│   │   ├── schema.ts             # Master schema (847 lines — all tables)
│   │   ├── tables/               # Modular table definitions (34 files)
│   │   ├── queries/              # Query helpers
│   │   └── migrations/           # Drizzle migrations
│   ├── user.ts                   # Auth config (NextAuth)
│   ├── notifications.ts          # Notification system
│   ├── openehr/                  # openEHR integration
│   └── lims/                     # LIMS utilities
├── contexts/                     # React contexts (7 items)
├── hooks/                        # Custom React hooks (4 items)
├── drizzle.config.ts             # Drizzle ORM config
├── next.config.ts                # Next.js config
└── package.json                  # Dependencies
```

### Architecture Pattern
- **Multi-tenant** via `workspaceid` on most tables
- **Workspace types**: hospital, laboratory, pharmacy
- **Two database access patterns**:
  1. **Drizzle ORM** (primary) — used by pharmacy orders, invoices, stock, patients
  2. **Raw SQL via `pg` Pool** — used by procurement, reports, adjustments (customer's inventory code)
- **Two schema systems** coexist:
  1. **Modular tables** (`lib/db/tables/*.ts`) — pharmacy-specific (Drizzle-native)
  2. **Unified schema** (`lib/db/schema.ts`) — inventory/procurement (customer's system)

---

## 3. DATABASE SCHEMA

### 3.1 Core Tables

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| userid | UUID PK | Auto-generated |
| name | text | |
| email | text | Unique, not null |
| image | text | Profile photo URL |
| password | text | Hashed (bcrypt-ts) |
| theme | text | light/dark/system |
| language | text | en/sv |
| permissions | jsonb | ["admin"] or [] |

**Finance Relevance:** User identity for audit trails, no finance-specific roles yet.

#### `workspaces`
| Column | Type | Notes |
|--------|------|-------|
| workspaceid | UUID PK | |
| name | text | |
| type | text | hospital/laboratory/pharmacy |
| settings | jsonb | |

**Finance Relevance:** Multi-tenancy anchor — all financial data must be workspace-scoped.

#### `workspaceusers`
| Column | Type | Notes |
|--------|------|-------|
| workspaceid + userid | Composite PK | |
| role | text | doctor/nurse/lab_technician/pharmacist/receptionist/administrator |

**Finance Relevance:** No finance roles (accountant, cashier, auditor) exist yet.

#### `patients`
| Column | Type | Notes |
|--------|------|-------|
| patientid | UUID PK | |
| workspaceid | UUID FK (nullable) | NULL = global patient |
| firstname, lastname | text | Required |
| nationalid, dateofbirth, gender, bloodgroup | text/date | |
| phone, email, address | text | |
| ehrid | text | openEHR linkage |
| medicalhistory | jsonb | |

**Finance Relevance:** Customer master for AR. Missing: credit limit, payment terms, tax ID.

#### `staff`
| Column | Type | Notes |
|--------|------|-------|
| staffid | UUID PK | |
| workspaceid | UUID FK | |
| role | text | doctor/nurse/lab_technician/pharmacist/receptionist/administrator |
| firstname, lastname, specialty, phone, email | text | |

**Finance Relevance:** Cost center association needed.

---

### 3.2 Pharmacy Tables

#### `pharmacies`
| Column | Type | Notes |
|--------|------|-------|
| pharmacyid | UUID PK | |
| workspaceid | UUID FK | |
| name, phone, email, address | text | |

**Finance Relevance:** Profit center / branch.

#### `drugs` (workspace-specific catalog)
| Column | Type | Notes |
|--------|------|-------|
| drugid | UUID PK | |
| workspaceid | UUID FK | |
| globaldrugid | UUID FK → global_drugs | Optional |
| name, genericname, form, strength, unit | text | |
| barcode, manufacturer, atccode, nationalcode | text | |
| insuranceapproved | boolean | |
| requiresprescription | boolean | |
| metadata | jsonb | |

**Finance Relevance:** No standard cost field. Price resolved from batch at dispense time.

#### `drug_batches`
| Column | Type | Notes |
|--------|------|-------|
| batchid | UUID PK | |
| drugid | UUID FK | |
| lotnumber | text | Not null |
| expirydate | date | Not null |
| **purchaseprice** | numeric(12,2) | ✅ Cost tracking |
| **sellingprice** | numeric(12,2) | ✅ Price tracking |

**Finance Relevance:** **KEY TABLE** — contains cost and selling price per batch. Enables COGS calculation via FIFO.

#### `pharmacy_orders`
| Column | Type | Notes |
|--------|------|-------|
| orderid | UUID PK | |
| workspaceid | UUID FK | |
| patientid | UUID FK | |
| prescriberid | UUID | Doctor reference |
| status | text | PENDING/IN_PROGRESS/DISPENSED/PARTIALLY_DISPENSED/CANCELLED/ON_HOLD |
| source | text | "openehr" or "manual" |
| priority | text | routine/urgent/stat |
| dispensedby | UUID | Pharmacist who dispensed |
| dispensedat | timestamp | |

**Finance Relevance:** Revenue event trigger. Status → DISPENSED creates invoice.

#### `pharmacy_order_items`
| Column | Type | Notes |
|--------|------|-------|
| itemid | UUID PK | |
| orderid | UUID FK | |
| drugid | UUID FK | |
| batchid | UUID FK → drug_batches | |
| drugname | text | Denormalized |
| dosage | text | |
| quantity | integer | |
| unitprice | numeric(12,2) | Resolved from batch |
| status | text | PENDING/SCANNED/DISPENSED/SUBSTITUTED/OUT_OF_STOCK/CANCELLED |

**Finance Relevance:** Line-level pricing exists. Missing: cost price, discount, tax.

#### `pharmacy_invoices`
| Column | Type | Notes |
|--------|------|-------|
| invoiceid | UUID PK | |
| orderid | UUID FK | One-to-one with order |
| patientid | UUID FK | |
| insuranceid | UUID FK | |
| invoicenumber | text | Auto-generated (INV-xxx) |
| status | text | DRAFT/ISSUED/PAID/PARTIALLY_PAID/CANCELLED |
| subtotal | numeric(12,2) | |
| insurancecovered | numeric(12,2) | |
| patientcopay | numeric(12,2) | |
| total | numeric(12,2) | = patientcopay (after insurance) |

**Finance Relevance:** **KEY TABLE** — primary revenue document. Missing: tax amount, discount, payment method, payment date, GL posting reference.

#### `pharmacy_invoice_lines`
| Column | Type | Notes |
|--------|------|-------|
| lineid | UUID PK | |
| invoiceid | UUID FK | |
| drugid | UUID FK | |
| description | text | |
| quantity | integer | |
| unitprice | numeric(12,2) | |
| linetotal | numeric(12,2) | |
| insurancecovered | numeric(12,2) | |
| patientpays | numeric(12,2) | |

**Finance Relevance:** Missing: cost price, tax amount, discount amount.

---

### 3.3 Insurance Tables

#### `insurance_companies`
| Column | Type | Notes |
|--------|------|-------|
| insuranceid | UUID PK | |
| workspaceid | UUID FK | |
| name, code, phone, email, address | text | |
| coveragepercent | numeric(5,2) | Default 80% |
| isactive | boolean | |

**Finance Relevance:** Payer master. Missing: payment terms, claim submission details, AR aging config.

#### `patient_insurance`
| Column | Type | Notes |
|--------|------|-------|
| patientinsuranceid | UUID PK | |
| patientid | UUID FK | |
| insuranceid | UUID FK | |
| policynumber, groupnumber | text | |
| startdate, enddate | date | |
| isprimary | boolean | |

**Finance Relevance:** Links patients to insurance for claim routing.

---

### 3.4 Stock Management Tables (Pharmacy-specific)

#### `pharmacy_stock_locations`
Physical storage locations (shelf, fridge, vault).

#### `pharmacy_stock_levels`
Current quantity per drug-batch-location combination.

#### `pharmacy_stock_movements`
| Column | Type | Notes |
|--------|------|-------|
| movementid | UUID PK | |
| drugid, batchid, locationid | UUID FKs | |
| type | text | RECEIVE/DISPENSE/ADJUST/TRANSFER/RETURN/EXPIRED |
| quantity | integer | + for receive, - for dispense |
| reason | text | |
| referenceid | text | Links to order/invoice |
| performedby | UUID | |

**Finance Relevance:** **KEY TABLE** — audit trail for inventory changes. Enables COGS and inventory valuation.

---

### 3.5 Inventory System Tables (Customer's Unified System)

These tables form the **Phase 2 Universal Inventory** that operates in parallel with pharmacy-specific tables:

| Table | Purpose | Finance Relevance |
|-------|---------|-------------------|
| `items` | Universal item master (drug, supply, consumable, reagent, asset, radiology) | Item master for all cost tracking |
| `item_batches` | Batch tracking with unit_cost + selling_price | COGS source |
| `inventory_stock` | Stock levels per item-warehouse-batch | Inventory valuation |
| `stock_transactions` | All stock movements (STOCK_IN/OUT, DISPENSE, WASTAGE, ADJUSTMENT) | Financial audit trail |
| `stock_transfers` | Inter-warehouse transfers | No financial impact (memo only) |
| `stock_adjustments` | Quantity adjustments with reason | Write-off / write-on events |
| `warehouses` | Physical warehouse locations (hospital/pharmacy/lab/radiology types) | Location-based cost tracking |
| `warehouse_sections` | Sub-locations within warehouses | |
| `stores` | Department sub-stores (main/sub) | Cost center proxy |
| `store_stock` | Stock at store level | |
| `store_transactions` | Store-level movements | |
| `store_requisitions` | Internal requests from stores to warehouses | |
| `controlled_drug_log` | Controlled substance audit (double witness) | Regulatory compliance |

---

### 3.6 Procurement Tables

| Table | Purpose | Finance Relevance |
|-------|---------|-------------------|
| `vendors` | Vendor master | AP vendor master. Has payment_terms, currency, tax_number |
| `vendor_contracts` | Price agreements per item-vendor | Cost benchmarking |
| `purchase_requisitions` | Internal purchase requests | Budget commitment point |
| `purchase_requisition_items` | PR line items with estimated price | Budget reservation |
| `purchase_orders` | Orders to vendors | AP accrual point. Has total_amount, currency, payment_terms |
| `purchase_order_items` | PO line items with unit_price, ordered/received qty | Cost basis |
| `goods_receipt_notes` | GRN headers with invoice_number/date | AP matching point |
| `grn_items` | GRN line items with received/rejected qty, unit_price, batch, expiry | Actual cost recording |

---

### 3.7 General Billing Tables

#### `invoices` (non-pharmacy)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| invoice_number | varchar(50) | Unique |
| patient_id, patient_name | varchar | |
| subtotal, discount_percentage, discount_amount, total_amount | numeric | |
| insurance_company_id, insurance_coverage_amount, insurance_coverage_percentage | | |
| patient_responsibility | numeric | |
| amount_paid, balance_due | numeric | **Payment tracking** |
| status | varchar | PENDING/PAID/PARTIAL |
| payment_method, payment_date | | |

**Finance Relevance:** More complete than pharmacy invoices — has discount, payment tracking, balance. Could serve as a model for unified invoicing.

---

## 4. EXISTING MODULES

### 4.1 Pharmacy Orders Module
- **Create orders**: Manual or from openEHR prescriptions
- **Order workflow**: PENDING → IN_PROGRESS → DISPENSED
- **Barcode scanning**: Items scanned before dispense
- **Drug substitution**: Generic/cost/allergy/out-of-stock substitutions recorded
- **Invoice generation**: Auto-created at dispense time
- **Insurance application**: Post-dispense insurance coverage recalculation

### 4.2 Pharmacy Inventory Module
- **Drug catalog**: Workspace-scoped with global catalog linkage
- **Batch tracking**: Lot number, expiry date, purchase/selling price
- **Stock levels**: Per drug-batch-location
- **Stock movements**: Full audit trail (receive, dispense, adjust, transfer, return, expired)
- **Low stock alerts**: Configurable threshold (default: 10)
- **Expiry alerts**: 90-day warning window
- **Auto-reorder suggestions**: Based on stock levels

### 4.3 Universal Inventory Module (Customer's Phase 2)
- **Multi-category items**: Drug, supply, consumable, reagent, asset, radiology
- **Warehouse management**: Multi-warehouse, typed (hospital/pharmacy/lab/radiology)
- **Warehouse sections**: Bin locations, temperature-controlled areas
- **Department stores**: Sub-stores linked to warehouses
- **Store requisitions**: Internal ordering workflow
- **Batch quarantine**: Quality hold with resolution tracking
- **Controlled drug logging**: With witness tracking
- **Stock adjustments**: With reason tracking
- **Inter-warehouse transfers**: Source/destination tracking

### 4.4 Procurement Module
- **Purchase Requisitions (PR)**: Draft → Approved → Converted to PO
- **Purchase Orders (PO)**: Draft → Approved → Sent → Partial/Complete
- **Goods Receipt Notes (GRN)**: Draft → Confirmed → Posted (with vendor invoice matching)
- **Vendor Management**: Contacts, payment terms, currency, contracts

### 4.5 Patient Management
- Registration with demographics, insurance links
- openEHR EHR creation and linkage
- Comprehensive patient form (Phase 2)

### 4.6 Billing & Payments
- General invoice creation for all services
- Payment recording with partial payment support
- Payment notification system
- Invoice status tracking

---

## 5. TRANSACTION FLOWS

### 5.1 Pharmacy Sale (Dispense) — PRIMARY REVENUE FLOW

```
Current Flow:
1. Doctor creates prescription (openEHR) or pharmacist creates manual order
   → INSERT pharmacy_orders (status=PENDING)
   → INSERT pharmacy_order_items

2. Pharmacist scans items (barcode verification)
   → UPDATE pharmacy_order_items (status=SCANNED)

3. Pharmacist confirms dispense
   → UPDATE pharmacy_orders (status=DISPENSED)
   → For each item:
     a. Find stock_level row for drug
     b. UPDATE pharmacy_stock_levels (quantity -= dispensed)
     c. INSERT pharmacy_stock_movements (type=DISPENSE, qty=-N)
     d. UPDATE pharmacy_order_items (status=DISPENSED)

4. Invoice auto-generated
   → INSERT pharmacy_invoices (status=ISSUED)
   → INSERT pharmacy_invoice_lines (per item)
   → Price resolved from: order_item.unitprice → drug_batch.sellingprice → 0

5. Insurance applied (optional, post-dispense)
   → Lookup insurance_companies.coveragepercent
   → UPDATE pharmacy_invoice_lines (insurancecovered, patientpays)
   → UPDATE pharmacy_invoices (insuranceid, insurancecovered, patientcopay, total)
```

**FINANCIAL EVENTS NEEDED:**
| Event | Debit | Credit | Status |
|-------|-------|--------|--------|
| Revenue Recognition | Cash / AR | Sales Revenue | ❌ No GL posting |
| COGS | Cost of Goods Sold | Inventory | ❌ Not calculated (purchaseprice exists on batch but unused) |
| Tax | Cash / AR | Tax Payable | ❌ No tax engine |
| Insurance AR | Insurance AR | Sales Revenue | ❌ No separate AR for insurance |
| Inventory Reduction | — | — | ✅ Stock deducted, movement logged |

### 5.2 Purchase from Supplier (Procurement)

```
Current Flow:
1. Purchase Requisition (PR)
   → INSERT purchase_requisitions
   → INSERT purchase_requisition_items (with estimated_price)

2. Purchase Order (PO) — created from PR
   → INSERT purchase_orders (vendorid, warehouseid, totalamount)
   → INSERT purchase_order_items (copied from PR items with unit_price)
   → UPDATE purchase_requisitions (status=ORDERED)

3. Goods Receipt (GRN)
   → INSERT goods_receipt_notes (invoice_number, invoice_date from vendor)
   → INSERT grn_items (received_qty, rejected_qty, unit_price, batch_number, expiry)
```

**FINANCIAL EVENTS NEEDED:**
| Event | Debit | Credit | Status |
|-------|-------|--------|--------|
| Inventory Receipt | Inventory | Goods Received Not Invoiced (GRNI) | ❌ No GL posting |
| Vendor Invoice | GRNI | Accounts Payable | ❌ No AP system |
| Vendor Payment | Accounts Payable | Cash/Bank | ❌ No payment system for vendors |

### 5.3 Stock Adjustment

```
Current Flow (via raw SQL):
1. POST /api/pharmacy/adjustments
   → INSERT stock_adjustments
   → UPDATE/INSERT inventory_stock (quantity adjusted)
   → UPDATE/INSERT item_batches (pricing if provided)
   → INSERT stock_transactions (STOCK_IN or STOCK_OUT)
```

**FINANCIAL EVENTS NEEDED:**
| Event | Debit | Credit | Status |
|-------|-------|--------|--------|
| Write-off (negative) | Inventory Loss | Inventory | ❌ No GL posting |
| Write-on (positive) | Inventory | Inventory Gain | ❌ No GL posting |

### 5.4 Patient Payment

```
Current Flow:
1. POST /api/billing/payments
   → Find invoice by ID or number
   → Calculate: newAmountPaid, newBalanceDue
   → UPDATE invoices (amount_paid, balance_due, status, payment_method, payment_date)
   → CREATE notification (PAYMENT_RECEIVED)
```

**FINANCIAL EVENTS NEEDED:**
| Event | Debit | Credit | Status |
|-------|-------|--------|--------|
| Cash Receipt | Cash/Bank | Accounts Receivable | ❌ No GL posting |

---

## 6. CURRENT FINANCIAL DATA

### What EXISTS:
| Data Point | Source Table | Quality |
|-----------|-------------|---------|
| Sale amounts | pharmacy_invoices.total | ✅ Available |
| Sale line items with pricing | pharmacy_invoice_lines | ✅ Available |
| Insurance coverage split | pharmacy_invoices.insurancecovered/patientcopay | ✅ Available |
| Drug purchase price (per batch) | drug_batches.purchaseprice | ✅ Available |
| Drug selling price (per batch) | drug_batches.sellingprice | ✅ Available |
| Item batch cost/price | item_batches.unit_cost/selling_price | ✅ Available |
| Purchase order amounts | purchase_orders.totalamount | ✅ Available |
| PO line item pricing | purchase_order_items.unitprice | ✅ Available |
| GRN received quantities | grn_items.receivedqty | ✅ Available |
| Payment amounts & method | invoices.amount_paid/payment_method | ✅ Available (general invoices) |
| Stock quantities | pharmacy_stock_levels / inventory_stock | ✅ Available |
| Stock movements (audit) | pharmacy_stock_movements / stock_transactions | ✅ Available |
| Vendor payment terms | vendors.paymentterms / vendor_contracts | ✅ Available |

### What's MISSING:
| Data Point | Impact |
|-----------|--------|
| Chart of Accounts | No GL structure — cannot produce financial statements |
| General Ledger / Journal Entries | No double-entry bookkeeping |
| COGS per sale | Cannot calculate gross margin (data exists but not calculated) |
| Tax/VAT amounts | No tax on any transaction |
| Discount tracking on pharmacy invoices | General invoices have it, pharmacy doesn't |
| Payment recording for pharmacy invoices | Only general invoices have payment tracking |
| Accounts Payable sub-ledger | Vendor invoices recorded in GRN but no AP aging |
| Accounts Receivable aging | No aging buckets or overdue tracking |
| Bank accounts & reconciliation | No cash management |
| Budget allocations | No budgeting system |
| Cost centers / Profit centers | No departmental cost tracking |
| Financial period management | No period close process |
| Currency exchange rates | Hardcoded USD, no multi-currency |
| Audit trail for financial changes | Stock movements logged, but no financial audit |

---

## 7. INTEGRATION POINTS IDENTIFIED

| # | Transaction | Current API | Current Tables | Finance Posting Needed | Data Gap |
|---|------------|-------------|----------------|----------------------|----------|
| 1 | **Pharmacy Dispense** | POST /api/pharmacy/orders/[id]/dispense | pharmacy_orders, pharmacy_invoices, pharmacy_stock_movements | Revenue + COGS + Tax + AR | Tax not calculated, COGS not computed |
| 2 | **Insurance Application** | POST /api/pharmacy/orders/[id]/insurance | pharmacy_invoices | Split AR (patient vs insurance) | No separate AR accounts |
| 3 | **Stock Adjustment** | POST /api/pharmacy/adjustments | stock_adjustments, inventory_stock | Inventory write-off/on | No GL posting |
| 4 | **Purchase Order** | POST /api/procurement/po | purchase_orders, purchase_order_items | Budget commitment | No budget system |
| 5 | **Goods Receipt** | POST /api/procurement/grn | goods_receipt_notes, grn_items | Inventory + GRNI accrual | No AP system |
| 6 | **Patient Payment** | POST /api/billing/payments | invoices | Cash + AR settlement | Works for general invoices, not pharmacy invoices |
| 7 | **Vendor Payment** | ❌ Does not exist | — | AP settlement + Cash | No vendor payment API |
| 8 | **Pharmacy Return** | ❌ Not implemented | — | Revenue reversal + Inventory + COGS reversal | No return flow exists |
| 9 | **Expired Stock Write-off** | Via stock_movements (type=EXPIRED) | pharmacy_stock_movements | Inventory loss posting | No financial impact recorded |
| 10 | **Insurance Claims** | ❌ Not implemented | — | AR to insurance + Claim tracking | Only coverage calc exists |

---

## 8. MASTER DATA ASSESSMENT

| Master Data | Status | Gaps |
|------------|--------|------|
| **Products/Drugs** | ✅ Complete | No standard cost field, no tax classification, no revenue account mapping |
| **Items (Universal)** | ✅ Complete | Comprehensive — has batch, expiry, UOM, reorder levels |
| **Patients/Customers** | ✅ Complete | Missing: credit limit, payment terms, tax ID, customer classification |
| **Suppliers/Vendors** | ✅ Complete (2 systems) | Old `suppliers` table + new `vendors` table coexist |
| **Insurance Companies** | ✅ Basic | Missing: claim submission details, payment terms, AR aging config |
| **Warehouses** | ✅ Complete | Multi-type, with sections and bin locations |
| **Staff** | ✅ Basic | Missing: cost center, payroll reference |
| **Tax Codes** | ❌ Missing | No tax master data at all |
| **Chart of Accounts** | ❌ Missing | Must be created for finance module |
| **Cost Centers** | ❌ Missing | Departments exist but no financial linkage |
| **Payment Methods** | ❌ Missing | String field on invoices, no master table |
| **Banks / Cash Accounts** | ❌ Missing | No cash management |
| **Fiscal Periods** | ❌ Missing | No period management |
| **Currencies** | ❌ Missing | Hardcoded USD, no currency master |

---

## 9. BUSINESS RULES

### Inventory Management
| Rule | Implementation |
|------|---------------|
| **Stock Deduction Method** | Simple deduction — finds first available stock_level row for drug. **Not true FIFO/LIFO** — no batch ordering applied |
| **Batch Tracking** | ✅ Yes — drug_batches and item_batches both track lot numbers |
| **Expiry Tracking** | ✅ Yes — 90-day expiry alerts, expired batch detection |
| **Reorder Levels** | ✅ Yes — configurable threshold (default 10), auto-reorder suggestions |
| **Multi-location** | ✅ Yes — warehouses + locations + department stores |
| **Controlled Substances** | ✅ Yes — controlled_drug_log with witness tracking |

### Pricing
| Rule | Implementation |
|------|---------------|
| **Pricing Method** | Batch-level selling price (set at batch creation/adjustment) |
| **Price Resolution** | order_item.unitprice → batch.sellingprice → 0 (fallback) |
| **Discounts** | ❌ Not on pharmacy invoices. General invoices have discount_percentage/amount |
| **Tax** | ❌ No tax calculation anywhere |
| **Currency** | USD hardcoded in vendors/PO. No multi-currency support |

### Credit Management
| Rule | Implementation |
|------|---------------|
| **Credit Sales** | Implicit — pharmacy invoices created as ISSUED, no payment required to dispense |
| **Credit Limit** | ❌ Not implemented |
| **Payment Terms** | ❌ Not on patient/pharmacy invoices. Vendors have payment_terms (days) |
| **AR Aging** | ❌ Not implemented |

---

## 10. USER ROLES & PERMISSIONS

### Current Roles (workspace-level)
| Role | Capabilities |
|------|-------------|
| `administrator` | Full access, user management |
| `doctor` | Prescriptions, patient records, EHR |
| `nurse` | Patient care, scheduling |
| `pharmacist` | Pharmacy orders, dispensing, inventory |
| `lab_technician` | Lab samples, test results |
| `receptionist` | Patient registration, scheduling |

### Global Permission
| Permission | Notes |
|-----------|-------|
| `admin` | System-wide admin (in users.permissions jsonb) |

### Finance Roles NEEDED
| Role | Access Needed |
|------|------|
| `accountant` | GL entries, financial reports, period close |
| `cashier` | Payment collection, POS receipts |
| `finance_manager` | Budget management, approvals, all finance reports |
| `auditor` | Read-only access to all financial data and audit trails |
| `procurement_officer` | PR/PO approval, vendor management |

---

## 11. REPORTING CAPABILITIES

### Existing Reports
| Report | API | Data Shown |
|--------|-----|------------|
| **Stock Report** | GET /api/reports?tab=stock | Item name, code, UOM, category, total stock, reserved stock, reorder level |
| **Consumption Report** | GET /api/reports?tab=consumption | Item, transaction type, total qty, tx count, warehouse, last activity (date filtered) |
| **Pharmacy Dashboard** | GET /api/pharmacy/dashboard | Low stock count, order stats (total/pending/in-progress/dispensed), today's orders, today's revenue, overdue orders, urgent notifications |
| **Inventory Detail** | GET /api/pharmacy/inventory | Per-drug: batches, locations, stock, expiring/expired counts, reorder suggestions |

### Finance Reports MISSING
| Report | Priority |
|--------|----------|
| **Profit & Loss Statement** | Critical |
| **Balance Sheet** | Critical |
| **Cash Flow Statement** | Critical |
| **Trial Balance** | Critical |
| **General Ledger** | Critical |
| **Accounts Receivable Aging** | High |
| **Accounts Payable Aging** | High |
| **Sales by Product/Category** | High |
| **COGS Report** | High |
| **Gross Margin Report** | High |
| **Inventory Valuation** | High |
| **Tax Report (VAT)** | Medium |
| **Budget vs. Actual** | Medium |
| **Vendor Payment Summary** | Medium |
| **Insurance Claims Report** | Medium |
| **Daily Cash Report** | Medium |

---

## 12. GAP ANALYSIS

### Critical Gaps (Must Have for Finance)
1. **No Chart of Accounts** — Cannot record any financial transaction properly
2. **No General Ledger** — No double-entry bookkeeping engine
3. **No COGS Calculation** — Purchase price data exists in batches but is never used at dispense time
4. **No Tax/VAT Engine** — Zero tax handling across the entire system
5. **No Financial Statements** — P&L, Balance Sheet, Cash Flow all absent
6. **No Accounts Payable** — Vendor invoices recorded in GRN but no payable aging or payment tracking
7. **No Payment System for Pharmacy Invoices** — General invoices have it, pharmacy invoices don't

### High Priority Gaps
8. **No AR Aging** — Invoices tracked but no aging buckets or collection workflow
9. **No Period Close** — No fiscal period management, no ability to lock periods
10. **Dual Inventory Systems** — Pharmacy-specific tables and universal inventory tables coexist without clear reconciliation
11. **No Bank/Cash Account Management** — Cash receipts recorded on invoices but no cash management
12. **No Unified Invoice System** — Two separate invoice tables (pharmacy_invoices and invoices) with different schemas

### Medium Priority Gaps
13. **No Budget System** — No budget allocation, commitment tracking, or variance reporting
14. **No Cost Centers** — Departments exist but no financial cost allocation
15. **No Multi-Currency** — USD hardcoded, no exchange rate management
16. **No Discount Management on Pharmacy** — General invoices support discounts, pharmacy doesn't
17. **No Credit Control** — No customer credit limits or payment term enforcement

### Low Priority Gaps
18. **No Bank Reconciliation** — Can be manual initially
19. **No Fixed Asset Module** — Assets tracked in inventory but no depreciation
20. **No Payroll Integration** — Staff exist but no salary/payroll linkage

---

## 13. RECOMMENDATIONS

### 1. Finance System Scope (Phase 1)
Build a **core accounting engine** that hooks into existing transactions:
- Chart of Accounts (COA) with account types
- General Ledger with double-entry journal entries
- Automatic GL posting triggered by: pharmacy dispense, stock receipt, payment, adjustment
- Financial period management
- Basic financial statements (P&L, Balance Sheet, Trial Balance)

### 2. Integration Approach
- **Event-driven posting**: Each existing API (dispense, GRN, payment) should trigger a GL posting function
- **Non-invasive**: Add GL posting as a secondary action — do not modify existing pharmacy/inventory logic
- **Retroactive**: Provide a migration tool to create GL entries for historical transactions

### 3. Data Migration Needs
- No financial data to migrate — this is a greenfield finance module
- Historical transactions (orders, invoices, stock movements) should be importable as opening balances
- Inventory valuation as of go-live date needed

### 4. Architecture Recommendation
- Create new `lib/db/tables/finance-*.ts` files following the modular pattern
- New API routes under `app/api/d/[workspaceid]/finance/`
- New pages under `app/d/[workspaceid]/finance/`
- Shared finance context for COA lookups

---

## 14. ASSUMPTIONS
1. The system operates in a single currency (USD) initially — multi-currency is Phase 2
2. FIFO costing method will be used for COGS (batch expiry dates provide natural ordering)
3. Accrual-based accounting (revenue at dispense, not at payment)
4. Insurance claims are treated as AR — not as revenue adjustments
5. The two inventory systems (pharmacy-specific + universal) will eventually be unified, but finance should support both
6. No intercompany transactions (single entity per workspace)

---

## 15. OPEN QUESTIONS

1. **Tax regime**: What tax/VAT rates apply? Is it inclusive or exclusive pricing? Multiple rates per item type?
2. **Insurance claim workflow**: Is there a formal claim submission → payment → reconciliation process with insurers?
3. **Credit policy**: Should patients have credit limits? Net-30 type terms? Or is it always pay-at-dispense?
4. **Fiscal year**: What is the fiscal year start date? Calendar year (Jan-Dec) or custom?
5. **Chart of Accounts**: Will the customer provide a COA template, or should we generate a standard healthcare COA?
6. **Cost allocation**: Should departments (pharmacy, lab, etc.) be separate cost centers or profit centers?
7. **Vendor payment process**: Is there a formal approval workflow for vendor payments?
8. **Reporting currency**: If multi-currency is needed later, what is the functional currency?
9. **Historical data**: How far back should we create retrospective GL entries? Or just opening balances?
10. **Integration with external accounting**: Is there an existing ERP/accounting system to interface with, or is this standalone?

---

*End of Discovery Report*
