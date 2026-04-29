# POS Backend API Documentation

**Created:** April 21, 2026  
**Files:** 7 route files under `app/api/pos/`  
**Auth:** All endpoints require authenticated user via `getUser()`  
**Database:** Reads from pharmacy tables, writes to POS tables  
**Existing tables:** NOT modified (pharmacy_orders.metadata updated via JSONB merge only)

---

## Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pos/search?q=&type=` | Search patients, orders, drugs |
| GET | `/api/pos/patients/[patientId]` | Patient details + orders + credit + insurance |
| GET | `/api/pos/orders/[orderId]` | Dispensed order details with items |
| POST | `/api/pos/checkout/calculate` | Calculate totals, tax, insurance, stock check |
| POST | `/api/pos/checkout/complete` | Finalize sale with items, payments, inventory |
| GET | `/api/pos/shifts` | Get current open shift |
| POST | `/api/pos/shifts` | Open new shift |
| POST | `/api/pos/shifts/[shiftId]/close` | Close shift with cash count |
| GET | `/api/pos/reports/daily?date=&workspaceId=` | Daily sales report |

---

## 1. Search API

**`GET /api/pos/search`**

Query parameters:
- `q` (required) — search term (min 2 chars)
- `type` (optional) — `patient` | `order` | `drug` | `all` (default: `all`)

Response:
```json
{
  "results": {
    "patients": [{ "patientid", "firstname", "lastname", "nationalid", "phone", "dateofbirth" }],
    "dispensedOrders": [{ "orderid", "patientid", "status", "openehrorderid", "createdat", "dispensedat" }],
    "drugs": [{ "drugid", "name", "genericname", "form", "strength", "barcode", "manufacturer" }]
  },
  "query": "...",
  "type": "all"
}
```

**Tables READ:** `patients`, `pharmacy_orders`, `drugs`  
**Tables WRITTEN:** none

---

## 2. Patient Lookup API

**`GET /api/pos/patients/[patientId]`**

Response:
```json
{
  "patient": { ... },
  "dispensedOrders": [{ ... }],
  "creditAccount": { "accountid", "creditlimit", "currentbalance", "availablecredit", "status" },
  "insurance": [{ "patientinsuranceid", "insuranceid", "policynumber", ... }]
}
```

**Tables READ:** `patients`, `pharmacy_orders`, `patient_credit_accounts`, `patient_insurance`  
**Tables WRITTEN:** none

---

## 3. Order Details API

**`GET /api/pos/orders/[orderId]`**

Response:
```json
{
  "order": { ... },
  "items": [{
    "itemid", "drugname", "genericname", "form", "strength",
    "quantity", "unitprice", "lotnumber", "expirydate", "sellingprice"
  }],
  "patient": { ... }
}
```

**Tables READ:** `pharmacy_orders`, `pharmacy_order_items`, `drugs`, `drug_batches`, `patients`  
**Tables WRITTEN:** none

---

## 4. Checkout Calculate API

**`POST /api/pos/checkout/calculate`**

Request body:
```json
{
  "items": [{ "drugId", "drugName", "batchId?", "quantity", "unitPrice" }],
  "patientId?": "uuid",
  "insuranceId?": "uuid",
  "discountPercent?": 0-100
}
```

Response:
```json
{
  "subtotal": 100.00,
  "discountPercent": 10,
  "discountAmount": 10.00,
  "taxRate": 0,
  "taxAmount": 0,
  "insuranceCoverage": 72.00,
  "insuranceDetail": { "companyName", "coveragePercent", "coverageAmount" },
  "patientCopay": 18.00,
  "total": 90.00,
  "itemCount": 3,
  "stockWarnings": ["Drug X: only 5 available (requested 10)"]
}
```

**Tables READ:** `insurance_companies`, `pharmacy_stock_levels`  
**Tables WRITTEN:** none  
**Validation:** Zod schema

---

## 5. Checkout Complete API

**`POST /api/pos/checkout/complete`**

Request body:
```json
{
  "workspaceId": "uuid",
  "items": [{
    "drugId", "drugName", "batchId?", "lotNumber?", "expiryDate?",
    "quantity", "unitPrice", "discountPercent?", "discountAmount?",
    "taxAmount?", "totalAmount", "pharmacyOrderItemId?"
  }],
  "payments": [{
    "method": "CASH|CARD|INSURANCE|CREDIT_ACCOUNT",
    "amount": 50.00,
    "cardType?", "cardLast4?", "transactionId?",
    "insuranceCompanyId?", "insuranceCoverage?",
    "creditAccountId?"
  }],
  "patientId?", "customername?", "customerphone?",
  "pharmacyOrderId?", "prescriptionId?",
  "saleType": "DISPENSED_ORDER|NEW_PRESCRIPTION|OTC_WALKIN",
  "shiftId?",
  "subtotal", "taxAmount?", "discountAmount?", "totalAmount"
}
```

