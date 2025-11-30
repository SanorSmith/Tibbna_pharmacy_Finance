# Appointment Fields Update Documentation

## Overview
This document describes the enhancement of the appointments system with additional fields to capture more detailed information about patient appointments.

## Date
November 14, 2025

## Changes Summary

### 1. Database Schema Updates

#### New Fields Added to `appointments` Table

**Appointment Name** (`appointmentname`)
- Type: Enum
- Values: `new_patient`, `re_visit`, `follow_up`
- Default: `new_patient`
- Description: Categorizes the type of patient visit

**Appointment Type** (`appointmenttype`)
- Type: Enum
- Values: `visiting` (in-person), `video_call`, `home_visit`
- Default: `visiting`
- Description: Defines the mode of appointment delivery

**Clinical Indication** (`clinicalindication`)
- Type: Text (nullable)
- Description: Medical reason or clinical indication for the appointment

**Reason for Request** (`reasonforrequest`)
- Type: Text (nullable)
- Description: Patient's stated reason for requesting the appointment

**Description** (`description`)
- Type: Text (nullable)
- Description: Additional notes or description about the appointment

### 2. Database Migration

**Migration File**: `migrations/004_update_appointments_schema.sql`

The migration creates two new enum types and adds five new columns to the appointments table:

```sql
CREATE TYPE appointment_name AS ENUM ('new_patient', 're_visit', 'follow_up');
CREATE TYPE appointment_type AS ENUM ('visiting', 'video_call', 'home_visit');

ALTER TABLE appointments
ADD COLUMN appointmentname appointment_name NOT NULL DEFAULT 'new_patient',
ADD COLUMN appointmenttype appointment_type NOT NULL DEFAULT 'visiting',
ADD COLUMN clinicalindication TEXT,
ADD COLUMN reasonforrequest TEXT,
ADD COLUMN description TEXT;
```

### 3. API Updates

#### POST `/api/d/[workspaceid]/appointments`
- Added new fields to appointment creation payload
- Doctor field auto-fills with current user if not specified
- All new fields are optional with sensible defaults

#### PATCH `/api/d/[workspaceid]/appointments/[appointmentid]`
- Added support for updating all new fields
- Maintains existing access control (doctors can only edit their own appointments)

### 4. UI Components Updated

#### Edit Appointment Dialog (`edit-appointment-dialog.tsx`)
Enhanced with new form fields:
- **Appointment Name**: Dropdown with options (New Patient, Re-visit Patient, Follow Up)
- **Appointment Type**: Dropdown with options (Visiting, Video Call, Home Visit)
- **Clinical Indication**: Multi-line text area
- **Reason for Request**: Multi-line text area
- **Description**: Multi-line text area

Features:
- All fields are properly initialized when editing existing appointments
- Form validation maintained
- Responsive layout with proper spacing

#### Schedule View Patient Picker (`schedule-view.tsx`)
Enhanced appointment booking form with:
- All new fields added to the patient selection dialog
- Improved scrolling with max-height constraint (90vh)
- Fixed layout with scrollable content area
- Fields reset properly when dialog closes
- Better visual hierarchy with section headers

### 5. Navigation Updates

Renamed menu items for clarity:
- "My Schedule" → "Appointments" (page title)
- "Schedule" → "Book Appointment" (doctor and nurse menus)
- "Schedule" → "Book Appointment" (administrator sub-menu)
- "Schedules" → "Staff Schedules" (under Staff Management)

### 6. User Experience Improvements

**Scrollable Modal**
- Patient picker modal now has proper scrolling
- Max height set to 90vh to prevent content from being hidden
- Separate scrollable areas for form fields and patient list
- Better visual separation between sections

**Form Organization**
- Logical grouping of fields
- Clear labels and placeholders
- Consistent styling across all forms
- Proper spacing and layout

