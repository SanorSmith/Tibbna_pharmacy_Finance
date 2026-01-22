# Implementation Guide: Multiple Test Groups & Edit/Cancel Orders

## Overview
This guide documents the implementation of two key features for the EHR test ordering system:
1. **Multiple Test Group Selection** - Allow doctors to select multiple test groups/tests within the same laboratory type per order
2. **Edit/Cancel Orders** - Allow doctors to edit or cancel test orders after creation

## What Has Been Implemented

### 1. Enhanced Lab Order Form with Multiple Selection
**File Created:** `/components/shared/EnhancedLabOrderFormMultiple.tsx`

**Key Features:**
- ✅ Select multiple test groups from the same laboratory type (e.g., multiple Biochemistry packages)
- ✅ Visual indication of selected groups with ability to remove individual selections
- ✅ Automatic test aggregation from all selected groups (duplicates removed)
- ✅ Review and customize individual tests from all selected groups
- ✅ Sample collection recommendations based on all selected tests
- ✅ Edit mode support for modifying existing orders
- ✅ Fasting requirements detection across all selected tests

**State Management:**
```typescript
interface TestOrderForm {
  target_lab: string;
  selectedPackages: string[];  // Changed from single to array
  selectedTests: string[];
  clinical_indication: string;
  urgency: "routine" | "urgent" | "stat";
  // ... other fields
}
```

**Key Actions:**
- `TOGGLE_PACKAGE` - Add/remove test groups (automatically manages associated tests)
- `TOGGLE_TEST` - Customize individual test selection
- `LOAD_DATA` - Load existing order data for editing

### 2. API Endpoints for Order Management
**File Created:** `/app/api/d/[workspaceid]/patients/[patientid]/test-orders/[orderid]/route.ts`

**Endpoints:**

#### PATCH - Update Order
```typescript
PATCH /api/d/[workspaceid]/patients/[patientid]/test-orders/[orderid]
Body: { testOrder: { /* updated order data */ } }
```
- Updates existing test order in OpenEHR
- Only accessible to doctors
- Validates workspace access

#### DELETE - Cancel Order
```typescript
DELETE /api/d/[workspaceid]/patients/[patientid]/test-orders/[orderid]?reason=...
```
- Cancels test order in OpenEHR
- Only accessible to doctors
- Requires cancellation reason (optional query param)

## Integration Steps Required

### Step 1: Update OrdersTab Component
**File to Modify:** `/app/d/[workspaceid]/patients/[patientid]/components/OrdersTab.tsx`

Add the following imports:
```typescript
import EnhancedLabOrderFormMultiple from "@/components/shared/EnhancedLabOrderFormMultiple";
import { Edit, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
```

Add state variables:
```typescript
const [editingOrder, setEditingOrder] = useState<TestOrderRecord | null>(null);
const [showEditForm, setShowEditForm] = useState(false);
const [showCancelDialog, setShowCancelDialog] = useState(false);
const [orderToCancel, setOrderToCancel] = useState<TestOrderRecord | null>(null);
const [cancelReason, setCancelReason] = useState("");
const [isCancelling, setIsCancelling] = useState(false);
```

Add handler functions:
```typescript
// Handle edit order
const handleEditOrder = (order: TestOrderRecord) => {
  setEditingOrder(order);
  setShowEditForm(true);
};

// Handle update order
const handleUpdateOrder = async (formData: any) => {
  if (!editingOrder) return;
  
  try {
    const response = await fetch(
      `/api/d/${workspaceid}/patients/${patientid}/test-orders/${editingOrder.composition_uid}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testOrder: formData }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update order");
    }

    setShowEditForm(false);
    setEditingOrder(null);
    loadTestOrders(true); // Refresh list
  } catch (error) {
    console.error(error);
    alert(error instanceof Error ? error.message : "Failed to update order");
    throw error;
  }
};