Response:
```json
{
  "success": true,
  "saleId": "uuid",
  "saleNumber": "POS-20260421-M2K5B7",
  "sale": { ... },
  "message": "Sale POS-20260421-M2K5B7 completed successfully"
}
```

**Tables WRITTEN:**
- `pos_sales` — INSERT (new sale)
- `pos_sale_items` — INSERT (line items)
- `pos_payments` — INSERT (payment records)
- `pharmacy_stock_levels` — UPDATE quantity (OTC/NEW_PRESCRIPTION only)
- `pharmacy_stock_movements` — INSERT DISPENSE movement (OTC/NEW_PRESCRIPTION only)
- `patient_credit_accounts` — UPDATE balance (CREDIT_ACCOUNT payments only)
- `pharmacy_orders` — UPDATE metadata only (adds posSaleId, JSONB merge)

**Key behaviors:**
- Inventory deducted ONLY for `OTC_WALKIN` and `NEW_PRESCRIPTION` sale types
- `DISPENSED_ORDER` sales do NOT deduct inventory (already done during dispense)
- Stock movements use type `DISPENSE` (existing enum value)
- Patient credit account balance auto-updated for credit payments
- Pharmacy order metadata enriched with POS sale reference (no status change)
- Full transactional — all-or-nothing via `db.transaction()`
- Zod validation on all inputs

---

## 6. Shift Management APIs

### Open Shift
**`POST /api/pos/shifts`**

Request: `{ "workspaceId": "uuid", "openingCash": 100.00 }`  
Response: `{ "shift": { ... } }`  
Prevents duplicate open shifts per cashier.

### Get Current Shift
**`GET /api/pos/shifts`**

Response: `{ "shift": { ... } | null }`

### Close Shift
**`POST /api/pos/shifts/[shiftId]/close`**

Request: `{ "actualCash": 450.00, "notes?": "..." }`  
Response:
```json
{
  "shift": { ... },
  "summary": {
    "totalSales", "transactionCount",
    "openingCash", "expectedCash", "actualCash", "variance",
    "cashSales", "cardSales", "insuranceSales", "creditSales"
  }
}
```

Auto-calculates: expected cash, variance, sales totals by payment method.

**Tables WRITTEN:** `pos_shifts` (UPDATE on close)  
**Tables READ:** `pos_sales`, `pos_payments` (for summary aggregation)

---

## 7. Daily Reports API

**`GET /api/pos/reports/daily?date=2026-04-21&workspaceId=uuid`**

Response:
```json
{
  "date": "2026-04-21",
  "summary": { "totalSales", "totalSubtotal", "totalTax", "totalDiscount", "transactionCount" },
  "salesByType": [{ "saleType", "total", "count" }],
  "paymentBreakdown": [{ "paymentMethod", "total", "count" }],
  "topDrugs": [{ "drugName", "totalQuantity", "totalRevenue", "transactionCount" }],
  "hourlyDistribution": [{ "hour", "total", "count" }]
}
```

**Tables READ:** `pos_sales`, `pos_sale_items`, `pos_payments`  
**Tables WRITTEN:** none

---

## File Inventory

| File | Lines | Methods |
|------|-------|---------|
| `app/api/pos/search/route.ts` | ~115 | GET |
| `app/api/pos/patients/[patientId]/route.ts` | ~75 | GET |
| `app/api/pos/orders/[orderId]/route.ts` | ~85 | GET |
| `app/api/pos/checkout/calculate/route.ts` | ~130 | POST |
| `app/api/pos/checkout/complete/route.ts` | ~255 | POST |
| `app/api/pos/shifts/route.ts` | ~115 | GET, POST |
| `app/api/pos/shifts/[shiftId]/close/route.ts` | ~140 | POST |
| `app/api/pos/reports/daily/route.ts` | ~155 | GET |

**Total:** 8 files, 9 endpoints, ~1070 lines

---

## Conventions Followed

- **DB import:** `import { db } from "@/lib/db"` (existing pattern)
- **Auth:** `import { getUser } from "@/lib/user"` (existing pattern)
- **Params:** `Promise<{...}>` with `await params` (Next.js 15 pattern)
- **Schema:** imports from `@/lib/db/schema` barrel + specific table files
- **Validation:** Zod schemas on all POST endpoints
- **Stock movement type:** `DISPENSE` (existing enum, not custom `POS_SALE`)
- **No existing table modifications** — only reads from pharmacy tables, writes to POS tables
- **Pharmacy order:** only `metadata` JSONB field updated (append-only, no status change)
