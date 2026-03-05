# LIMS Status Migration Script

## Overview
This script updates existing orders and samples to their correct statuses based on their current workflow state. It applies the same business rules as the automated status transition service.

## Purpose
When the automated status transition system was implemented, it only affects **new** orders and samples created after the implementation. This migration script brings **existing** orders and samples up to date.

## What It Does

### Order Status Updates
The script analyzes each order and updates its status based on:

1. **REQUESTED** - Order has no samples yet
2. **ACCEPTED** - Order has samples that are RECEIVED or IN_STORAGE
3. **IN_PROGRESS** - Order has samples that are IN_PROCESS or ANALYZED
4. **COMPLETED** - All samples for the order have status ANALYZED (results released)
5. **CANCELLED** - No change (skipped)

### Sample Status Updates
The script analyzes each sample and updates its status based on:

1. **RECEIVED** - Default state, no change needed
2. **IN_PROCESS** - Sample is assigned to a worklist
3. **ANALYZED** - Sample has validation state RELEASED (results released)
4. **DISPOSED** - No change (skipped)

### Audit Trail
For each sample update, the script creates:
- Status history entry
- Audit log entry
- Timestamp updates

## Usage

### 1. Preview Changes (Dry Run)
**Always run this first** to see what changes will be made:

```bash
npx tsx scripts/migrate-lims-statuses.ts --dry-run
```

or simply:

```bash
npx tsx scripts/migrate-lims-statuses.ts
```

This will show you:
- How many orders will be updated
- How many samples will be updated
- What status changes will occur
- Any potential errors

### 2. Apply Changes
After reviewing the dry run output, apply the changes:

```bash
npx tsx scripts/migrate-lims-statuses.ts --apply
```

## Example Output

```
============================================================
LIMS Status Migration Script
============================================================
Mode: DRY RUN (Preview Only)
============================================================

📋 Step 1: Analyzing Orders...

Found 150 orders to analyze

Orders requiring updates: 45

[DRY RUN] Order abc-123: REQUESTED → IN_PROGRESS
  Reason: Samples are being processed
[DRY RUN] Order def-456: IN_PROGRESS → COMPLETED
  Reason: All samples have released results

🧪 Step 2: Analyzing Samples...

Found 300 samples to analyze

Samples requiring updates: 78

[DRY RUN] Sample S-2024-001: RECEIVED → IN_PROCESS
  Reason: Sample is on a worklist
[DRY RUN] Sample S-2024-002: IN_PROCESS → ANALYZED
  Reason: Results have been released

============================================================
Migration Summary
============================================================
Orders analyzed: 150
Orders updated: 45 (would be updated)
Samples analyzed: 300
Samples updated: 78 (would be updated)
Errors: 0
============================================================

ℹ️  This was a DRY RUN. No changes were made to the database.
ℹ️  Run with --apply flag to apply these changes.
```

## Safety Features

1. **Dry Run by Default** - Must explicitly use `--apply` to make changes
2. **Transaction Support** - Sample updates are atomic
3. **Error Handling** - Errors don't stop the entire migration
4. **Audit Trail** - All changes are logged
5. **Skip Completed** - Won't modify COMPLETED, CANCELLED, ANALYZED, or DISPOSED statuses

## Business Rules Applied

### Order Status Logic
```
IF all samples ANALYZED → COMPLETED
ELSE IF any sample IN_PROCESS or ANALYZED → IN_PROGRESS
ELSE IF any sample RECEIVED or IN_STORAGE → ACCEPTED
ELSE → REQUESTED
```

### Sample Status Logic
```
IF validation state is RELEASED → ANALYZED
ELSE IF on a worklist → IN_PROCESS
ELSE → No change
```

## When to Run

Run this script:
- ✅ After implementing automated status transitions
- ✅ After data imports from legacy systems
- ✅ After manual database corrections
- ✅ When status inconsistencies are detected

Do NOT run this script:
- ❌ During active testing/processing hours
- ❌ Without reviewing dry-run output first
- ❌ If you're unsure about the current state

## Troubleshooting

### Script Won't Run
```bash
# Make sure you have tsx installed
npm install -D tsx

# Or use ts-node
npx ts-node scripts/migrate-lims-statuses.ts --dry-run
```

### Database Connection Errors
- Check your `.env` file has correct database credentials
- Ensure database is running and accessible

### Unexpected Results
- Review the dry-run output carefully
- Check individual orders/samples manually
- Verify validation states are correct

## Rollback

If you need to undo changes:
1. The script creates audit logs for all changes
2. Check `sample_status_history` table for previous statuses
3. Manually revert using SQL or create a reverse migration script

## Support

For issues or questions:
1. Check the audit logs: `sample_accession_audit_log` table
2. Review status history: `sample_status_history` table
3. Check console output for error messages
4. Contact system administrator

## Related Documentation
- `docs/LIMS_AUTOMATED_STATUS_TRANSITIONS.md` - Automated transition system
- `lib/lims/status-transition-service.ts` - Status transition service code
