# EHR API Routes

## 📋 Electronic Health Records API

API endpoints for EHR module functionality.

## Endpoints

### Patients
- `GET /api/ehr/patients` - List patients
- `POST /api/ehr/patients` - Create patient
- `GET /api/ehr/patients/[id]` - Get patient details
- `PUT /api/ehr/patients/[id]` - Update patient
- `DELETE /api/ehr/patients/[id]` - Delete patient

### Appointments
- `GET /api/ehr/appointments` - List appointments
- `POST /api/ehr/appointments` - Create appointment
- `PUT /api/ehr/appointments/[id]` - Update appointment
- `DELETE /api/ehr/appointments/[id]` - Cancel appointment

### Operations
- `GET /api/ehr/operations` - List operations
- `POST /api/ehr/operations` - Schedule operation
- `PUT /api/ehr/operations/[id]` - Update operation

### OpenEHR Integration
- `POST /api/ehr/openehr/compositions` - Create composition
- `GET /api/ehr/openehr/compositions/[id]` - Get composition

## Authentication

All endpoints require workspace authentication via JWT token.

## Rate Limiting

- Standard: 100 requests/minute
- Bulk operations: 10 requests/minute
