# EHR Module

## 📋 Electronic Health Records

This module contains all patient-centric clinical workflows and electronic health record management.

## Features

- **Patient Management**: Patient registration, demographics, medical history
- **Clinical Documentation**: Progress notes, clinical observations, assessments
- **Appointments**: Scheduling, calendar management, appointment workflows
- **Operations**: Surgical procedures, operative notes, scheduling
- **Doctor Workflows**: Physician dashboard, patient lists, clinical tasks
- **Referrals**: Patient referrals and consultation management

## Structure

```
ehr/
├── patients/           # Patient management and records
├── appointments/       # Appointment scheduling
├── operations/         # Surgical procedures
├── doctor/            # Doctor-specific workflows
└── referrals/         # Referral management
```

## Integration Points

- **LIMS**: Lab order creation and results viewing
- **Pharmacy**: Prescription creation and medication orders
- **Admin**: User permissions and department access

## Technologies

- OpenEHR for clinical data storage
- Next.js for frontend
- React Query for data fetching
