This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Patients feature

This module adds workspace-scoped patient registration and listing with role-based access.

### Data model
- Table: `patients` (Drizzle, PostgreSQL)
  - `patientid` (uuid, pk)
  - `workspaceid` (uuid, fk -> `workspaces.workspaceid`, cascade on delete)
  - `firstname`, `middlename`, `lastname`
  - `nationalid`, `dateofbirth`
  - `phone`, `email`, `address`
  - `medicalhistory` (jsonb)
  - `createdat`, `updatedat`

### API endpoints
- `GET /api/d/[workspaceid]/patients`
  - Auth required. Returns patients for the workspace.
- `POST /api/d/[workspaceid]/patients`
  - Requires workspace role `administrator` OR global permission `"admin"`.
  - Body fields: `firstname`, `middlename?`, `lastname`, `nationalid?`, `dateofbirth? (YYYY-MM-DD)`, `phone?`, `email?`, `address?`, `medicalhistory?`.
- `GET /api/d/[workspaceid]/admin-check` (diagnostic)
  - Returns membership role, global admin detection, and `effectiveAdmin`.

### Pages
- `/d/[workspaceid]/patients`
  - Lists patients. Shows "Register Patient" button if user is workspace admin or global admin.
- `/d/[workspaceid]/patients/new`
  - Patient registration form (Shadcn UI). Access restricted to workspace admin or global admin.

### EHRbase linkage
- On patient creation, the API generates a `patientid` (UUID) and creates an EHR in EHRbase using that UUID as the subject external_ref id.
- The returned EHR identifier is stored on the patient as `ehrid`.
- The Patients list shows `EHR: <ehrid>` when available.

Environment variables (server-side):
- `EHRBASE_URL` = base host only, e.g. `http://localhost:8080` (do not include `/ehrbase` here; the client adds it)
- `EHRBASE_USER` / `EHRBASE_PASSWORD`
- `EHRBASE_API_KEY` (optional; include only if your deployment requires it)

Client (optional):
- `NEXT_PUBLIC_EHRBASE_URL` can point to `http://localhost:8080/ehrbase` for client features.

Notes:
- If EHR creation fails (e.g., misconfigured URL or credentials), the patient is still created and the error is logged. You can retry EHR creation later by calling the EHR client manually with the patient's UUID.

### Navigation
- Sidebar shows workspace-aware Patients links. "New Patient" appears for:
  - Workspace role `administrator`.
  - Global admins (permission includes `"admin"`).

### Setup and usage
1) Ensure DATABASE_URL is configured.
2) Apply migrations:
   - `npm run migrate`
   - `npm run migrate-push`
3) Start dev server: `npm run dev` and open `http://localhost:3000`.
4) Visit `/d/[workspaceid]/patients` and `/d/[workspaceid]/patients/new`.
5) Required roles:
   - Create: workspace `administrator` or global `"admin"`.
   - List: any authenticated user in the workspace.

## Appointments enhancements

Adds department (Unit) tracking and optional doctor selection when booking.

### Data model
- Table: `appointments`
  - New column: `unit` (text, optional) — department where the appointment takes place
  - `notes` (jsonb) — stores patientname and comments array with timestamps

### API changes
- `POST /api/d/[workspaceid]/appointments`
  - Accepts `unit?` (stored in column)
  - Accepts `patientname?` (stored in `notes.patientname` for display)
  - Still accepts `doctorid?` (defaults to current user if omitted)
- `PATCH /api/d/[workspaceid]/appointments/[appointmentid]`
  - Accepts `notes` object to update comments
  - Comments structure: `{ comments: [{ timestamp: ISO string, text: string }] }`

### New API
- `GET /api/d/[workspaceid]/doctors`
  - Returns users in the workspace with role `doctor` for booking selection

### UI (Schedule)
- `/d/[workspaceid]/schedule`
  - Booking modal now includes:
    - Unit/Department dropdown (optional)
    - Doctor dropdown (optional; defaults to current user)
  - Sends `unit`, `doctorid` (if selected), and `patientname` on create

### Migration
1) Generate migrations: `npm run migrate`
2) Apply to DB: `npm run migrate-push`

## Doctor Dashboard

Dedicated dashboard for doctors showing appointments, patients, and operations with note-taking capabilities.

