# Drug ID to Price: Table & Field Connections

## Connection Chain Overview
```
pharmacy.drugs → pharmacy.pharmacy_order_items → inventory.items → inventory.item_batches
```

---

## 1. PHARMACY SCHEMA - Drug Identity

### Table: `pharmacy.drugs`
| Field | Value | Purpose |
|-------|-------|---------|
| **drugid** | `48b3de80-c1d5-4309-9284-ae49e00b397c` | Primary key - Drug identifier |
| **name** | `ILoprost (as trometamol) /1ml` | Drug name (used for cross-schema lookup) |
| **workspaceid** | `fa9fb036-a7eb-49af-890c-54406dad139d` | Workspace filter |
| **genericname** | `ILoprost (as trometamol) /` | Generic name |

---

## 2. PHARMACY SCHEMA - Order Items (Missing Price)

### Table: `pharmacy.pharmacy_order_items`
| Field | Value | Connection |
|-------|-------|------------|
| **itemid** | `e84850ad-3895-4d9f-a1a8-ac5534f8b75b` | Order item primary key |
| **orderid** | `a14271a3-ff11-417b-bf5c-d15dd77c8d29` | Links to pharmacy_orders |
| **drugid** | `48b3de80-c1d5-4309-9284-ae49e00b397c` | **→ pharmacy.drugs.drugid** |
| **drugname** | `ILoprost (as trometamol) /1ml` | Duplicate name (redundant) |
| **unitprice** | `null` | ❌ **NO PRICE STORED HERE** |
| **quantity** | `2` | Order quantity |
| **quantitydispensed** | `2` | Dispensed quantity |

---

## 3. PHARMACY SCHEMA - Batch Prices (EMPTY)

### Table: `pharmacy.drug_batches`
| Field | Value | Status |
|-------|-------|--------|
| **drugid** | `48b3de80-c1d5-4309-9284-ae49e00b397c` | ❌ **NO RECORDS** |
| **sellingprice** | - | ❌ **EMPTY TABLE** |
| **purchaseprice** | - | ❌ **EMPTY TABLE** |

---

## 4. INVENTORY SCHEMA - Item Bridge (by Name)

### Table: `inventory.items`
| Field | Value | Connection |
|-------|-------|------------|
| **id** | `61431a56-1847-44b5-b8e3-511244bb0710` | Primary key - Item identifier |
| **name** | `ILoprost (as trometamol) /1ml` | **← pharmacy.drugs.name** (Bridge by name) |
| **warehouse_id** | `22222222-0000-0000-0000-000000000002` | Warehouse location |

---

## 5. INVENTORY SCHEMA - Actual Price Data

### Table: `inventory.item_batches`
| Field | Value | Connection |
|-------|-------|------------|
| **id** | `92da69b1-01be-4f88-b6b6-634a166d1c9e` | Batch primary key |
| **item_id** | `61431a56-1847-44b5-b8e3-511244bb0710` | **→ inventory.items.id** |
| **selling_price** | `10000.00` | ✅ **THE REAL PRICE!** |
| **quantity** | `100` | Stock quantity |
| **warehouse_id** | `22222222-0000-0000-0000-000000000002` | Warehouse location |

---

## 6. MISSING CONNECTION - Pharmacy Stock Levels

### Table: `pharmacy.pharmacy_stock_levels`
| Field | Value | Status |
|-------|-------|--------|
| **drugid** | `48b3de80-c1d5-4309-9284-ae49e00b397c` | ❌ **NO RECORDS** |
| **batchid** | - | ❌ **EMPTY TABLE** |

---

## Connection Flow Diagram

```
┌─────────────────┐    drugid    ┌──────────────────────┐
│ pharmacy.drugs  │◄──────────────►│ pharmacy_order_items │
│                 │               │                      │
│ drugid          │               │ drugid              │
│ name            │◄─name──────►│ drugname            │
│ workspaceid     │               │ unitprice (null)    │
└─────────────────┘               └──────────────────────┘
         │                                   │
         │ name                              │
         ▼                                   ▼
┌─────────────────┐               ┌──────────────────────┐
│ inventory.items │◄──────────────►│ pharmacy.drug_batches │
│                 │               │                      │
│ id              │               │ drugid              │
│ name            │◄─name──────►│ sellingprice (null)   │
│ warehouse_id    │               │ (EMPTY TABLE)        │
└─────────────────┘               └──────────────────────┘
         │
         │ item_id
         ▼
┌─────────────────┐
│ inventory.item_ │
│ batches         │
│                 │
│ id              │
│ item_id         │◄─────────────┐
│ selling_price   │ ✅ 10000.00 │
│ quantity        │              │
│ warehouse_id    │              │
└─────────────────┘              │
                                 │
                    ┌──────────────────────┐
                    │ pharmacy.stock_levels │
                    │                      │
                    │ drugid              │◄─────┐
                    │ batchid             │       │
                    │ quantity            │       │
                    │ (EMPTY TABLE)      │       │
                    └──────────────────────┘       │
                                                    │
┌─────────────────────────────────────────────────────┼─────────────────┐
│                    API BRIDGE LOGIC                                   │
│                                                                             │
│ pharmacy_order_items.drugname → items.name → item_batches.selling_price │
│                                                                             │
│ This is why I added `inventorySellingPrice` to the APIs!                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Summary of Missing Links

1. **pharmacy.drug_batches** - ❌ EMPTY (no batch prices)
2. **pharmacy.pharmacy_order_items.unitprice** - ❌ NULL (no price stored)
3. **pharmacy.pharmacy_stock_levels** - ❌ EMPTY (no stock levels)
4. **inventory.item_batches.selling_price** - ✅ 10000.00 (THE PRICE!)

## The Fix

**API Bridge**: `inventorySellingPrice` field added to both APIs:
```sql
SELECT ib.selling_price as inventorySellingPrice
FROM items i
JOIN item_batches ib ON ib.item_id = i.id
WHERE i.name = pharmacy_order_items.drugname
```

This bridges the gap between pharmacy and inventory schemas using **drug name** as the connection key.