**Doctor Auto-Fill**
- When a doctor creates an appointment, their ID is automatically used
- No need to manually select doctor in the form
- Reduces errors and speeds up appointment creation

## Technical Details

### Type Definitions

```typescript
type AppointmentName = "new_patient" | "re_visit" | "follow_up";
type AppointmentType = "visiting" | "video_call" | "home_visit";
```

### Drizzle ORM Schema

```typescript
export const appointmentNameEnum = pgEnum("appointment_name", [
  "new_patient",
  "re_visit",
  "follow_up",
]);

export const appointmentTypeEnum = pgEnum("appointment_type", [
  "visiting",
  "video_call",
  "home_visit",
]);
```

## Files Modified

### Database & Schema
- `lib/db/tables/appointment.ts` - Added new enum types and fields
- `migrations/004_update_appointments_schema.sql` - Migration script

### API Routes
- `app/api/d/[workspaceid]/appointments/route.ts` - POST endpoint
- `app/api/d/[workspaceid]/appointments/[appointmentid]/route.ts` - PATCH endpoint

### UI Components
- `app/d/[workspaceid]/appointments/edit-appointment-dialog.tsx` - Edit form
- `app/d/[workspaceid]/schedule/schedule-view.tsx` - Booking form
- `app/d/[workspaceid]/schedule/page.tsx` - Page title

### Navigation
- `components/sidebar/nav-main.tsx` - Menu labels

## Usage Examples

### Creating an Appointment with New Fields

```typescript
const appointment = {
  patientid: "patient-uuid",
  doctorid: "doctor-uuid", // Optional, auto-filled for doctors
  appointmentname: "new_patient",
  appointmenttype: "visiting",
  clinicalindication: "Persistent headaches for 2 weeks",
  reasonforrequest: "Patient experiencing severe headaches",
  description: "First consultation for headache symptoms",
  starttime: "2025-11-15T10:00:00Z",
  endtime: "2025-11-15T10:30:00Z",
  unit: "Neurology",
  status: "scheduled"
};
```

### Updating Appointment Fields

```typescript
const updates = {
  appointmentname: "follow_up",
  appointmenttype: "video_call",
  clinicalindication: "Follow-up for headache treatment",
  reasonforrequest: "Check progress after medication",
  description: "Second consultation via video call"
};
```

## Benefits

1. **Better Patient Categorization**: Distinguish between new patients, re-visits, and follow-ups
2. **Flexible Appointment Modes**: Support for in-person, video, and home visits
3. **Comprehensive Medical Records**: Capture clinical indications and reasons for visits
4. **Improved Workflow**: Auto-fill doctor information to reduce manual entry
5. **Enhanced UX**: Scrollable forms prevent information from being hidden
6. **Clearer Navigation**: Renamed menu items are more intuitive

## Migration Instructions

1. **Generate Migration**:
   ```bash
   npm run migrate
   ```

2. **Apply Migration**:
   ```bash
   npm run migrate-push
   ```

3. **Verify Schema**:
   Check that all new columns and enum types are created in the database

## Testing Checklist

- [ ] Create new appointment with all fields populated
- [ ] Create appointment with minimal fields (defaults applied)
- [ ] Edit existing appointment and update new fields
- [ ] Verify doctor auto-fill works correctly
- [ ] Test scrolling in patient picker modal
- [ ] Verify all dropdown options are selectable
- [ ] Test form validation
- [ ] Verify data persists correctly in database
- [ ] Check that all menu labels are updated
- [ ] Test on different screen sizes

## Future Enhancements

1. Add appointment reminders based on appointment type
2. Implement video call integration for video appointments
3. Add home visit scheduling with address validation
4. Create reports based on appointment categories
5. Add appointment templates for common visit types

## Support

For questions or issues related to these changes, please refer to:
- Database schema: `lib/db/tables/appointment.ts`
- API documentation: `APPOINTMENTS_MANAGEMENT.md`
- Migration files: `migrations/`
