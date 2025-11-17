# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