// Handle cancel order
const handleCancelOrder = async () => {
  if (!orderToCancel) return;
  
  setIsCancelling(true);
  try {
    const response = await fetch(
      `/api/d/${workspaceid}/patients/${patientid}/test-orders/${orderToCancel.composition_uid}?reason=${encodeURIComponent(cancelReason || "Cancelled by doctor")}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to cancel order");
    }

    setShowCancelDialog(false);
    setOrderToCancel(null);
    setCancelReason("");
    loadTestOrders(true); // Refresh list
  } catch (error) {
    console.error(error);
    alert(error instanceof Error ? error.message : "Failed to cancel order");
  } finally {
    setIsCancelling(false);
  }
};
```

Update the Actions column in the table:
```typescript
<td className="p-3">
  <div className="flex items-center gap-2">
    <Button 
      size="sm" 
      variant="outline" 
      onClick={() => { setSelectedTestOrder(order); setShowTestOrderDetails(true); }}
    >
      Details
    </Button>
    <Button 
      size="sm" 
      variant="outline"
      className="bg-blue-100 hover:bg-blue-200"
      onClick={() => handleEditOrder(order)}
    >
      <Edit className="h-3 w-3 mr-1" />
      Edit
    </Button>
    <Button 
      size="sm" 
      variant="outline"
      className="bg-red-100 hover:bg-red-200 text-red-700"
      onClick={() => { setOrderToCancel(order); setShowCancelDialog(true); }}
    >
      <Trash2 className="h-3 w-3 mr-1" />
      Cancel
    </Button>
  </div>
</td>
```

Replace the form dialog with:
```typescript
{/* Edit/Create Form Dialog - Using Multiple Selection Component */}
<EnhancedLabOrderFormMultiple
  open={showEditForm || showTestOrderForm}
  onOpenChange={(open) => {
    if (showEditForm) {
      setShowEditForm(open);
      if (!open) setEditingOrder(null);
    } else {
      setShowTestOrderForm(open);
    }
  }}
  onSubmit={showEditForm ? handleUpdateOrder : handleSubmitOrder}
  editMode={showEditForm}
  initialData={editingOrder}
/>

{/* Cancel Confirmation Dialog */}
<AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Cancel Test Order</AlertDialogTitle>
      <AlertDialogDescription>
        Are you sure you want to cancel this test order? This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <div className="py-4">
      <Label htmlFor="cancel-reason">Reason for Cancellation (Optional)</Label>
      <Textarea
        id="cancel-reason"
        value={cancelReason}
        onChange={(e) => setCancelReason(e.target.value)}
        placeholder="Enter reason for cancelling this order..."
        className="mt-2"
      />
    </div>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={() => { setCancelReason(""); setOrderToCancel(null); }}>
        Keep Order
      </AlertDialogCancel>
      <AlertDialogAction
        onClick={handleCancelOrder}
        disabled={isCancelling}
        className="bg-red-600 hover:bg-red-700"
      >
        {isCancelling ? "Cancelling..." : "Cancel Order"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Step 2: Implement OpenEHR Update/Delete Functions
**File to Modify:** `/lib/openehr/openehr.ts`

Add these functions:
```typescript
/**
 * Update an existing OpenEHR composition
 */
export async function updateOpenEHRComposition(
  compositionUid: string,
  updatedData: any
): Promise<any> {
  // Implementation depends on your OpenEHR setup
  // This should update the composition with new data
  const response = await fetch(`${OPENEHR_BASE_URL}/composition/${compositionUid}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      // Add authentication headers
    },
    body: JSON.stringify(updatedData),
  });
  
  if (!response.ok) {
    throw new Error('Failed to update composition');
  }
  
  return response.json();
}

/**
 * Delete/Cancel an OpenEHR composition
 */
export async function deleteOpenEHRComposition(
  compositionUid: string,
  reason: string
): Promise<any> {
  // Implementation depends on your OpenEHR setup
  // This should mark the composition as cancelled
  const response = await fetch(`${OPENEHR_BASE_URL}/composition/${compositionUid}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      // Add authentication headers
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to cancel composition');
  }
  
  return response.json();
}
```

### Step 3: Update EnhancedOrdersTab (if using that version)
**File to Modify:** `/app/d/[workspaceid]/patients/[patientid]/components/EnhancedOrdersTab.tsx`

Apply the same changes as Step 1 to this component.

## Usage Examples

### Creating Order with Multiple Test Groups

1. Doctor selects "Biochemistry" laboratory
2. Doctor selects multiple test groups:
   - ✅ Liver Function Tests (8 tests)
   - ✅ Kidney Function Tests (3 tests)
   - ✅ Lipid Profile & Glucose Tests (8 tests)
3. System automatically aggregates 19 unique tests
4. Doctor can review and deselect specific tests if needed
5. Doctor fills clinical indication and submits
6. **Result:** Single order with 19 tests from 3 different groups

### Editing an Existing Order

1. Doctor clicks "Edit" button on an order
2. Form opens in edit mode with pre-filled data
3. Doctor can:
   - Add/remove test groups
   - Add/remove individual tests
   - Update clinical indication
   - Change urgency level
4. Doctor clicks "Update Order"
5. **Result:** Order is updated in OpenEHR

### Cancelling an Order

1. Doctor clicks "Cancel" button on an order
2. Confirmation dialog appears
3. Doctor optionally enters cancellation reason
4. Doctor confirms cancellation
5. **Result:** Order is marked as cancelled in OpenEHR

## Benefits

### For Doctors:
- ✅ **Efficiency:** Order multiple related test groups in one submission
- ✅ **Flexibility:** Mix and match tests from different groups within same lab type
- ✅ **Correction:** Edit orders if wrong tests were selected
- ✅ **Control:** Cancel orders that are no longer needed

### For System:
- ✅ **Data Integrity:** All tests from same lab type in single order
- ✅ **Audit Trail:** Edit and cancel actions logged in OpenEHR
- ✅ **Consistency:** Single order = single sample collection = single result set

## Testing Checklist

- [ ] Create order with single test group
- [ ] Create order with multiple test groups (2-3 groups)
- [ ] Verify no duplicate tests when groups overlap
- [ ] Edit order to add more test groups
- [ ] Edit order to remove test groups
- [ ] Edit order to change clinical indication
- [ ] Cancel order with reason
- [ ] Cancel order without reason
- [ ] Verify only doctors can edit/cancel
- [ ] Verify workspace access control
- [ ] Test with different laboratory types (Hematology, Biochemistry, etc.)
- [ ] Verify fasting requirements shown correctly for multiple groups

## Notes

- The original single-selection form (`EnhancedLabOrderForm.tsx`) is preserved for backward compatibility
- The new form (`EnhancedLabOrderFormMultiple.tsx`) can be used as a drop-in replacement
- Edit/Cancel functionality requires proper OpenEHR API implementation
- All actions are restricted to doctors only for security
- Cancellation creates an audit trail with optional reason

## Next Steps

1. Implement `updateOpenEHRComposition` and `deleteOpenEHRComposition` functions in `/lib/openehr/openehr.ts`
2. Update OrdersTab component with edit/cancel buttons and handlers
3. Test thoroughly with different scenarios
4. Deploy to staging environment
5. Train doctors on new functionality
