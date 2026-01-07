# LIMS Laboratory Workflow

## Complete Sample Processing Workflow

### 1. Sample Collection ✅ (Implemented)
**Location:** Orders Tab → Order Detail → Collect Samples

**Process:**
- Lab technician views pending orders
- Clicks on order to view details
- Clicks "Collect Samples" button
- Fills in sample collection form:
  - Sample type (Blood, Urine, Serum, etc.)
  - Container type (Vacutainer, Tube, etc.)
  - Volume and unit
  - Collection date/time
  - Collector name (auto-filled from user)
  - Location (auto-filled as "Laboratory")
- Sample is registered with:
  - Unique sample number (e.g., SMP-2025-0001)
  - Barcode for tracking
  - QR code payload
  - Links to order and patient
- **Order status changes:** REQUESTED → IN_PROGRESS

### 2. Sample Detail View ✅ (Implemented)
**Location:** Sample Accessioning Tab → Click on any sample row

**Features:**
- View complete sample information:
  - Sample number, type, container, status, barcode
  - Patient name and ID
  - Order ID
  - Collection and accession dates
- Available actions:
  - Move to Storage
  - Add to Worklist
  - Print Barcode
  - Print QR Code

### 3. Sample Storage ✅ (Implemented)
**Location:** Sample Detail → Move to Storage

**Process:**
- Select storage location:
  - Refrigerator (2-8°C)
  - Freezer (-20°C)
  - Deep Freezer (-80°C)
  - Room Temperature
  - Incubator (37°C)
  - Specific racks (A1, A2, B1, B2)
- Sample status updates: RECEIVED → IN_STORAGE
- Location tracked in database
- Audit trail maintained

### 4. Worklist Creation ✅ (Schema & API Ready)
**Purpose:** Group samples/orders for batch processing

**Worklist Types:**
- **Department-based:** Group by Hematology, Biochemistry, Microbiology, etc.
- **Analyzer-based:** Group by specific equipment (e.g., Sysmex XN-1000, Cobas 6000)
- **Test-type-based:** Group by specific test categories
- **Manual:** Custom grouping by technician

**Worklist Properties:**
- Name and description
- Priority (STAT, Urgent, Routine)
- Status (Pending, In Progress, Completed, Cancelled)
- Assigned technician
- Creation and completion timestamps

**API Endpoints:**
- `GET /api/lims/worklists` - List all worklists
- `POST /api/lims/worklists` - Create new worklist
- `PATCH /api/lims/worklists` - Update worklist status/assignment
- `GET /api/lims/worklists/[id]/items` - List items in worklist
- `POST /api/lims/worklists/[id]/items` - Add sample/order to worklist
- `PATCH /api/lims/worklists/[id]/items` - Update item status
- `DELETE /api/lims/worklists/[id]/items` - Remove item from worklist

### 5. Next Steps (To Be Implemented)

#### A. Worklist Management UI
- Create WorklistsTab component
- Display active worklists with item counts
- Create/edit/delete worklists
- Assign technicians to worklists
- Drag-and-drop samples into worklists

#### B. Sample Processing
- Mark samples as "In Process" when testing begins
- Track analyzer position/rack location
- Record test start and completion times
- Handle failed tests and retests

#### C. Result Entry
- Enter test results manually or via analyzer interface
- Validate results against reference ranges
- Flag abnormal results
- Add comments and interpretations

#### D. Result Verification
- Senior technician/pathologist review
- Approve or reject results
- Request repeat testing if needed
- Add verification comments

#### E. Report Generation
- Generate PDF reports with results
- Include patient demographics
- Show reference ranges and flags
- Digital signature of verifying pathologist
- Send to ordering physician

## Database Schema

### Tables Created:
1. **worklists** - Main worklist records
2. **worklist_items** - Individual samples/orders in worklists

### Key Fields:
- Worklist: name, type, department, analyzer, priority, status, assigned technician
- Worklist Items: order ID, sample ID, test code, status, position, timestamps

## Status Flow

### Order Status:
1. REQUESTED (initial)
2. IN_PROGRESS (sample collected)
3. PROCESSING (tests running)
4. COMPLETED (results ready)
5. REPORTED (report sent)

### Sample Status:
1. RECEIVED (initial accessioning)
2. IN_STORAGE (moved to storage)
3. IN_PROCESS (testing in progress)
4. ANALYZED (testing complete)
5. DISPOSED (sample discarded)
6. REJECTED (sample rejected - quality issues)

### Worklist Status:
1. PENDING (created, not started)
2. IN_PROGRESS (actively processing)
3. COMPLETED (all items done)
4. CANCELLED (worklist cancelled)

### Worklist Item Status:
1. PENDING (added to worklist)
2. IN_PROGRESS (currently testing)
3. COMPLETED (test done)
4. FAILED (test failed, needs repeat)

## Benefits of Worklist System

1. **Batch Processing:** Process multiple samples together efficiently
2. **Organization:** Group samples by department/analyzer for optimal workflow
3. **Tracking:** Monitor progress of multiple samples simultaneously
4. **Priority Management:** Handle STAT and urgent samples appropriately
5. **Workload Distribution:** Assign worklists to specific technicians
6. **Audit Trail:** Complete history of who processed what and when
7. **Quality Control:** Ensure proper sample handling and processing order

## Example Workflow

```
1. Phlebotomist collects blood sample
   ↓
2. Sample accessioned at lab (SMP-2025-0001)
   ↓
3. Sample moved to refrigerator storage
   ↓
4. Lab supervisor creates "Hematology Morning Batch" worklist
   ↓
5. Technician adds sample to worklist
   ↓
6. Sample loaded into Sysmex analyzer (Position A1)
   ↓
7. Tests run automatically
   ↓
8. Results entered into system
   ↓
9. Pathologist reviews and approves results
   ↓
10. Report generated and sent to physician
```

## Integration Points

- **openEHR:** Store compositions for samples and results
- **Barcode System:** Track samples throughout workflow
- **Analyzer Interface:** Import results automatically (future)
- **Notification System:** Alert on critical results
- **Audit System:** Complete tracking of all actions
