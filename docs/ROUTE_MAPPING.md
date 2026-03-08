# Route Mapping - Old vs New Structure

## Overview

This document maps old routes to new module-specific routes. Use this as a reference when updating imports, navigation, and API calls.

---

## Frontend Routes

### EHR Module Routes

| Old Route | New Route | Status |
|-----------|-----------|--------|
| `/d/[workspaceid]/patients` | `/d/[workspaceid]/ehr/patients` | ✅ Available |
| `/d/[workspaceid]/patients/[patientid]` | `/d/[workspaceid]/ehr/patients/[patientid]` | ✅ Available |
| `/d/[workspaceid]/patients/new` | `/d/[workspaceid]/ehr/patients/new` | ✅ Available |
| `/d/[workspaceid]/doctor` | `/d/[workspaceid]/ehr/doctor` | ✅ Available |
| `/d/[workspaceid]/appointments` | `/d/[workspaceid]/ehr/appointments` | ✅ Available |
| `/d/[workspaceid]/operations` | `/d/[workspaceid]/ehr/operations` | ✅ Available |
| `/d/[workspaceid]/schedule` | `/d/[workspaceid]/ehr/schedule` | ✅ Available |

### LIMS Module Routes

| Old Route | New Route | Status |
|-----------|-----------|--------|
| `/d/[workspaceid]/lab-tech` | `/d/[workspaceid]/lims/lab-tech` | ✅ Available |
| `/d/[workspaceid]/lab-management` | `/d/[workspaceid]/lims/management` | ✅ Available |
| `/d/[workspaceid]/lab` | `/d/[workspaceid]/lims/dashboard` | ✅ Available |

### Shared Module Routes

| Old Route | New Route | Status |
|-----------|-----------|--------|
| `/d/[workspaceid]/dashboard` | `/d/[workspaceid]/shared/dashboard` | ✅ Available |
| `/d/[workspaceid]/billing` | `/d/[workspaceid]/shared/billing` | ✅ Available |
| `/d/[workspaceid]/insurance` | `/d/[workspaceid]/shared/insurance` | ✅ Available |
| `/d/[workspaceid]/staff` | `/d/[workspaceid]/shared/staff` | ✅ Available |
| `/d/[workspaceid]/departments` | `/d/[workspaceid]/shared/departments` | ✅ Available |
| `/d/[workspaceid]/todos` | `/d/[workspaceid]/shared/todos` | ✅ Available |

---

## API Routes

### EHR API Routes

| Old Endpoint | New Endpoint | Status |
|--------------|--------------|--------|
| `/api/d/[workspaceid]/patients/*` | `/api/ehr/patients/*` | ✅ Available |
| `/api/d/[workspaceid]/appointments/*` | `/api/ehr/appointments/*` | ✅ Available |
| `/api/d/[workspaceid]/operations/*` | `/api/ehr/operations/*` | ✅ Available |
| `/api/d/[workspaceid]/doctor/*` | `/api/ehr/doctor/*` | ✅ Available |
| `/api/d/[workspaceid]/doctors/*` | `/api/ehr/doctors/*` | ✅ Available |
| `/api/d/[workspaceid]/referrals/*` | `/api/ehr/referrals/*` | ✅ Available |
| `/api/d/[workspaceid]/openehr-orders/*` | `/api/ehr/openehr/*` | ✅ Available |

### LIMS API Routes

| Old Endpoint | New Endpoint | Status |
|--------------|--------------|--------|
| `/api/d/[workspaceid]/lab-orders/*` | `/api/lims/orders/*` | ✅ Available |
| `/api/d/[workspaceid]/test-results/*` | `/api/lims/results/*` | ✅ Available |
| `/api/d/[workspaceid]/test-reference/*` | `/api/lims/reference-ranges/*` | ✅ Available |
| `/api/d/[workspaceid]/test-reference-ranges/*` | `/api/lims/reference-ranges-config/*` | ✅ Available |
| `/api/d/[workspaceid]/worklists/*` | `/api/lims/worklists/*` | ✅ Available |
| `/api/d/[workspaceid]/accession-samples/*` | `/api/lims/accession-samples/*` | ✅ Available |
| `/api/d/[workspaceid]/lab-report/*` | `/api/lims/reports/*` | ✅ Available |
| `/api/d/[workspaceid]/laboratory-types/*` | `/api/lims/laboratory-types/*` | ✅ Available |
| `/api/d/[workspaceid]/labs/*` | `/api/lims/laboratories/*` | ✅ Available |
| `/api/d/[workspaceid]/tat/*` | `/api/lims/turnaround-time/*` | ✅ Available |
| `/api/d/[workspaceid]/validation-state/*` | `/api/lims/validation/*` | ✅ Available |

### Pharmacy API Routes

| Old Endpoint | New Endpoint | Status |
|--------------|--------------|--------|
| `/api/d/[workspaceid]/pharmacy-dashboard/*` | `/api/pharmacy/dashboard/*` | ✅ Available |
| `/api/d/[workspaceid]/pharmacy-drugs/*` | `/api/pharmacy/drugs/*` | ✅ Available |
| `/api/d/[workspaceid]/pharmacy-inventory/*` | `/api/pharmacy/inventory/*` | ✅ Available |
| `/api/d/[workspaceid]/pharmacy-orders/*` | `/api/pharmacy/orders/*` | ✅ Available |
| `/api/d/[workspaceid]/pharmacy-prescriptions/*` | `/api/pharmacy/prescriptions/*` | ✅ Available |
| `/api/d/[workspaceid]/pharmacies/*` | `/api/pharmacy/pharmacies/*` | ✅ Available |