### Pages
- `/d/[workspaceid]/doctor`
  - Doctor-only dashboard (role check enforced)
  - Displays doctor information card at top
  - Tabs: Appointments, Patients, Operations, Contacts & Referrals
  - Date selector for viewing appointments
  - Summary cards: Upcoming, In Progress, Completed
  - Manual refresh button

### Features
- **Doctor Information Card**
  - Displays doctor's name, unit, ID, and specialist information
  - Fetches from staff table if doctor is registered as staff
  - Shows:
    - Name
    - ID (user UUID)
    - Unit/Department (if available)
    - Specialist (if available)

- **Appointments View**
  - Shows all appointments for selected date
  - Displays patient name, time, unit/department, status
  - Enhanced contact info display with icons:
    - Patient ID
    - Phone number (📞)
    - Email address (✉️)
  - Status badges (scheduled, in_progress, completed)

- **Operations View**
  - Dedicated tab for viewing patient operations
  - Shows all scheduled operations for selected date
  - For each operation displays:
    - Patient name and appointment time
    - Status badge
    - Complete contact information section (ID, phone, email)
    - Operation notes with timestamps
  - Clean, organized layout for surgical/procedure planning
  
- **Notes System**
  - Add timestamped notes to any appointment
  - Each note includes:
    - Date & Time (automatically captured)
    - Comment text
  - Notes are displayed chronologically
  - Stored in `appointments.notes.comments` array

- **Patient List**
  - View all workspace patients
  - Shows name, ID, phone, email
  - Quick reference for patient information

- **Contacts & Referrals**
  - Quick access to hospital staff contact information
  - **Quick Stats Cards** showing staff count by role:
    - Reception (🏥)
    - Nurses (👨‍⚕️)
    - Laboratory (🔬)
    - Pharmacy (💊)
  - **Departments & Units View** - Staff organized by their unit/department:
    - Shows all units (e.g., Cardiology, ENT, Laboratory, Pharmacy, etc.)
    - Lists all staff members in each unit
    - Each staff member shows:
      - Full name with role prefix (Dr. for doctors)
      - Role and specialty (if applicable)
      - Clickable phone number (tel: link)
      - Clickable email address (mailto: link)
  - Enables quick communication and patient referrals to any department

### Navigation
- Added "Dashboard" link to doctor sidebar (hospital workspace)
- Appears as first item in doctor navigation

### Access Control
- Only users with `doctor` role in workspace can access
- Doctors see only their own appointments
- Redirects non-doctors to workspace home

## Patient Dashboard

Comprehensive per-patient workspace dashboard with vitals, labs, orders, referrals, care plans, diagnostics, imaging, and notes.

### Pages
- `/d/[workspaceid]/patients/[patientid]`
  - Server page with role check (doctor or administrator)
  - Loads patient and renders PatientDashboard client component

### API
- `GET /api/d/[workspaceid]/patients/[patientid]/appointments`
  - Lists this patient's appointments (doctor/admin access)
- `GET /api/d/[workspaceid]/patients/[patientid]/vital-signs`
  - Dummy in-memory vital signs history (6 essential measurements). Doctors/nurses only.
- `POST /api/d/[workspaceid]/patients/[patientid]/vital-signs`
  - Stores a new vital signs record in memory. Body shape:
    ```json
    {
      "vitalSigns": {
        "temperature": 37.1,
        "systolic": 120,
        "diastolic": 80,
        "heartRate": 72,
        "respiratoryRate": 15,
        "spO2": 98
      }
    }
    ```
- `GET /api/d/[workspaceid]/patients/[patientid]/vaccinations`
  - Dummy in-memory vaccination summary list aligned with openEHR Vaccination Summary archetype.
- `POST /api/d/[workspaceid]/patients/[patientid]/vaccinations`
  - Stores a vaccination summary record. Body shape:
    ```json
    {
      "vaccination": {
        "vaccineName": "COVID-19 mRNA",
        "targetedDisease": "COVID-19",
        "description": "Dose 2",
        "totalAdministrations": "2",
        "lastVaccineDate": "2025-11-01",
        "nextVaccineDue": "2026-11-01",
        "additionalDetails": "Pfizer",
        "comment": "No adverse events"
      }
    }
    ```

### Features
- **Patient Contact Card**
  - Name, Patient ID, Age (calculated), Gender
  - Height, Weight, BMI (auto-calculated), Blood Type
  - National ID, Phone (tel link), Email (mailto), Address, Emergency contact

