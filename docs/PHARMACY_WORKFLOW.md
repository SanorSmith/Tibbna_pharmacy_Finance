# Pharmacy Workflow Documentation

Complete documentation of the pharmacy dispensing system, including database tables, API routes, file structure, and end-to-end workflows.

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [API Routes](#api-routes)
3. [File Structure](#file-structure)
4. [Complete Workflows](#complete-workflows)
5. [Enhanced Features](#enhanced-features)
6. [Data Flow Diagrams](#data-flow-diagrams)

---

## Database Schema

### Core Pharmacy Tables

#### 1. `pharmacy_orders`
Stores pharmacy medication orders (from openEHR or manual entry).

| Column | Type | Description |
|--------|------|-------------|
| `orderid` | UUID (PK) | Unique order identifier |
| `workspaceid` | UUID (FK) | Workspace this order belongs to |
| `patientid` | UUID (FK) | Patient who will receive medication |
| `prescriberid` | UUID (FK) | Doctor who prescribed the medication |
| `status` | ENUM | PENDING, IN_PROGRESS, DISPENSED, PARTIALLY_DISPENSED, CANCELLED, ON_HOLD |
| `source` | ENUM | openehr, manual, PHARMACY |
| `openehrorderid` | TEXT | Reference to openEHR order |
| `priority` | ENUM | routine, urgent, stat |
| `notes` | TEXT | Additional notes |
| `metadata` | JSONB | Additional metadata (medication details, clinical info, etc.) |
| `dispensedby` | UUID (FK) | User who dispensed the order |
| `dispensedat` | TIMESTAMP | When the order was dispensed |
| `dispensecompositionuid` | TEXT | OpenEHR composition UID |
| `createdat` | TIMESTAMP | Order creation timestamp |
| `updatedat` | TIMESTAMP | Last update timestamp |

**File:** `/lib/db/tables/pharmacy-orders.ts`

---

#### 2. `pharmacy_order_items`
Line items for each drug in an order.

| Column | Type | Description |
|--------|------|-------------|
| `itemid` | UUID (PK) | Unique item identifier |
| `orderid` | UUID (FK) | Parent order |
| `drugid` | UUID (FK) | Drug being ordered |
| `batchid` | UUID (FK) | Specific batch selected for dispensing |
| `dispenselocationid` | UUID (FK) | Location where item was dispensed from |
| `drugname` | TEXT | Drug name (denormalized) |
| `dosage` | TEXT | Dosage instructions |
| `quantity` | INTEGER | Quantity to dispense |
| `unitprice` | NUMERIC | Unit price |
| `status` | ENUM | PENDING, DISPENSED, CANCELLED |
| `scannedbarcode` | TEXT | Barcode scanned during dispensing |
| `scannedat` | TIMESTAMP | When barcode was scanned |
| `notes` | TEXT | Item notes (e.g., backorder info) |
| `createdat` | TIMESTAMP | Item creation timestamp |

**File:** `/lib/db/tables/pharmacy-orders.ts`

---

#### 3. `drugs`
Drug catalog for the workspace.

| Column | Type | Description |
|--------|------|-------------|
| `drugid` | UUID (PK) | Unique drug identifier |
| `workspaceid` | UUID (FK) | Workspace this drug belongs to |
| `globaldrugid` | UUID (FK) | Link to global drug catalog |
| `name` | TEXT | Drug name |
| `genericname` | TEXT | Generic drug name |
| `atccode` | TEXT | ATC classification code |
| `form` | TEXT | Form (tablet, capsule, syrup, injection) |
| `strength` | TEXT | Strength (e.g., "500 mg") |
| `unit` | TEXT | Unit (tablet, ml, vial) |
| `barcode` | TEXT | Product barcode |
| `manufacturer` | TEXT | Manufacturer name |
| `nationalcode` | TEXT | National drug code |
| `category` | TEXT | Drug category |
| `requiresprescription` | BOOLEAN | Requires prescription flag |
| `isactive` | BOOLEAN | Active status |
| `createdat` | TIMESTAMP | Creation timestamp |
| `updatedat` | TIMESTAMP | Last update timestamp |

**File:** `/lib/db/tables/pharmacy-drugs.ts`

---

#### 4. `drug_batches`
Individual batches with lot numbers and expiry dates.

| Column | Type | Description |
|--------|------|-------------|
| `batchid` | UUID (PK) | Unique batch identifier |
| `drugid` | UUID (FK) | Parent drug |
| `lotnumber` | TEXT | Lot/batch number |
| `expirydate` | DATE | Expiry date |
| `purchaseprice` | NUMERIC | Purchase price |
| `sellingprice` | NUMERIC | Selling price |
| `createdat` | TIMESTAMP | Creation timestamp |

**File:** `/lib/db/tables/pharmacy-drugs.ts`

---

#### 5. `pharmacy_stock_locations`
Physical storage locations (shelf, fridge, vault, etc.).

| Column | Type | Description |
|--------|------|-------------|
| `locationid` | UUID (PK) | Unique location identifier |
| `workspaceid` | UUID (FK) | Workspace this location belongs to |
| `name` | TEXT | Location name (e.g., "Shelf A-1", "Fridge 2") |
| `type` | TEXT | Location type (shelf, fridge, vault, cabinet) |
| `description` | TEXT | Description |
| `createdat` | TIMESTAMP | Creation timestamp |

**File:** `/lib/db/tables/pharmacy-stock.ts`

---

#### 6. `pharmacy_stock_levels`
Current inventory snapshot per drug-batch-location.

| Column | Type | Description |
|--------|------|-------------|
| `stocklevelid` | UUID (PK) | Unique stock level identifier |
| `drugid` | UUID (FK) | Drug |
| `batchid` | UUID (FK) | Batch |
| `locationid` | UUID (FK) | Storage location |
| `quantity` | INTEGER | Current quantity on hand |
| `reservedquantity` | INTEGER | Quantity reserved for pending orders |
| `updatedat` | TIMESTAMP | Last update timestamp |

**File:** `/lib/db/tables/pharmacy-stock.ts`

---

#### 7. `pharmacy_stock_movements`
Audit trail of all inventory changes.

| Column | Type | Description |
|--------|------|-------------|
| `movementid` | UUID (PK) | Unique movement identifier |
| `drugid` | UUID (FK) | Drug |
| `batchid` | UUID (FK) | Batch |
| `locationid` | UUID (FK) | Location |
| `type` | ENUM | RECEIVE, DISPENSE, ADJUST, TRANSFER, RETURN, EXPIRED |
| `quantity` | INTEGER | Quantity change (+/-) |
| `reason` | TEXT | Reason for movement |
| `referenceid` | TEXT | Reference to order or invoice |
| `performedby` | UUID (FK) | User who performed the movement |
| `createdat` | TIMESTAMP | Movement timestamp |

**File:** `/lib/db/tables/pharmacy-stock.ts`

---

#### 8. `pharmacy_invoices`
Invoices for dispensed orders.

| Column | Type | Description |
|--------|------|-------------|
| `invoiceid` | UUID (PK) | Unique invoice identifier |
| `orderid` | UUID (FK) | Related order |
| `patientid` | UUID (FK) | Patient |
| `invoicenumber` | TEXT | Invoice number |
| `subtotal` | NUMERIC | Subtotal amount |
| `discountamount` | NUMERIC | Discount amount |
| `taxamount` | NUMERIC | Tax amount |
| `totalamount` | NUMERIC | Total amount |
| `insurancecoverage` | NUMERIC | Insurance covered amount |
| `patientcopay` | NUMERIC | Patient copay amount |
| `paymentstatus` | ENUM | PENDING, PAID, PARTIAL, OVERDUE |
| `createdat` | TIMESTAMP | Creation timestamp |

**File:** `/lib/db/tables/pharmacy-invoice.ts`

---

#### 9. `pharmacy_invoice_lines`
Line items for invoices.

| Column | Type | Description |
|--------|------|-------------|
| `lineid` | UUID (PK) | Unique line identifier |
| `invoiceid` | UUID (FK) | Parent invoice |
| `drugid` | UUID (FK) | Drug |
| `drugname` | TEXT | Drug name |
| `quantity` | INTEGER | Quantity |
| `unitprice` | NUMERIC | Unit price |
| `totalprice` | NUMERIC | Total price |
| `doctorshare` | NUMERIC | Doctor's share |
| `hospitalshare` | NUMERIC | Hospital's share |

**File:** `/lib/db/tables/pharmacy-invoice.ts`

---

## API Routes

### Order Management

#### 1. List Orders
```
GET /api/d/[workspaceid]/pharmacy-orders
```

**Query Parameters:**
- `status` (optional): Filter by order status

**Response:**
```json
{
  "orders": [
    {
      "orderid": "uuid",
      "patientid": "uuid",
      "status": "PENDING",
      "source": "manual",
      "priority": "routine",
      "patientfirst": "John",
      "patientlast": "Doe",
      "items": [...],
      "totalAmount": 150.00,
      "paymentStatus": "PENDING"
    }
  ]
}
```

**File:** `/app/api/d/[workspaceid]/pharmacy-orders/route.ts`

---

#### 2. Create Order
```
POST /api/d/[workspaceid]/pharmacy-orders
```

**Request Body:**
```json
{
  "patientid": "uuid",
  "source": "manual",
  "priority": "routine",
  "notes": "Optional notes",
  "prescriberid": "uuid",
  "items": [
    {
      "drugid": "uuid",
      "drugname": "Amoxicillin 500mg",
      "dosage": "500 mg twice daily",
      "quantity": 30,
      "doseAmount": "500",
      "doseUnit": "mg",
      "route": "Oral",
      "timingDirections": "Twice daily"
    }
  ]
}
```

**Features:**
- Creates separate order per medication (clinical best practice)
- Selects optimal batch using FIFO/expiry logic
- Reserves stock for each item
- Resolves unit price from batch
- Integrates with OpenEHR if patient exists

**File:** `/app/api/d/[workspaceid]/pharmacy-orders/route.ts`

---

#### 3. Get Order Details
```
GET /api/d/[workspaceid]/pharmacy-orders/[orderid]
```

**Response:**
```json
{
  "order": {
    "orderid": "uuid",
    "status": "PENDING",
    "patient": {...},
    "items": [
      {
        "itemid": "uuid",
        "drugid": "uuid",
        "drugname": "Drug Name",
        "quantity": 30,
        "unitprice": 5.00,
        "status": "PENDING"
      }
    ],
    "invoice": {...}
  }
}
```

**File:** `/app/api/d/[workspaceid]/pharmacy-orders/[orderid]/route.ts`

---

### Dispensing

#### 4. Scan Barcode
```
POST /api/d/[workspaceid]/pharmacy-orders/[orderid]/scan
```

**Request Body:**
```json
{
  "barcode": "1234567890123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item scanned successfully",
  "item": {
    "itemid": "uuid",
    "drugname": "Drug Name",
    "scanned": true
  }
}
```

**File:** `/app/api/d/[workspaceid]/pharmacy-orders/[orderid]/scan/route.ts`

---

#### 5. Complete Dispense
```
POST /api/d/[workspaceid]/pharmacy-orders/[orderid]/dispense
```

**Features:**
- Validates all items are scanned
- Validates batch expiry before dispensing
- Checks stock availability
- Supports partial dispensing
- Deducts stock from inventory
- Creates stock movements
- Marks items/order as dispensed
- Generates invoice
- Integrates with OpenEHR

**Response (Full Dispense):**
```json
{
  "message": "Order dispensed successfully",
  "allScanned": true,
  "order": {
    "status": "DISPENSED",
    "dispensecompositionuid": "uuid"
  },
  "invoice": {...},
  "expiryWarnings": [...]
}
```

**Response (Partial Dispense):**
```json
{
  "message": "Partial dispense completed: 2 dispensed, 1 backordered",
  "allScanned": true,
  "order": {
    "status": "PARTIALLY_DISPENSED"
  },
  "dispensedCount": 2,
  "backorderedCount": 1,
  "backorderedItems": ["Drug C (need 20, have 10)"],
  "invoice": {...}
}
```

**File:** `/app/api/d/[workspaceid]/pharmacy-orders/[orderid]/dispense/route.ts`

---

#### 6. Cancel Order
```
POST /api/d/[workspaceid]/pharmacy-orders/[orderid]/cancel
```

**Features:**
- Restocks dispensed items to inventory
- Releases reserved stock for pending items
- Creates RETURN stock movements
- Marks order/items as cancelled

**Response:**
```json
{
  "message": "Order cancelled successfully - 2 items restocked - 1 reservation released",
  "order": {
    "status": "CANCELLED"
  },
  "restockedCount": 2,
  "releasedCount": 1,
  "restockedItems": ["Drug A (30 units)", "Drug B (20 units)"]
}
```

**File:** `/app/api/d/[workspaceid]/pharmacy-orders/[orderid]/cancel/route.ts`

---

### Inventory Management

#### 7. List Inventory
```
GET /api/pharmacy/inventory
```

**Query Parameters:**
- `storeid` (required): Store/warehouse ID

**Response:**
```json
{
  "items": [
    {
      "drugid": "uuid",
      "drugname": "Drug Name",
      "form": "tablet",
      "strength": "500 mg",
      "quantity": 100,
      "reservedquantity": 30,
      "availablequantity": 70,
      "storageLocationName": "Shelf A-1",
      "storageLocation": "A-1",
      "storageType": "shelf",
      "temperature": "Room Temperature"
    }
  ]
}
```

**File:** `/app/api/pharmacy/inventory/route.ts`

---

#### 8. Get Drug Batches
```
GET /api/pharmacy/items/[id]/batches
```

**Response:**
```json
{
  "batches": [
    {
      "batchid": "uuid",
      "lotnumber": "LOT12345",
      "expirydate": "2025-12-31",
      "quantity": 50,
      "sellingprice": 5.00
    }
  ]
}
```

**File:** `/app/api/pharmacy/items/[id]/batches/route.ts`

---

#### 9. Storage Locations
```
GET /api/pharmacy/storage
POST /api/pharmacy/storage
```

**Response (GET):**
```json
{
  "locations": [
    {
      "locationid": "uuid",
      "name": "Shelf A-1",
      "type": "shelf",
      "temperature": "Room Temperature",
      "description": "Main shelf"
    }
  ]
}
```

**Request Body (POST):**
```json
{
  "warehouseid": "uuid",
  "name": "Fridge 2",
  "type": "fridge",
  "temperature": "2-8°C",
  "shelf": "Top",
  "binLocation": "A1",
  "description": "Controlled drug storage"
}
```

**File:** `/app/api/pharmacy/storage/route.ts`

---

## File Structure

```
iqmed/
├── app/
│   ├── api/
│   │   ├── d/[workspaceid]/
│   │   │   └── pharmacy-orders/
│   │   │       ├── route.ts                    # List/Create orders
│   │   │       ├── [orderid]/
│   │   │       │   ├── route.ts                # Get order details
│   │   │       │   ├── dispense/
│   │   │       │   │   └── route.ts            # Complete dispense
│   │   │       │   ├── scan/
│   │   │       │   │   └── route.ts            # Scan barcode
│   │   │       │   └── cancel/
│   │   │       │       └── route.ts            # Cancel order
│   │   ├── pharmacy/
│   │   │   ├── dispense/
│   │   │   │   └── route.ts                    # Single item dispense
│   │   │   ├── inventory/
│   │   │   │   └── route.ts                    # List inventory
│   │   │   ├── items/
│   │   │   │   └── [id]/
│   │   │   │       └── batches/
│   │   │   │           └── route.ts            # Get drug batches
│   │   │   └── storage/
│   │   │       └── route.ts                    # Storage locations
│   │   └── drugs/
│   │       └── global/
│   │           └── route.ts                    # Global drug catalog
│   └── d/[workspaceid]/
│       ├── pharmacy/
│       │   ├── orders/
│       │   │   ├── orders-list.tsx             # Orders list UI
│       │   │   └── [orderid]/
│       │   │       ├── order-detail.tsx         # Order details UI
│       │   │       └── dispense/
│       │   │           └── dispense-page.tsx    # Barcode scanning UI
│       │   └── pharmacy-inventory/
│       │       └── page.tsx                    # Inventory UI
│
├── lib/
│   └── db/
│       ├── tables/
│       │   ├── pharmacy-orders.ts               # Orders & items schema
│       │   ├── pharmacy-drugs.ts                # Drugs & batches schema
│       │   ├── pharmacy-stock.ts                # Stock schema
│       │   └── pharmacy-invoice.ts              # Invoice schema
│       └── schema.ts                            # Main schema export
│
├── scripts/
│   └── migrations/
│       ├── 001-add-reserved-quantity.sql       # Stock reservation migration
│       └── 002-add-dispense-location.sql        # Location tracking migration
│
└── docs/
    └── PHARMACY_WORKFLOW.md                     # This document
```

---

## Complete Workflows

### Workflow 1: Order Creation with Stock Reservation

```
1. User creates order via UI
   ↓
2. POST /api/d/[workspaceid]/pharmacy-orders
   ↓
3. For each item:
   a. Select optimal batch (FIFO/expiry logic)
   b. Check available stock (quantity - reserved)
   c. Reserve stock if available
   d. Create order item with batchid
   e. Set unitprice from batch
   ↓
4. Create OpenEHR composition (if patient exists)
   ↓
5. Return order with status PENDING
```

**Key Files:**
- `/app/api/d/[workspaceid]/pharmacy-orders/route.ts`
- `/lib/db/tables/pharmacy-orders.ts`
- `/lib/db/tables/pharmacy-stock.ts`

**Database Changes:**
- `pharmacy_orders` - new record
- `pharmacy_order_items` - new records with batchid
- `pharmacy_stock_levels` - reservedquantity incremented

---

### Workflow 2: Barcode Scanning

```
1. Pharmacist opens dispense page
   ↓
2. User scans barcode
   ↓
3. POST /api/d/[workspaceid]/pharmacy-orders/[orderid]/scan
   ↓
4. Validate barcode matches order item
   ↓
5. Update item: scannedbarcode, scannedat
   ↓
6. Return scan result
   ↓
7. UI updates to show item scanned
```

**Key Files:**
- `/app/api/d/[workspaceid]/pharmacy-orders/[orderid]/scan/route.ts`
- `/app/d/[workspaceid]/pharmacy/orders/[orderid]/dispense/dispense-page.tsx`

**Database Changes:**
- `pharmacy_order_items` - scannedbarcode, scannedat updated

---

### Workflow 3: Complete Dispense

```
1. All items scanned → Pharmacist clicks "Complete"
   ↓
2. POST /api/d/[workspaceid]/pharmacy-orders/[orderid]/dispense
   ↓
3. Validate all items scanned
   ↓
4. For each item:
   a. Validate batch expiry (block if expired, warn if <30 days)
   b. Check stock availability
   c. If sufficient stock:
      - Deduct quantity from stock_levels
      - Release reservedquantity
      - Create DISPENSE stock movement
      - Mark item DISPENSED
      - Record dispenselocationid
   d. If insufficient stock:
      - Mark item PENDING with backorder note
   ↓
5. Determine order status:
   - DISPENSED (all items dispensed)
   - PARTIALLY_DISPENSED (some dispensed, some backordered)
   - Error (all items out of stock)
   ↓
6. Generate invoice for dispensed items
   ↓
7. Create OpenEHR medication dispense composition
   ↓
8. Return result with status, counts, warnings
```

**Key Files:**
- `/app/api/d/[workspaceid]/pharmacy-orders/[orderid]/dispense/route.ts`
- `/lib/db/tables/pharmacy-stock.ts`
- `/lib/db/tables/pharmacy-invoice.ts`

**Database Changes:**
- `pharmacy_stock_levels` - quantity decreased, reservedquantity decreased
- `pharmacy_stock_movements` - DISPENSE movements created
- `pharmacy_order_items` - status DISPENSED, dispenselocationid set
- `pharmacy_orders` - status updated to DISPENSED or PARTIALLY_DISPENSED
- `pharmacy_invoices` - new invoice created
- `pharmacy_invoice_lines` - line items created

---

### Workflow 4: Order Cancellation with Restock

```
1. User cancels order
   ↓
2. POST /api/d/[workspaceid]/pharmacy-orders/[orderid]/cancel
   ↓
3. For each item:
   a. If status DISPENSED:
      - Add quantity back to stock_levels
      - Create RETURN stock movement
      - Track which items were restocked
   b. If status PENDING:
      - Release reservedquantity
      - Track which reservations were released
   ↓
4. Mark order as CANCELLED
   ↓
5. Mark all items as CANCELLED
   ↓
6. Return result with restock/release counts
```

**Key Files:**
- `/app/api/d/[workspaceid]/pharmacy-orders/[orderid]/cancel/route.ts`
- `/lib/db/tables/pharmacy-stock.ts`

**Database Changes:**
- `pharmacy_stock_levels` - quantity increased (for dispensed items), reservedquantity decreased (for pending items)
- `pharmacy_stock_movements` - RETURN movements created
- `pharmacy_orders` - status CANCELLED
- `pharmacy_order_items` - status CANCELLED

---

## Enhanced Features

### 1. Stock Reservation

**Purpose:** Prevent overselling by reserving stock when orders are created.

**Implementation:**
- `reservedquantity` field in `pharmacy_stock_levels`
- Reserve stock on order creation
- Release reserved stock on dispense or cancellation
- Available quantity = quantity - reservedquantity

**Key Files:**
- `/lib/db/tables/pharmacy-stock.ts`
- `/app/api/d/[workspaceid]/pharmacy-orders/route.ts`
- `/app/api/d/[workspaceid]/pharmacy-orders/[orderid]/dispense/route.ts`
- `/app/api/d/[workspaceid]/pharmacy-orders/[orderid]/cancel/route.ts`

**Migration:** `/scripts/migrations/001-add-reserved-quantity.sql`

---

### 2. FIFO Batch Selection with Expiry Logic

**Purpose:** Automatically select optimal batch based on expiry dates (First In, First Out).

**Implementation:**
- `selectOptimalBatch()` helper function
- Filters expired batches
- Orders by expiry date (earliest first)
- Checks available quantity per batch
- Auto-assigns batch and price to order items

**Key Files:**
- `/lib/db/tables/pharmacy-drugs.ts`
- `/app/api/d/[workspaceid]/pharmacy-orders/route.ts`

---

### 3. Expiry Validation Before Dispensing

**Purpose:** Prevent dispensing expired medications and warn about near-expiry items.

**Implementation:**
- Validate batch expiry before dispensing
- Block expired items (400 error)
- Warn if expiring within 30 days
- Include warnings in dispense response

**Key Files:**
- `/app/api/d/[workspaceid]/pharmacy-orders/[orderid]/dispense/route.ts`

---

### 4. Location/Warehouse Tracking

**Purpose:** Track which warehouse/location each medication is dispensed from.

**Implementation:**
- `dispenselocationid` field in `pharmacy_order_items`
- Record dispense location when dispensing
- Link to stock movements for full traceability
- Enable multi-location inventory management

**Key Files:**
- `/lib/db/tables/pharmacy-orders.ts`
- `/app/api/d/[workspaceid]/pharmacy-orders/[orderid]/dispense/route.ts`

**Migration:** `/scripts/migrations/002-add-dispense-location.sql`

---

### 5. Partial Dispensing Support

**Purpose:** Allow dispensing available items while marking others as backordered.

**Implementation:**
- Check stock availability per item
- Dispense available items
- Mark insufficient items as PENDING with backorder note
- Set order status to PARTIALLY_DISPENSED
- Return dispensed/backordered counts

**Key Files:**
- `/app/api/d/[workspaceid]/pharmacy-orders/[orderid]/dispense/route.ts`

---

### 6. Restock on Cancellation

**Purpose:** Return dispensed items to inventory when orders are cancelled (returns/refunds).

**Implementation:**
- Restock dispensed items (add quantity back)
- Release reserved stock for pending items
- Create RETURN stock movements
- Track original dispense location
- Handle fully/partially dispensed orders

**Key Files:**
- `/app/api/d/[workspaceid]/pharmacy-orders/[orderid]/cancel/route.ts`

---

## Data Flow Diagrams

### Order Creation Flow

```
┌─────────────┐
│   UI Form   │
└──────┬──────┘
       │ POST /api/d/[workspaceid]/pharmacy-orders
       ▼
┌─────────────────────────────┐
│   Order Creation Handler    │
│  - Parse request body       │
│  - For each item:           │
│    ├─ Select optimal batch  │
│    ├─ Check stock avail     │
│    ├─ Reserve stock         │
│    └─ Create order item     │
│  - Create OpenEHR comp      │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────┐    ┌─────────────────┐
│   Orders    │◄───│ Order Items     │
│   Table     │    │   Table         │
└─────────────┘    └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Stock Levels    │
                   │ (reserved qty)  │
                   └─────────────────┘
```

---

### Dispense Flow

```
┌─────────────┐
│  Scan All   │
│   Items     │
└──────┬──────┘
       │ POST /api/d/[workspaceid]/pharmacy-orders/[orderid]/dispense
       ▼
┌─────────────────────────────┐
│   Dispense Handler          │
│  - Validate scanned         │
│  - Check expiry             │
│  - For each item:           │
│    ├─ Check stock           │
│    ├─ Deduct quantity       │
│    ├─ Release reserved      │
│    ├─ Create movement       │
│    └─ Mark DISPENSED        │
│  - Generate invoice         │
│  - OpenEHR integration      │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────┐    ┌─────────────────┐
│   Orders    │────│ Order Items     │
│ (status)    │    │ (status, loc)   │
└──────┬──────┘    └────────┬────────┘
       │                     │
       ▼                     ▼
┌─────────────┐    ┌─────────────────┐
│ Stock Levels│    │ Stock Movements │
│ (qty, res)  │    │ (DISPENSE)      │
└─────────────┘    └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │   Invoices      │
                   │   + Lines       │
                   └─────────────────┘
```

---

### Cancellation Flow

```
┌─────────────┐
│  Cancel     │
│  Order      │
└──────┬──────┘
       │ POST /api/d/[workspaceid]/pharmacy-orders/[orderid]/cancel
       ▼
┌─────────────────────────────┐
│   Cancel Handler            │
│  - For each item:           │
│    ├─ If DISPENSED:         │
│    │  ├─ Add qty back       │
│    │  └─ Create RETURN mvmt │
│    ├─ If PENDING:           │
│    │  └─ Release reserved    │
│  - Mark order CANCELLED     │
│  - Mark items CANCELLED     │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────┐    ┌─────────────────┐
│   Orders    │────│ Order Items     │
│ (CANCELLED) │    │ (CANCELLED)     │
└─────────────┘    └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Stock Levels    │
                   │ (qty +, res -)  │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Stock Movements │
                   │   (RETURN)      │
                   └─────────────────┘
```

---

## Status Enums

### Order Status
- `PENDING` - Order created, awaiting processing
- `IN_PROGRESS` - Dispensing in progress (items being scanned)
- `DISPENSED` - All items dispensed successfully
- `PARTIALLY_DISPENSED` - Some items dispensed, others backordered
- `CANCELLED` - Order cancelled
- `ON_HOLD` - Order on hold (manual hold)

### Item Status
- `PENDING` - Item awaiting dispensing
- `DISPENSED` - Item dispensed
- `CANCELLED` - Item cancelled

### Stock Movement Types
- `RECEIVE` - Stock received (quantity +)
- `DISPENSE` - Stock dispensed (quantity -)
- `ADJUST` - Manual adjustment (+/-)
- `TRANSFER` - Stock transferred between locations
- `RETURN` - Stock returned from cancelled order (quantity +)
- `EXPIRED` - Stock expired (quantity -)

---

## Error Handling

### Common Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid request | Missing required fields, invalid UUIDs |
| 400 | Stock insufficient | Not enough stock available |
| 400 | Batch expired | Attempting to dispense expired medication |
| 400 | All items out of stock | Cannot complete dispense |
| 401 | Unauthorized | User not authenticated |
| 404 | Order not found | Order ID doesn't exist |
| 404 | Drug not found | Drug ID doesn't exist |
| 500 | Internal error | Server error during processing |

---

## Security Considerations

1. **Authentication:** All API routes require user authentication via `getUser()`
2. **Authorization:** Workspace-based access control
3. **UUID Validation:** All UUIDs are validated before database operations
4. **SQL Injection Prevention:** Using Drizzle ORM with parameterized queries
5. **Controlled Drugs:** Witness verification for controlled drug dispensing
6. **Audit Trail:** All stock movements tracked with `performedby` field

---

## Testing Checklist

- [ ] Create order with stock reservation
- [ ] Verify reserved quantity prevents overselling
- [ ] Test FIFO batch selection
- [ ] Verify expiry validation blocks expired items
- [ ] Test near-expiry warnings
- [ ] Dispense order with all items available
- [ ] Dispense order with partial stock (backorder)
- [ ] Cancel pending order (release reservation)
- [ ] Cancel dispensed order (restock)
- [ ] Cancel partially dispensed order (restock + release)
- [ ] Verify location tracking on dispense
- [ ] Verify stock movements audit trail
- [ ] Test invoice generation
- [ ] Verify OpenEHR integration

---

## Future Enhancements

Potential improvements for future iterations:

1. **Multi-batch dispensing** - Dispense from multiple batches if single batch insufficient
2. **Auto-reorder** - Automatically create purchase orders when stock below threshold
3. **Expiry alerts** - Dashboard alerts for items expiring soon
4. **Batch recall** - Track and handle manufacturer recalls
5. **Digital signatures** - Pharmacist digital signatures for dispense verification
6. **Patient history** - View patient's medication history
7. **Drug interactions** - Check for drug interactions before dispensing
8. **Prescription validation** - Validate prescription authenticity
9. **Mobile app** - Mobile barcode scanning app
10. **Reporting** - Advanced reporting and analytics

---

## Support

For questions or issues related to the pharmacy workflow:

1. Check this documentation first
2. Review API route files for implementation details
3. Check database schema files for table structures
4. Review migration files for database changes
5. Check logs for detailed error messages

---

**Last Updated:** April 21, 2026
**Version:** 1.0.0