### Admin API Routes

| Old Endpoint | New Endpoint | Status |
|--------------|--------------|--------|
| `/api/d/[workspaceid]/admin-check/*` | `/api/admin/check/*` | ✅ Available |
| `/api/d/[workspaceid]/departments/*` | `/api/admin/departments/*` | ✅ Available |
| `/api/d/[workspaceid]/staff/*` | `/api/admin/staff/*` | ✅ Available |
| `/api/d/[workspaceid]/users/*` | `/api/admin/users/*` | ✅ Available |
| `/api/d/[workspaceid]/workspace-info/*` | `/api/admin/workspace/*` | ✅ Available |

### Shared API Routes

| Old Endpoint | New Endpoint | Status |
|--------------|--------------|--------|
| `/api/d/[workspaceid]/equipment/*` | `/api/shared/equipment/*` | ✅ Available |
| `/api/d/[workspaceid]/materials/*` | `/api/shared/materials/*` | ✅ Available |
| `/api/d/[workspaceid]/suppliers/*` | `/api/shared/suppliers/*` | ✅ Available |
| `/api/d/[workspaceid]/insurance-companies/*` | `/api/shared/insurance/*` | ✅ Available |
| `/api/d/[workspaceid]/shop-orders/*` | `/api/shared/shop/*` | ✅ Available |
| `/api/d/[workspaceid]/todos/*` | `/api/shared/todos/*` | ✅ Available |

---

## Component Imports

### EHR Components

| Old Import | New Import |
|------------|------------|
| `@/components/patients/*` | `@/components/ehr/patients/*` |
| `@/components/shared/EnhancedLabOrderForm` | `@/components/ehr/lab-orders/EnhancedLabOrderForm` |
| `@/components/shared/EnhancedLabOrderFormMultiple` | `@/components/ehr/lab-orders/EnhancedLabOrderFormMultiple` |
| `@/components/shared/LabOrderFormModal` | `@/components/ehr/lab-orders/LabOrderFormModal` |
| `@/components/shared/vital-signs-form` | `@/components/ehr/vital-signs/vital-signs-form` |

### LIMS Components

| Old Import | New Import |
|------------|------------|
| `@/components/lab-tech/*` | `@/components/lims/lab-tech/*` |

### Shared Components

| Old Import | New Import |
|------------|------------|
| `@/components/shared/workspace-icons` | `@/components/shared/workspace-icons` |

---

## Migration Strategy

### Phase 1: Dual Support (Current)
- Both old and new routes work
- No breaking changes
- Gradual migration possible

### Phase 2: Update References
- Update navigation to use new routes
- Update API calls to use new endpoints
- Update component imports

### Phase 3: Deprecation (Future)
- Mark old routes as deprecated
- Add console warnings
- Set deprecation timeline

### Phase 4: Removal (Future)
- Remove old route files
- Clean up deprecated code
- Final testing

---

## Usage Examples

### Frontend Navigation

**Old:**
```typescript
router.push(`/d/${workspaceId}/patients/${patientId}`);
```

**New:**
```typescript
router.push(`/d/${workspaceId}/ehr/patients/${patientId}`);
```

### API Calls

**Old:**
```typescript
const response = await fetch(`/api/d/${workspaceId}/patients/${patientId}`);
```

**New:**
```typescript
const response = await fetch(`/api/ehr/patients/${patientId}`);
```

### Component Imports

**Old:**
```typescript
import { EnhancedLabOrderForm } from '@/components/shared/EnhancedLabOrderForm';
```

**New:**
```typescript
import { EnhancedLabOrderForm } from '@/components/ehr/lab-orders/EnhancedLabOrderForm';
```

---

## Path Aliases

Use these TypeScript path aliases for clean imports:

```typescript
// Frontend routes
import * as EHR from '@/ehr/*';
import * as LIMS from '@/lims/*';
import * as Pharmacy from '@/pharmacy/*';
import * as Admin from '@/admin/*';
import * as Shared from '@/shared/*';

// Components
import * as EHRComponents from '@/components/ehr/*';
import * as LIMSComponents from '@/components/lims/*';
import * as PharmacyComponents from '@/components/pharmacy/*';
import * as AdminComponents from '@/components/admin/*';

// API routes
import * as EHRAPI from '@/api/ehr/*';
import * as LIMSAPI from '@/api/lims/*';
import * as PharmacyAPI from '@/api/pharmacy/*';
import * as AdminAPI from '@/api/admin/*';
import * as SharedAPI from '@/api/shared/*';
```

---

## Notes

- ✅ All new routes are available and working
- ✅ Old routes remain functional (backward compatible)
- ⏳ Navigation updates pending
- ⏳ API client updates pending
- ⏳ Component import updates pending

---

*Last Updated: Phase 5 - Route Mapping Documentation*
