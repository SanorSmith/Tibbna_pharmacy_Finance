# LIMS Automated Status Transitions

## Overview
This document describes the automated status transition system implemented for the LIMS module. The system automatically manages order and sample status changes based on workflow events, ensuring data consistency and reducing manual status updates.

## Implementation Date
February 19, 2026

## Status Transition Service
**Location:** `lib/lims/status-transition-service.ts`

A centralized service that handles all automated status transitions with proper validation, audit logging, and error handling.

## Automated Transitions Implemented

### 1. Order: REQUESTED → ACCEPTED ✅
**Trigger:** When a sample is accessioned (collected)  
**Location:** `app/api/lims/accession/route.ts`  
**Business Rule:** Lab accepts the order when sample collection is confirmed

**Implementation:**
```typescript
StatusTransitionService.acceptOrder({
  orderid: orderId,
  acceptedby: user.userid,
  workspaceid: workspaceId,
  reason: "Sample collected and accessioned",
});
```

**Validation:**
- Order must be in REQUESTED status
- Order must exist
- Only applies to local LIMS orders (UUID-based), not OpenEHR orders

---

### 2. Order: ACCEPTED → IN_PROGRESS ✅
**Trigger:** When a sample is accessioned (immediately after acceptance)  
**Location:** `app/api/lims/accession/route.ts`  
**Business Rule:** Order processing starts when sample is available for testing

**Implementation:**
```typescript
StatusTransitionService.startOrderProcessing({
  orderid: orderId,
  sampleid: result.sampleid,
  userid: user.userid,
});
```

**Validation:**
- Order must be in REQUESTED or ACCEPTED status
- Sample must be successfully accessioned
- Only applies to local LIMS orders

---

### 3. Order: IN_PROGRESS → COMPLETED ✅
**Trigger:** When all test results for all samples are released  
**Location:** `lib/lims/validation-service.ts` (in `releaseResults` method)  
**Business Rule:** Order is complete when all samples have analyzed results

**Implementation:**
```typescript
StatusTransitionService.checkAndCompleteOrder({
  orderid: sample.orderid,
  userid: userid,
});
```

**Validation:**
- Order must be in IN_PROGRESS status
- All samples for the order must have status ANALYZED (results released)
- At least one sample must exist for the order

---

### 4. Sample: RECEIVED → IN_PROCESS ✅
**Trigger:** When a sample is added to a worklist  
**Location:** `app/api/lims/worklists/[worklistid]/items/route.ts`  
**Business Rule:** Sample processing begins when assigned to a worklist

**Implementation:**
```typescript
StatusTransitionService.startSampleProcessing({
  sampleid: sampleid,
  userid: user.userid,
  worklistid: worklistid,
});
```

**Validation:**
- Sample must be in RECEIVED or IN_STORAGE status
- Sample must exist
- Creates status history and audit log entries

---

### 5. Sample: IN_PROCESS → ANALYZED (COMPLETED) ✅
**Trigger:** When results are released (validated and approved)  
**Location:** `lib/lims/validation-service.ts` (already implemented)  
**Business Rule:** Sample is analyzed when all results are validated and released

**Implementation:**
This was already implemented in the ValidationService.releaseResults() method:
```typescript
await tx.update(accessionSamples)
  .set({
    currentstatus: SAMPLE_STATUS.ANALYZED,
    updatedat: new Date(),
  })
  .where(eq(accessionSamples.sampleid, sampleid));
```

---

## Workflow Diagram

```
ORDER LIFECYCLE:
REQUESTED → ACCEPTED → IN_PROGRESS → COMPLETED
    ↓           ↓            ↓            ↓
  Created   Sample      Sample on    All results
            collected   worklist     released

SAMPLE LIFECYCLE:
RECEIVED → IN_PROCESS → ANALYZED
    ↓           ↓           ↓
  Accessioned  Added to   Results
               worklist   released
```

## Error Handling

All automated transitions include:
- **Try-catch blocks** to prevent workflow failures
- **Console logging** for debugging and audit trails
- **Non-blocking errors** - transitions failures don't stop the main operation
- **Validation checks** before attempting transitions
- **Transaction support** for data consistency

## Audit Trail

Each transition creates:
1. **Status history records** (for samples)
2. **Audit log entries** (for samples)
3. **Console logs** for monitoring
4. **Updated timestamps** on affected records

## Testing Checklist

- [ ] Create a new order (status: REQUESTED)
- [ ] Accession a sample for the order
  - [ ] Verify order status changes to ACCEPTED
  - [ ] Verify order status changes to IN_PROGRESS
- [ ] Add sample to a worklist
  - [ ] Verify sample status changes to IN_PROCESS
- [ ] Enter test results for the sample
- [ ] Validate and release results
  - [ ] Verify sample status changes to ANALYZED
  - [ ] Verify order status changes to COMPLETED (if all samples done)
- [ ] Check audit logs and status history tables

## Database Tables Affected

- `lims_orders` - Order status updates
- `accession_samples` - Sample status updates
- `sample_status_history` - Status change history
- `sample_accession_audit_log` - Audit trail

## Future Enhancements

1. **Notification System**: Send notifications on status changes
2. **Webhook Support**: Trigger external systems on status transitions
3. **Rollback Support**: Ability to revert status changes if needed
4. **Status Transition Rules Engine**: Configurable business rules
5. **Dashboard Metrics**: Track transition times and bottlenecks

## Notes

- OpenEHR orders have separate status management through the OpenEHR API
- All transitions are idempotent - calling them multiple times is safe
- Transitions validate current status before making changes
- The service is designed to be extensible for future status transitions
