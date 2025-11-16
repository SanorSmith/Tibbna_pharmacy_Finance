# Operative Procedures Management System

## Overview
Comprehensive surgical operations management system for booking, tracking, and managing operative procedures from scheduling through completion.

## Features

### 1. **Operation Booking**
- Schedule surgical procedures for patients
- Assign surgeon (auto-fills with current user)
- Set operation date and time
- Specify operation type (Emergency/Elective/Urgent)
- Estimate duration
- Assign operating theater

### 2. **Pre-operative Management**
- **Patient Selection**: Choose from registered patients
- **Assessment**: Document pre-operative patient assessment
- **Operation Details**: Detailed procedure description
- **Diagnosis**: Record operation-related diagnosis
- **Anesthesia**: Specify anesthesia type (General, Local, Spinal, Epidural, Regional)

### 3. **Operation Tracking**
Status workflow:
1. **Scheduled** - Operation booked
2. **In Preparation** - Pre-op preparations underway
3. **In Progress** - Surgery in progress
4. **Completed** - Surgery finished
5. **Cancelled** - Operation cancelled
6. **Postponed** - Operation rescheduled

### 4. **Post-operative Documentation**
- **Actual Times**: Record actual start and end times
- **Outcomes**: Document surgical outcomes
- **Complications**: Record any complications
- **Comments**: Additional notes and observations

## Database Schema

### Operations Table

```sql
CREATE TABLE operations (
  operationid UUID PRIMARY KEY,
  workspaceid UUID NOT NULL,
  patientid UUID NOT NULL,
  surgeonid UUID NOT NULL,
  
  -- Scheduling
  scheduleddate TIMESTAMP WITH TIME ZONE NOT NULL,
  estimatedduration TEXT,
  operationtype operation_type NOT NULL DEFAULT 'elective',
  status operation_status NOT NULL DEFAULT 'scheduled',
  
  -- Assessment
  preoperativeassessment TEXT,
  
  -- Operation details
  operationname TEXT NOT NULL,
  operationdetails TEXT,
  anesthesiatype TEXT,
  theater TEXT,
  
  -- Diagnosis
  operationdiagnosis TEXT,
  
  -- Outcomes
  actualstarttime TIMESTAMP WITH TIME ZONE,
  actualendtime TIMESTAMP WITH TIME ZONE,
  outcomes TEXT,
  complications TEXT,
  
  -- Comments
  comment TEXT,
  
  createdat TIMESTAMP DEFAULT NOW(),
  updatedat TIMESTAMP DEFAULT NOW()
);
```

### Enums

**Operation Status:**
- `scheduled`
- `in_preparation`
- `in_progress`
- `completed`
- `cancelled`
- `postponed`

**Operation Type:**
- `emergency` - Immediate life-threatening situations
- `elective` - Scheduled, non-urgent procedures
- `urgent` - Needs to be done soon but not immediately

## API Endpoints

### List Operations
```http
GET /api/d/[workspaceid]/operations
```

**Query Parameters:**
- `from` - Start date filter (ISO 8601)
- `to` - End date filter (ISO 8601)
- `surgeonid` - Filter by surgeon (or "all")

**Response:**
```json
{
  "operations": [
    {
      "operationid": "uuid",
      "patientid": "uuid",
      "surgeonid": "uuid",
      "scheduleddate": "2025-11-20T10:00:00Z",
      "operationname": "Appendectomy",
      "operationtype": "emergency",
      "status": "scheduled",
      "estimatedduration": "2 hours",
      "theater": "OT-1",
      "anesthesiatype": "General",
      ...
    }
  ]
}
```

### Book Operation
```http
POST /api/d/[workspaceid]/operations
```

**Request Body:**
```json
{
  "patientid": "uuid",
  "surgeonid": "uuid",
  "scheduleddate": "2025-11-20T10:00:00Z",
  "operationname": "Knee Replacement",
  "operationtype": "elective",
  "estimatedduration": "3 hours",
  "theater": "OT-2",
  "anesthesiatype": "Spinal",
  "preoperativeassessment": "Patient cleared for surgery",
  "operationdetails": "Total knee arthroplasty",
  "operationdiagnosis": "Severe osteoarthritis",
  "comment": "Patient requested morning slot"
}
```

**Response:**
```json
{
  "operation": { ... }
}
```

### Get Single Operation
```http
GET /api/d/[workspaceid]/operations/[operationid]
```

### Update Operation
```http
PATCH /api/d/[workspaceid]/operations/[operationid]
```

**Request Body** (all fields optional):
```json
{
  "status": "in_progress",
  "actualstarttime": "2025-11-20T10:15:00Z",
  "outcomes": "Procedure successful",
  "complications": "None"
}
```

### Delete/Cancel Operation
```http
DELETE /api/d/[workspaceid]/operations/[operationid]
```
*Administrator only*

## UI Components

### Operations List Page
**Route:** `/d/[workspaceid]/operations`

**Features:**
- View all scheduled operations
- Color-coded status badges
- Operation type indicators
- Patient information
- Scheduled date and time
- Theater and anesthesia details
- Assessment and diagnosis display
- Outcomes and complications tracking

### Book Operation Dialog
**Features:**
- Patient selection dropdown
- Date/time picker
- Operation name input
- Operation type selector
- Duration estimation
- Theater assignment
- Anesthesia type selector
- Multi-line text areas for:
  - Pre-operative assessment
  - Operation details
  - Diagnosis
  - Comments

## Access Control

### Doctors
- ✅ View all operations
- ✅ Book new operations
- ✅ Update operation details
- ✅ Add outcomes and complications
- ❌ Delete operations

