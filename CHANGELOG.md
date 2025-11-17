# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - November 17, 2024

#### Clinical Notes Feature
- **Clinical Notes with SOAP Format**: Complete clinical documentation system
  - openEHR-compliant (EVALUATION.clinical_synopsis archetype)
  - SOAP format support (Subjective, Objective, Assessment, Plan)
  - 4 note types: Progress Note, Consultation Note, Discharge Summary, Clinical Synopsis
  - Role-based authorization (doctors create, doctors/nurses view)
  - Status tracking (Draft, Final, Amended)
  - Author attribution with role tracking
  - 3 comprehensive dummy notes with realistic clinical scenarios
  - Professional UI with color-coded sections
  - Form dialog with validation
  - API endpoints: GET and POST with authorization

#### Patient Dashboard Improvements
- **Clinical Summary Section**: At-a-glance critical information
  - Active Diagnoses (red highlight)
  - Current Medications (blue highlight)
  - Allergies & Alerts (yellow highlight with warning icon)
  - Recent Activity (last visit and latest vitals)
- **Tab Reorganization**: Workflow-based organization following medical best practices
  - Clinical Documentation first (Notes, Vitals)
  - Assessment & History (History, Diagnoses)
  - Diagnostic Studies (Labs, Imaging, Orders)
  - Treatment & Management (Meds, Care Plans)
  - Preventive Care & Coordination (Vaccines, Referrals, Appts)
- **Shortened Tab Labels**: Medical standard abbreviations (Meds, Vitals, Appts, etc.)
- **Default Tab**: Notes tab as primary landing for clinical workflow

#### Dummy Data Additions
- **Vital Signs**: 5 recent measurements with complete vitals
- **Vaccinations**: 5 immunization records (Flu, Td, COVID, Pneumococcal, Hep B)
- **Referrals**: 5 specialist referrals (Cardiology, Endocrinology, GI, Ortho, Derm)
- **Clinical Notes**: 3 professional SOAP-formatted notes

#### Documentation
- **CLINICAL_NOTES.md**: 680+ lines comprehensive documentation
  - Feature overview and capabilities
  - openEHR compliance details
  - SOAP format explanation with examples
  - UI documentation
  - Data model and API reference
  - Authorization matrix
  - Usage guide for physicians
  - Clinical documentation best practices
- **Updated docs/README.md**: Added clinical notes section

### Changed - November 17, 2024
- **Patient Dashboard**: Reorganized according to medical best practices
- **Tab Order**: Clinical workflow-based instead of alphabetical
- **Default Tab**: Changed from "Appointments" to "Notes"
- **Tab Labels**: Shortened for better UX (Prescriptions → Meds, etc.)
- **Workspace Routing**: Implemented role-based dashboard routing
  - Doctors automatically redirected to doctor dashboard
  - Nurses redirected to nurse dashboard
  - Admins redirected to admin dashboard
  - Other roles redirected to their specific dashboards
  - Improved user experience with role-appropriate interfaces
- **Doctor Dashboard - Contact Section**: Enhanced with comprehensive search
  - Search staff by name, role, department, specialty, or ID
  - Real-time filtering with instant results
  - Quick filter cards for common roles (clickable)
  - Staff ID display in search results
  - Clear search functionality
  - Improved UI with search bar and result counter
- **Doctor Dashboard - Complete Reorganization**: Healthcare best practices applied
  - Clinical Summary Dashboard with 4 KPI cards (schedule, completed, patients, pending)
  - Tab reorganization: Today's Schedule → My Patients → Staff Directory → Clinical Notes
  - Visual priority indicators (NOW, OVERDUE badges)
  - Enhanced appointment cards with patient context
  - Quick access buttons (View Chart, call, email)
  - Completion rate tracking
  - Status filter display
  - 2-column patient panel layout
  - Color-coded borders and status badges
- **Appointments Calendar - Complete Redesign**: Healthcare color coding and calendar view
  - Healthcare standard color palette (blue, green, amber, emerald, red)
  - Status icons for quick identification (📅, ✓, ⏱️, ✅, ❌)
  - Summary dashboard with 5 status count cards
  - Calendar-style grouping by date with sticky headers
  - TODAY badge for current date
  - NOW badge (animated) for current appointments
  - OVERDUE badge for missed appointments
  - Card-based layout replacing table
  - Color-coded left borders for priority
  - Location and unit as colored badges
  - Improved sorting (upcoming first, then past)
  - Enhanced visual hierarchy and spacing
- **Schedule Calendar View**: Healthcare color coding applied
  - FullCalendar events with status-based colors
  - Status icons in event titles
  - 4-card status summary dashboard in sidebar
  - Enhanced sidebar sections with color-coded borders
  - Consistent color palette across all views
  - Improved visual hierarchy and readability

## [Previous Releases]

### Added
- openEHR-compliant prescription form with Medication Order archetype support
- SNOMED CT and ICD-10 terminology binding fields
- Prescription API endpoints (GET, POST) with role-based authorization
- Prescription list view in patient dashboard
- Support for PRN (as required) medications
- Clinical indication field with terminology support
- Dose direction with amount and unit fields
- Comprehensive prescription form documentation
- Laboratory test orders feature with API endpoints
- Test order form with 5 lab types (Clinic chemistry, Haematology, Microbiology, Immunology, X-Ray)
- Test selection: individual test name or test package
- Priority management: Routine, Urgent, STAT orders
- Test order status tracking (pending, in-progress, completed, cancelled)
- Specimen request and clinical indication fields
- Comprehensive test orders documentation
- Imaging requests and results feature with API endpoints
- Support for multiple imaging modalities (X-Ray, CT, MRI, Ultrasound)
- Imaging request form with urgency levels (routine, urgent, emergency)
- Imaging result display with findings and impressions
- Contrast use management (yes, no, unknown)
- Professional radiology report format
- Comprehensive imaging documentation

### Changed
- Migrated from single `dosage` field to `dose_amount` + `dose_unit` structure
- Simplified prescription form UI to focus on essential fields
- Updated prescription data model to align with openEHR standards
- Improved form validation and user feedback
- Replaced static test orders with functional form and list

### Fixed
- Authentication issues in prescription API (user.id → user.userid)
- Workspace access validation (w.workspaceid → w.workspace.workspaceid)
- Role-based authorization (user.role → membership.role)
- Prescription table display to show dose amount and unit correctly

## [1.0.0] - 2025-11-17

### Added
- Initial implementation of openEHR prescription form
- Patient dashboard prescription tab
- In-memory prescription storage for development
- Form validation for required fields
- Prescription status tracking

### Technical Details
- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Standards**: openEHR Medication Order archetype v3
- **Terminologies**: SNOMED CT, ICD-10, RxNorm, dm+d, AMT support
