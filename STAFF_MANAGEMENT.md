# Staff Management Feature

## Overview
Comprehensive staff management system with inline add/edit functionality and role-based access control. Administrators can manage all staff members directly from the staff list page without separate navigation.

## Database Schema

### Table: `staff`
- `staffid` (UUID, Primary Key, Auto-generated)
- `workspaceid` (UUID, Foreign Key to workspaces)
- `role` (TEXT, Required) - Staff role (doctor, nurse, lab_technician, pharmacist, receptionist, administrator)
- `firstname` (TEXT, Required)
- `middlename` (TEXT, Optional)
- `lastname` (TEXT, Required)
- `unit` (TEXT, Optional) - Department/Unit assignment
- `specialty` (TEXT, Optional) - Medical specialty (relevant for doctors)
- `phone` (TEXT, Optional)
- `email` (TEXT, Optional)
- `createdat` (TIMESTAMP)
- `updatedat` (TIMESTAMP)

## Files

### 1. Database Layer
- `/lib/db/tables/staff.ts` - Drizzle ORM schema definition
- `/lib/db/schema.ts` - Exports staff table

### 2. API Routes
- `/app/api/d/[workspaceid]/staff/route.ts`
  - `GET` - List all staff for a workspace
  - `POST` - Create a new staff member
- `/app/api/d/[workspaceid]/staff/[staffid]/route.ts`
  - `PATCH` - Update staff information (administrator only)
  - `DELETE` - Delete a staff member (administrator only)

### 3. Pages & Components
- `/app/d/[workspaceid]/staff/page.tsx` - Server component that passes admin status
- `/app/d/[workspaceid]/staff/staff-list.tsx` - Client component with inline add/edit

## Features

### Staff List Page
- **Inline Add Button** - "Add Staff" button at top of list (administrators only)
- **Edit Button** - Pencil icon on each staff member (administrators only)
- **Delete Button** - Trash icon on each staff member (administrators only)
- **Staff Cards** - Display name, role, unit, specialty, and contact information
- **Empty State** - Helpful message when no staff members exist
- **Real-time Updates** - List refreshes after add/edit/delete operations

### Add/Edit Dialog (Unified)
The same dialog handles both adding new staff and editing existing staff members.

#### Staff Information
- **Role** (Required) - Dropdown: Doctor, Nurse, Lab Technician, Pharmacist, Receptionist
- **First Name** (Required for nurse/lab tech/pharmacist)
- **Middle Name** (Optional)
- **Last Name** (Required for nurse/lab tech/pharmacist)
- **Unit/Department** (Required for nurse/lab tech/pharmacist) - Dropdown with predefined departments
- **Specialty** (Optional) - Relevant for doctors
- **Phone** (Required for nurse/lab tech/pharmacist if email not provided)
- **Email** (Required for nurse/lab tech/pharmacist if phone not provided)

#### Role-Based Validation
- **Nurse, Lab Technician, Pharmacist**: Require name, unit, and at least phone or email
- **Doctor, Receptionist**: All fields optional except role

#### Edit Mode
- Dialog title changes to "Edit Staff"
- Form pre-fills with existing staff data
- Save button updates existing staff member
- Role can be changed when editing

### Delete Confirmation
- Professional AlertDialog confirmation
- Warns that action cannot be undone
- Shows staff member name being deleted

### Access Control
- **Administrators**: Can add, edit, and delete all staff
- **Other Roles**: Can only view staff list

## Navigation Changes
- Removed "Add Staff" link from navigation menus
- Add functionality now inline on staff list page
- Cleaner navigation structure

## Usage

### 1. Access the Page
- **Staff List**: `/d/{workspaceid}/staff`
- Administrators see "Add Staff" button and edit/delete icons
- Other roles see read-only list

### 2. Adding Staff
1. Click "Add Staff" button (administrators only)
2. Select role from dropdown
3. Fill in required fields (varies by role)
4. Click "Register Staff"
5. List updates immediately

### 3. Editing Staff
1. Click pencil icon on staff card (administrators only)
2. Modify fields as needed
3. Click "Save Changes"
4. List updates immediately

### 4. Deleting Staff
1. Click trash icon on staff card (administrators only)
2. Confirm deletion in AlertDialog
3. Staff member removed from list immediately

## Form Validation
- Role is always required
- For nurse/lab technician/pharmacist:
  - Name (first and last) is required
  - Unit/Department is required
  - At least phone or email is required
- Form displays error messages for validation failures
- Success closes dialog and refreshes the list automatically

## UI Components Used
- Shadcn UI components (Button, Input, Select, Label, Dialog, AlertDialog)
- Lucide React icons (Edit, Trash2, Plus, UserCheck)
- Next.js App Router with Server and Client Components
- Client-side form handling with loading states and error handling

## Departments List
The following departments/units are available for selection:
- Outpatient Department
- ENT (Ear, Nose, Throat)
- Cardiology
- Neurology
- Maternity & Obstetrics
- Obstetrics & Gynecology
- Psychiatry & Mental Health
- Oncology
- Dermatology
- Ophthalmology
- Intensive Care Unit
- Operating Theaters
- Pharmacy
- Laboratory