### Administrators
- ✅ View all operations
- ✅ Book new operations
- ✅ Update operation details
- ✅ Add outcomes and complications
- ✅ Delete/cancel operations

### Nurses
- ❌ No access (can be extended if needed)

### Receptionists
- ❌ No access

## Navigation

The Operative Procedures feature is accessible from the sidebar:

**For Doctors:**
```
Dashboard
Book Appointment
Operative Procedures  ← New
Patients
...
```

**For Administrators:**
```
Dashboard
Appointments
Operative Procedures  ← New
Patients
...
```

## Usage Examples

### Example 1: Book Emergency Surgery
```typescript
const emergencyOperation = {
  patientid: "patient-uuid",
  surgeonid: "surgeon-uuid",
  scheduleddate: new Date().toISOString(), // ASAP
  operationname: "Emergency Appendectomy",
  operationtype: "emergency",
  estimatedduration: "1 hour",
  theater: "OT-Emergency",
  anesthesiatype: "General",
  preoperativeassessment: "Acute appendicitis, patient stable",
  operationdiagnosis: "Acute appendicitis",
};
```

### Example 2: Schedule Elective Procedure
```typescript
const electiveOperation = {
  patientid: "patient-uuid",
  surgeonid: "surgeon-uuid",
  scheduleddate: "2025-12-01T09:00:00Z",
  operationname: "Cataract Surgery",
  operationtype: "elective",
  estimatedduration: "45 minutes",
  theater: "OT-3",
  anesthesiatype: "Local",
  preoperativeassessment: "Patient in good health, vision 20/200",
  operationdetails: "Phacoemulsification with IOL implantation",
  operationdiagnosis: "Bilateral cataracts",
};
```

### Example 3: Update Operation Status
```typescript
// When surgery starts
PATCH /api/d/[workspaceid]/operations/[id]
{
  "status": "in_progress",
  "actualstarttime": "2025-11-20T10:15:00Z"
}

// When surgery completes
PATCH /api/d/[workspaceid]/operations/[id]
{
  "status": "completed",
  "actualendtime": "2025-11-20T12:30:00Z",
  "outcomes": "Procedure successful, no complications",
  "complications": "None"
}
```

## Best Practices

### 1. **Pre-operative Assessment**
- Always document patient assessment
- Include relevant medical history
- Note any allergies or contraindications
- Verify patient consent

### 2. **Operation Details**
- Be specific about the procedure
- Include surgical approach
- Note any special equipment needed
- Document technique variations

### 3. **Status Updates**
- Update status promptly
- Record actual times accurately
- Document any delays or changes
- Keep team informed

### 4. **Post-operative Documentation**
- Record outcomes immediately
- Document any complications
- Note patient condition
- Include recovery notes

### 5. **Emergency Operations**
- Mark as "emergency" type
- Schedule ASAP
- Prioritize theater allocation
- Ensure team availability

## Integration Points

### With Patients Module
- Select patients for operations
- View patient medical history
- Access patient records
- Link to patient dashboard

### With Appointments Module
- Coordinate pre-op appointments
- Schedule follow-up visits
- Manage post-op care
- Track recovery appointments

### With Staff Module
- Assign surgeons
- Coordinate surgical team
- Manage theater schedules
- Track surgeon availability

## Migration

To apply the operations schema:

```bash
npm run migrate
npm run migrate-push
```

This creates:
- `operations` table
- `operation_status` enum
- `operation_type` enum
- Necessary indexes

## Testing Checklist

- [ ] Book elective operation
- [ ] Book emergency operation
- [ ] Book urgent operation
- [ ] Update operation status
- [ ] Add pre-operative assessment
- [ ] Record actual start time
- [ ] Record actual end time
- [ ] Document outcomes
- [ ] Document complications
- [ ] Add comments
- [ ] View operations list
- [ ] Filter by date range
- [ ] Filter by surgeon
- [ ] Cancel operation (admin)
- [ ] Verify access control

## Future Enhancements

### Potential Features
1. **Operating Theater Management**
   - Theater availability calendar
   - Equipment tracking
   - Conflict detection

2. **Surgical Team Assignment**
   - Assign anesthesiologist
   - Assign nurses
   - Assign assistants

3. **Pre-op Checklist**
   - Automated checklist
   - Required tests
   - Consent forms

4. **Post-op Care Plan**
   - Recovery instructions
   - Medication schedule
   - Follow-up appointments

5. **Reporting**
   - Operation statistics
   - Surgeon performance
   - Complication rates
   - Duration analysis

6. **Notifications**
   - Email/SMS reminders
   - Team notifications
   - Status change alerts

## Files Modified

### Database
- `lib/db/tables/operation.ts` - Schema definition
- `lib/db/schema.ts` - Export operations
- `migrations/005_create_operations_table.sql` - Migration
- `lib/db/migrations/0010_loose_vampiro.sql` - Generated migration

### API
- `app/api/d/[workspaceid]/operations/route.ts` - List & Create
- `app/api/d/[workspaceid]/operations/[operationid]/route.ts` - Get, Update, Delete

### UI
- `app/d/[workspaceid]/operations/page.tsx` - Main page
- `app/d/[workspaceid]/operations/operations-list.tsx` - List component

### Navigation
- `components/sidebar/nav-main.tsx` - Added menu items

## Support

For issues or questions:
1. Check this documentation
2. Review API endpoint responses
3. Check browser console for errors
4. Verify access permissions
5. Ensure migrations are applied

---

**Version:** 1.0.0  
**Last Updated:** November 15, 2025  
**Status:** ✅ Production Ready
