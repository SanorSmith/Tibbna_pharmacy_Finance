---
description: Complete partial dispensing workflow for pharmacy orders and POS system
---

# Partial Dispensing Workflow

## Overview
This workflow covers the complete partial dispensing process from prescription creation to final dispensing, including pharmacy order management and POS checkout integration.

## Prerequisites
- SQL migration applied: `quantitydispensed` column added to `pharmacy_order_items`
- POS system configured with partial dispensing logic
- Pharmacy orders table updated to show remaining quantities

## Workflow Steps

### 1. Prescription Creation
**Trigger:** New prescription entered by prescriber
**Action:** Create pharmacy order with initial status
```sql
INSERT INTO pharmacy_order_items (
  orderid, drugid, drugname, quantity, quantitydispensed, status
) VALUES (
  'order-uuid', 'drug-uuid', 'Drug Name', 5, 0, 'PENDING'
)
```

### 2. Pharmacy Order Display
**Location:** Pharmacy Orders page (`/d/[workspaceid]/pharmacy/dashboard?tab=orders`)
**Behavior:**
- Shows remaining quantity to dispense: `(quantity - quantitydispensed)`
- Example: "Drug Name (3)" when 5 prescribed, 2 dispensed
- Status badges: PENDING, PARTIALLY_DISPENSED, DISPENSED

### 3. First Partial Dispense
**Trigger:** Pharmacy staff dispenses partial quantity via POS
**Steps:**
1. Navigate to POS with order ID
2. Add partial quantity to cart (e.g., 2 of 5 units)
3. Complete checkout
4. System updates `quantitydispensed` and status

**Backend Logic:**
```typescript
// Calculate new dispensed quantity
const currentDispensed = orderItem.quantitydispensed || 0;
const newDispensedQty = currentDispensed + cartItem.quantity;
const totalQty = orderItem.quantity;

// Determine status
let itemStatus: PharmacyItemStatus;
if (newDispensedQty >= totalQty) {
  itemStatus = PHARMACY_ITEM_STATUS.DISPENSED;
} else if (newDispensedQty > 0) {
  itemStatus = PHARMACY_ITEM_STATUS.PARTIALLY_DISPENSED;
} else {
  itemStatus = PHARMACY_ITEM_STATUS.PENDING;
}
```

### 4. Status Updates
**Database Changes:**
```sql
UPDATE pharmacy_order_items 
SET 
  quantitydispensed = 2,
  status = 'PARTIALLY_DISPENSED',
  updatedat = NOW()
WHERE itemid = 'item-uuid';
```

**UI Updates:**
- Pharmacy orders table shows: "Drug Name (3)" (remaining 3)
- Status badge changes to: "Partial" with warning icon
- Item remains available for additional dispensing

### 5. Additional Partial Dispenses
**Process:** Repeat steps 3-4 for remaining quantities
**Example Flow:**
- Initial: 5 prescribed, 0 dispensed → Status: PENDING
- First: 5 prescribed, 2 dispensed → Status: PARTIALLY_DISPENSED, Display: (3)
- Second: 5 prescribed, 4 dispensed → Status: PARTIALLY_DISPENSED, Display: (1)
- Final: 5 prescribed, 5 dispensed → Status: DISPENSED, Display: (0)

### 6. Complete Dispense
**Trigger:** Final quantity dispensed (quantitydispensed >= quantity)
**Actions:**
- Status changes to "DISPENSED"
- Item no longer appears in POS prescription items
- Pharmacy orders shows: "Drug Name (0)" or removes from display

## POS Integration Details

### Prescription Items Filtering
**File:** `app/d/[workspaceid]/pos/components/PrescriptionItems.tsx`
**Logic:** Filter out already DISPENSED and PARTIALLY_DISPENSED items
```typescript
const items = (order.items || []).filter(
  (item) => !["DISPENSED", "PARTIALLY_DISPENSED"].includes(item.status?.toUpperCase())
);
```

### Cart Quantity Limits
**Behavior:** POS prevents adding more than remaining quantity
**Calculation:** `maxQuantity = quantity - quantitydispensed`

### Checkout Process
**File:** `app/api/pos/checkout/complete/route.ts`
**Logic:** Transactional update of dispensing status
```typescript
// Update pharmacy order items with partial dispense tracking
for (const cartItem of data.items) {
  // Calculate and update quantitydispensed
  // Set appropriate status based on dispensed vs total
}
```

## UI Components and Behaviors

### Pharmacy Orders Table
**Location:** `app/d/[workspaceid]/pharmacy/orders/orders-list.tsx`
**Display Logic:** Shows remaining quantity to dispense
```typescript
{item.drugname} ({(item.quantity || 0) - (item.quantitydispensed || 0)})
```

### Status Badge Configuration
```typescript
const STATUS_CONFIG = {
  PENDING: { icon: Clock, variant: "secondary", label: "Pending" },
  PARTIALLY_DISPENSED: { icon: AlertCircle, variant: "outline", label: "Partial" },
  DISPENSED: { icon: CheckCircle2, variant: "default", label: "Dispensed" },
  CANCELLED: { icon: XCircle, variant: "destructive", label: "Cancelled" }
};
```

### Patient Search Dialog Fix
**Files:** 
- `app/d/[workspaceid]/pos/components/SearchBar.tsx`
- `app/d/[workspaceid]/pharmacy/orders/components/CreateOrderModal.tsx`
**Fix:** Only show search dialog with 2+ characters
```typescript
onFocus={() => query.length >= 2 && setShowResults(true)}
```

## Error Handling

### Database Constraints
- `quantitydispensed` defaults to 0 for new items
- Status validation ensures proper transitions
- Transactional updates prevent data inconsistency

### UI Validation
- POS prevents over-dispensing
- Search dialogs require minimum input
- Status updates reflect real-time changes

## Testing Scenarios

### Test Case 1: Single Partial Dispense
1. Create prescription for 5 units
2. Dispense 2 units via POS
3. Verify status: PARTIALLY_DISPENSED
4. Verify display: "Drug Name (3)"

### Test Case 2: Multiple Partial Dispenses
1. Create prescription for 10 units
2. Dispense 3 units → Status: PARTIALLY_DISPENSED, Display: (7)
3. Dispense 4 units → Status: PARTIALLY_DISPENSED, Display: (3)
4. Dispense 3 units → Status: DISPENSED, Display: (0)

### Test Case 3: Complete Dispense
1. Create prescription for 3 units
2. Dispense 3 units in single transaction
3. Verify status: DISPENSED
4. Verify item removed from POS prescription items

## Troubleshooting

### Common Issues
1. **Status not updating:** Check SQL migration applied
2. **Wrong quantities:** Verify `quantitydispensed` field values
3. **Items still appearing:** Check status filtering logic
4. **Search dialog appearing:** Verify character count validation

### Debug Queries
```sql
-- Check quantitydispensed values
SELECT itemid, drugname, quantity, quantitydispensed, status 
FROM pharmacy_order_items 
WHERE orderid = 'order-uuid';

-- Verify status distribution
SELECT status, COUNT(*) 
FROM pharmacy_order_items 
GROUP BY status;
```

## Performance Considerations
- Database indexes on `quantitydispensed` and `status` fields
- Efficient filtering in POS components
- Minimal UI re-renders with proper React keys

## Future Enhancements
- Batch-level partial dispensing
- Expiration date tracking for partial dispenses
- Patient notification system for partial dispensing
- Reporting on partial dispensing patterns
