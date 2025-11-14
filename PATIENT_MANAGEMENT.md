# Patient Management Feature

## Overview
Comprehensive patient management system with role-based access control. Administrators can register and edit patients, while doctors and nurses can view patient details. Patients can be edited directly from the patient list.

## Database Schema

### Table: `patients`
- `patientid` (UUID, Primary Key, Auto-generated)
- `workspaceid` (UUID, Foreign Key to workspaces)
- `firstname` (TEXT, Required)
- `middlename` (TEXT, Optional)
- `lastname` (TEXT, Required)
- `nationalid` (TEXT, Optional) - National ID or patient identifier
- `dateofbirth` (TEXT, Optional)
- `phone` (TEXT, Optional)
- `email` (TEXT, Optional)
- `address` (TEXT, Optional)
- `ehrid` (TEXT, Optional) - Electronic Health Record ID
- `medicalhistory` (JSONB, Optional) - Medical history notes
- `createdat` (TIMESTAMP)
- `updatedat` (TIMESTAMP)

## Files

### 1. API Routes
- `/app/api/d/[workspaceid]/patients/route.ts`
  - `GET` - List all patients for a workspace
  - `POST` - Register a new patient (administrator only)
- `/app/api/d/[workspaceid]/patients/[patientid]/route.ts`
  - `PATCH` - Update patient information (administrator only)

### 2. Pages & Components
- `/app/d/[workspaceid]/patients/page.tsx` - Server component with role-based access
- `/app/d/[workspaceid]/patients/patients-list.tsx` - Client component with edit functionality
- `/app/d/[workspaceid]/patients/new/page.tsx` - Patient registration page
- `/app/d/[workspaceid]/patients/new/patient-form.tsx` - Registration form component
- `/app/d/[workspaceid]/patients/[patientid]/page.tsx` - Patient dashboard (doctors/nurses only)

## Features

### Patient List Page
- **Register Patient Button** - Top-right button (administrators only)
- **Edit Button** - Pencil icon on each patient (administrators only)
- **Clickable Patients** - Click to view details (doctors and nurses only)
- **Patient Cards** - Display name, ID, phone, email, and EHR ID
- **Empty State** - Helpful message when no patients exist
- **Real-time Updates** - List refreshes after edit operations

### Role-Based Access

#### Administrators
- Can register new patients
- Can edit all patient information
- Cannot view patient dashboard

#### Doctors & Nurses
- Can view patient list
- Can click patients to view detailed dashboard
- Cannot edit patient information
- Cannot register new patients

#### Receptionists
- Can view patient list only
- Cannot view patient details
- Cannot edit or register patients

### Patient Registration (Administrators Only)
Navigate to separate registration page via "Register Patient" button.

#### Personal Information
- **First Name** (Required)
- **Middle Name** (Optional)
- **Last Name** (Required)
- **National ID** (Optional) - Patient identifier
- **Date of Birth** (Optional)

#### Contact Information
- **Phone** (Optional)
- **Email** (Optional)
- **Address** (Optional)

#### Medical Information
- **Medical History** (Optional) - Textarea for notes, conditions, allergies

### Edit Patient Dialog (Administrators Only)
Inline dialog on patient list page with same fields as registration.

#### Features
- Pre-fills with existing patient data
- All fields editable except patient ID
- Saves changes via PATCH endpoint
- Updates list immediately after save

### Patient Dashboard (Doctors & Nurses Only)
Detailed view accessible by clicking on a patient in the list.
- Comprehensive patient information
- Medical history
- Appointment history
- Treatment records

## Usage

### 1. Access the Page
- **Patient List**: `/d/{workspaceid}/patients`
- **Register Patient**: `/d/{workspaceid}/patients/new` (administrators only)
- **Patient Dashboard**: `/d/{workspaceid}/patients/{patientid}` (doctors/nurses only)

### 2. Registering a Patient (Administrators)
1. Click "Register Patient" button
2. Fill in patient information
3. Click "Register Patient"
4. Redirected to patient list

### 3. Editing a Patient (Administrators)
1. Click pencil icon on patient card
2. Modify fields as needed
3. Click "Save Changes"
4. List updates immediately

### 4. Viewing Patient Details (Doctors & Nurses)
1. Click on patient card
2. View comprehensive patient dashboard
3. Access medical history and records

## Form Validation
- First name and last name are required
- All other fields are optional
- Form displays error messages for validation failures
- Success redirects or closes dialog and refreshes the list

## UI Components Used
- Shadcn UI components (Button, Input, Label, Dialog, Textarea)
- Lucide React icons (Edit, Plus)
- Next.js App Router with Server and Client Components
- Client-side form handling with loading states and error handling

## Access Control Summary

| Role | View List | View Details | Register | Edit |
|------|-----------|--------------|----------|------|
| Administrator | ✅ | ❌ | ✅ | ✅ |
| Doctor | ✅ | ✅ | ❌ | ❌ |
| Nurse | ✅ | ✅ | ❌ | ❌ |
| Receptionist | ✅ | ❌ | ❌ | ❌ |
