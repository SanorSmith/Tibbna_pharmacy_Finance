# Appointments Management

## Overview
The appointments system allows administrators to view, edit, and manage all appointments in the workspace.

## Features

### 1. Appointments List View
**Route**: `/d/[workspaceid]/appointments`

Displays all appointments in a table format with:
- Date & Time
- Patient Name
- Doctor ID
- Unit/Department
- Location
- Status (color-coded badges)
- Actions

### 2. Calendar View
**Route**: `/d/[workspaceid]/appointments/calendar`

Monthly calendar view with:
- Color-coded events by status
- Click to view appointment details
- Switch between month/week views
- Status legend
- Click-to-edit functionality for quick changes

### 3. Schedule View
**Route**: `/d/[workspaceid]/schedule`

Full calendar with drag-and-drop functionality for doctors and administrators, and click-to-edit for detailed changes.

## Appointment Actions

### Edit Date/Time (Pencil Icon)
- **Available for**: All appointments
- **Function**: Opens comprehensive edit dialog
- **Behavior**: 
  - Shows all appointment details
  - Patient and Doctor are read-only (unless admin/nurse)
  - Can modify date, time, unit, location
  - If appointment was cancelled or completed, status reverts to "scheduled"
  - Updates appointment in database
  - Refreshes display immediately

### Reschedule (Cancel)
- **Available for**: All scheduled appointments (past and future)
- **Function**: Cancels the appointment
- **Behavior**: 
  - Shows confirmation dialog
  - Changes status to "cancelled"
  - Appointment remains in list but marked as cancelled
  - Can be re-scheduled by editing the time
- **Use Case**: 
  - Future: Patient needs to reschedule
  - Past: Patient didn't check in (no-show) - needs to be rescheduled

### Mark Done
- **Available for**: Past appointments where patient checked in or is in progress
- **Function**: Marks appointment as completed
- **Behavior**: 
  - Shows confirmation dialog
  - Changes status to "completed"
  - Indicates the appointment was fulfilled
- **Use Case**: Patient attended and appointment finished successfully

### Delete Appointment
- **Available for**: All appointments (via edit dialog)
- **Function**: Permanently deletes appointment from database
- **Behavior**: 
  - Shows professional confirmation dialog (shadcn UI AlertDialog)
  - Warns that action cannot be undone
  - Removes appointment from database permanently
  - Updates all views immediately
- **Access Control**: 
  - Doctors can delete their own appointments
  - Administrators and nurses can delete any appointment

## Status Types

| Status | Color | Description |
|--------|-------|-------------|
| **Scheduled** | Blue | Appointment is booked and confirmed |
| **Checked In** | Green | Patient has arrived and checked in |
| **In Progress** | Yellow | Appointment is currently happening |
| **Completed** | Gray | Appointment finished successfully |
| **Cancelled** | Red | Appointment was cancelled |

## Role-Based Permissions

### Doctor Role
- ✅ Can edit their own appointments (date, time, unit, location)
- ✅ Can cancel their own appointments
- ✅ Can mark their own appointments as done
- ✅ Can delete their own appointments
- ❌ Cannot change doctor assignment
- ❌ Cannot edit/delete other doctors' appointments

### Administrator Role
- ✅ Can edit all appointments
- ✅ Can change doctor assignment for any appointment
- ✅ Can cancel any appointment
- ✅ Can mark any appointment as done
- ✅ Can delete any appointment
- ✅ Full access to all appointment management features

### Nurse Role
- ✅ Can edit all appointments
- ✅ Can change doctor assignment for any appointment
- ✅ Can cancel any appointment
- ✅ Can mark any appointment as done
- ✅ Can delete any appointment
- ✅ Same permissions as administrators for appointment management

## Automatic Status Logic

### Scheduled Appointments (No Check-in)
- **Past scheduled**: Patient didn't check in (no-show) → Show "Reschedule" button to cancel/reschedule
- **Future scheduled**: Normal upcoming appointment → Show "Reschedule" button if needed

### Checked-in/In-Progress Appointments
- **Past**: Patient attended → Show "Mark Done" button to complete
- **Current/Future**: Appointment happening or scheduled → No completion button yet

### All Appointments
- Edit button (pencil icon) always available to change date/time
- Editing a cancelled appointment reverts status to "scheduled"

### Rescheduling Cancelled Appointments
1. Click edit (pencil icon) on cancelled appointment
2. Change date/time to new slot
3. Save - status automatically reverts to "scheduled"

## API Endpoints

### GET /api/d/[workspaceid]/appointments
- Fetches appointments for date range
- Query params: `from`, `to`, `doctorid` (use "all" for administrators)
- Returns array of appointments

### PATCH /api/d/[workspaceid]/appointments/[appointmentid]
- Updates appointment details
- Can update: `starttime`, `endtime`, `status`, `location`, `notes`
- Returns updated appointment

## Access Control

- **Administrators**: Can view and edit all appointments
- **Doctors**: Can view and edit their own appointments
- **Other roles**: Limited or no access

## Date Range
- Default fetch range: 3 months past to 3 months future
- Covers 6-month window for efficient loading