- **Vital Signs (demo CDR flow)**
  - Top card shows the latest vitals from the in-memory API, color-coded per metric
  - Vital Signs tab lists history, includes gradients/icons, and supplies a simplified 6-field form dialog
  - Data is currently stored in memory for demos; API contract mirrors openEHR naming for future CDR wiring

- **Vaccinations (openEHR vaccination summary)**
  - Summary card highlights latest vaccine name, targeted disease, last dose, next due
  - Vaccinations tab lists history with targeted disease, total administrations, last/next dates, description/additional notes
  - Form dialog captures the openEHR vaccination summary fields (vaccine name, targeted disease, description, total administrations, last vaccine date, next vaccine due, additional details, comment)

- **Lab Results**
  - Table with columns: Laboratory, Test Name, Result, Reference Range, Unit, Status, Date
  - Clickable Test Name opens a dialog with:
    - Laboratory name and Test date
    - Results panel (Result, Reference, Status)
    - Lab Notes and actions (Download Report)

- **Test Orders**
  - Orders list with status (Pending, In Progress, Completed)
  - Ordered by, Order date, Priority, Laboratory, Instructions
  - Action to view results when completed

- **Referrals**
  - Referred By/To, Date, Reason, Priority, Status, and session tracking
  - Actions to view referral reports

- **Care Plans**
  - Goals, Interventions, Progress Notes
  - Status badge and metadata (Created by, Start date)

- **Diagnostics (openEHR-based Problem/Diagnosis)**
  - List of diagnoses showing Status, Severity, Onset/Resolution, Body site, Clinician
  - Add Diagnosis dialog with fields:
    - Problem/Diagnosis name (coded where possible)
    - Clinical status (active/inactive/resolved/remission)
    - Severity (mild/moderate/severe)
    - Date of onset and resolution
    - Body site
    - Clinical description and Comment

- **Imaging**
  - Placeholder for imaging and radiology results

- **Notes**
  - Placeholder for clinical notes

### Navigation
- From Doctor Dashboard or Patients list, clicking a patient navigates to `/d/[workspaceid]/patients/[patientid]`.

## Staff feature

Workspace-scoped staff registration and listing with admin-only creation and role-aware validation.

### Data model
- Table: `staff` (Drizzle, PostgreSQL)
  - `staffid` (uuid, pk)
  - `workspaceid` (uuid, fk -> `workspaces.workspaceid`, cascade on delete)
  - `role` (`doctor` | `nurse` | `lab_technician` | `pharmacist` | `receptionist`)
  - `firstname`, `middlename?`, `lastname`
  - `unit?` (department)
  - `specialty?` (primarily for doctors)
  - `phone?`, `email?`
  - `createdat`, `updatedat`

### API endpoints
- `GET /api/d/[workspaceid]/staff`
  - Auth required. Returns staff for the workspace.
- `POST /api/d/[workspaceid]/staff`
  - Requires workspace role `administrator` OR global permission `"admin"`.
  - Body fields: `role`, `firstname`, `middlename?`, `lastname`, `unit?`, `specialty?`, `phone?`, `email?`.
  - Server-side validation (role-based): for roles `nurse`, `lab_technician`, `pharmacist` require
    - `firstname` and `lastname`
    - `unit`
    - at least one of `phone` or `email`

### Pages
- `/d/[workspaceid]/staff`
  - Lists staff for the workspace, with basic info (name, role, unit, contact).
- `/d/[workspaceid]/staff/new`
  - Staff registration form (Shadcn UI). Admin-only.
  - The `unit` field is a dropdown with common departments:
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

### Navigation
- Sidebar additions for admins:
  - Hospital → Staff Management → `Staff List`, `Add Staff`
  - Laboratory → Staff & Scheduling → Staff Management → `Staff List`, `Add Staff`
  - Pharmacy → Staff Management → `Staff List`, `Add Staff`
- For global admins not in a workspace admin role, an extra “Staff Management” group is appended with `Staff List` and `Add Staff`.

### Setup and usage
1) Ensure DATABASE_URL is configured.
2) Apply migrations:
   - `npm run migrate`
   - `npm run migrate-push`
3) Start dev server: `npm run dev` and open `http://localhost:3000`.
4) Visit `/d/[workspaceid]/staff` and `/d/[workspaceid]/staff/new`.
5) Required roles:
   - Create: workspace `administrator` or global `"admin"`.
   - List: any authenticated user in the workspace.
