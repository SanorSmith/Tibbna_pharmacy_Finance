# OpenEHR Order Status Tracking Solution

## Problem
When orders come from OpenEHR, samples are registered with `orderid: null` because they don't exist in the `lims_orders` table. Instead, they have an `openehrrequestid` field. This caused:
- Order status couldn't be updated
- Status always showed "REQUESTED" instead of "IN_PROGRESS" or "COMPLETED"

## Solution

### 1. Database Schema
OpenEHR orders are tracked via the `accession_samples` table:
- `orderid`: NULL (for OpenEHR orders)
- `openehrrequestid`: Contains the OpenEHR request ID (e.g., "testreq-1766929331085")
- Multiple samples can share the same `openehrrequestid`

### 2. Status Computation Logic
Created utility function in `lib/openehr-order-status.ts`:

**Status Rules:**
- **REQUESTED**: No samples have validation states (all pending)
- **IN_PROGRESS**: At least one sample has results entered (ANALYZED state)
- **COMPLETED**: All samples for the order have results and are ANALYZED

### 3. Backend Updates

#### Test Results API (`app/api/d/[workspaceid]/test-results/route.ts`)
- Added null check for `sample.orderid` to prevent errors
- Added OpenEHR order handling with `sample.openehrrequestid`
- Computes order status dynamically based on sample validation states
- Logs status transitions (REQUESTED → IN_PROGRESS → COMPLETED)

#### New API Endpoint
Created `app/api/d/[workspaceid]/openehr-orders/[requestid]/status/route.ts`:
- GET endpoint to retrieve computed OpenEHR order status
- Returns status based on sample validation states

### 4. Frontend Updates

#### ResultsEntryForm Component
- Added React Query cache invalidation
- Automatically refreshes worklists, samples, and validation data after saving results

## Current Status Example

For OpenEHR request `testreq-1766929331085`:
- Total samples: 5 (SMP-2026-0001 through SMP-2026-0005)
- Samples with results: 1 (SMP-2026-0005)
- **Current Status: IN_PROGRESS** ✅

Status will change to COMPLETED when all 5 samples have results entered.

## How It Works

1. **Sample Registration**: Sample created with `openehrrequestid`
2. **Results Entry**: When results are saved for a sample:
   - Sample validation state → "ANALYZED"
   - Backend checks all samples for that `openehrrequestid`
   - Computes order status based on completion percentage
   - Logs status: "IN_PROGRESS" or "COMPLETED"
3. **Status Display**: Frontend can query the status via API endpoint

## Future Enhancements

- Integrate with OpenEHR API to update composition status
- Add webhook to notify OpenEHR when order is completed
- Display computed status in Orders tab UI
- Add progress indicator (e.g., "3/5 samples complete")

## Files Modified

1. `app/api/d/[workspaceid]/test-results/route.ts` - Added OpenEHR order handling
2. `components/lab-tech/ResultsEntryForm.tsx` - Added React Query cache invalidation
3. `lib/openehr-order-status.ts` - New utility for status computation
4. `app/api/d/[workspaceid]/openehr-orders/[requestid]/status/route.ts` - New API endpoint

## Testing

Run the status check script:
```bash
node scripts/update-openehr-order-status.js
```

This will show:
- All samples for the OpenEHR request
- Validation state of each sample
- Computed order status
