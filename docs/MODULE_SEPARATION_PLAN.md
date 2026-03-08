# Module Separation Refactoring Plan

## 🎯 Objective
Reorganize the project structure to clearly separate EHR, LIMS, Pharmacy, and Admin modules for better maintainability, scalability, and team collaboration.

---

## 📊 Current State Analysis

### Current Structure Score: 6/10

**Well-Separated:**
- ✅ **LIMS**: `lab-tech/`, `lab-management/`, `api/lims/`
- ✅ **Pharmacy**: `pharmacy/` folder
- ✅ **Admin**: Dedicated areas

**Not Well-Separated:**
- ❌ **EHR**: Scattered across `patients/`, `doctor/`, `appointments/`, `operations/`
- ❌ **API routes**: Mixed in `api/d/[workspaceid]/` - contains 35+ mixed endpoints
- ❌ **Components**: Mixed in `components/shared/`

### Current Frontend Routes
```
app/d/[workspaceid]/
├── patients/          📋 EHR
├── doctor/            👨‍⚕️ EHR
├── appointments/      📅 EHR
├── operations/        🏥 EHR
├── schedule/          📅 EHR
├── lab-tech/          🔬 LIMS ✅
├── lab-management/    🔬 LIMS ✅
├── lab/               🔬 LIMS
├── pharmacy/          💊 PHARMACY ✅
├── admin/             ⚙️ ADMIN ✅
├── billing/           💰 Shared
├── insurance/         🏢 Shared
├── staff/             👥 Shared
├── departments/       🏢 Shared
└── todos/             📝 Shared
```

### Current API Routes (35+ endpoints in api/d/[workspaceid]/)
**EHR APIs:**
- patients/ (21 endpoints)
- appointments/
- operations/
- doctor/, doctors/
- openehr-orders/
- referrals/

**LIMS APIs:**
- lab-orders/, lims-orders/
- test-results/
- test-reference/, test-reference-ranges/
- worklists/
- accession-samples/
- lab-report/
- laboratory-types/, labs/
- tat/, validation-state/

**Pharmacy APIs:**
- pharmacy-dashboard/
- pharmacy-drugs/
- pharmacy-inventory/
- pharmacy-orders/
- pharmacy-prescriptions/
- pharmacies/

**Admin APIs:**
- admin-check/
- departments/
- staff/
- users/
- workspace-info/

**Shared APIs:**
- equipment/, materials/, suppliers/
- insurance-companies/
- shop-orders/, todos/

---

## 🎯 Target Structure

```
app/
├── d/[workspaceid]/
│   ├── ehr/                           # 📋 EHR MODULE
│   │   ├── patients/
│   │   ├── appointments/
│   │   ├── operations/
│   │   ├── doctor/
│   │   └── referrals/
│   │
│   ├── lims/                          # 🔬 LIMS MODULE
│   │   ├── lab-tech/
│   │   ├── management/
│   │   ├── worklists/
│   │   ├── accession/
│   │   ├── results/
│   │   └── validation/
│   │
│   ├── pharmacy/                      # 💊 PHARMACY MODULE
│   │   ├── dispensing/
│   │   ├── inventory/
│   │   ├── prescriptions/
│   │   ├── orders/
│   │   └── dashboard/
│   │
│   ├── admin/                         # ⚙️ ADMIN MODULE
│   │   ├── users/
│   │   ├── departments/
│   │   ├── staff/
│   │   └── settings/
│   │
│   └── shared/                        # 🔄 SHARED FEATURES
│       ├── dashboard/
│       ├── billing/
│       ├── insurance/
│       ├── equipment/
│       └── todos/
│
├── api/
│   ├── ehr/                           # EHR APIs
│   ├── lims/                          # LIMS APIs (exists)
│   ├── pharmacy/                      # Pharmacy APIs
│   ├── admin/                         # Admin APIs
│   └── shared/                        # Shared APIs
│
└── components/
    ├── ehr/                           # EHR Components
    ├── lims/                          # LIMS Components
    ├── pharmacy/                      # Pharmacy Components
    ├── admin/                         # Admin Components
    └── shared/                        # Shared Components
```

---

## 📝 Migration Strategy - 7 Phases

### ✅ Phase 1: Preparation (COMPLETED)
**Duration**: 1-2 days  
**Status**: ✅ Done

- [x] Create new module folder structure
- [x] Add module README files
- [ ] Update tsconfig.json with path aliases
- [ ] Create module type definitions

### Phase 2: API Routes Migration
**Duration**: 3-5 days  
**Goal**: Move 35+ API endpoints to module-specific folders

**EHR APIs to move:**
```bash
api/d/[workspaceid]/patients/*           → api/ehr/patients/*
api/d/[workspaceid]/appointments/*       → api/ehr/appointments/*
api/d/[workspaceid]/operations/*         → api/ehr/operations/*
api/d/[workspaceid]/doctor/*             → api/ehr/doctor/*
api/d/[workspaceid]/doctors/*            → api/ehr/doctor/*
api/d/[workspaceid]/openehr-orders/*     → api/ehr/openehr/*
api/d/[workspaceid]/referrals/*          → api/ehr/referrals/*
```

**LIMS APIs to consolidate:**
```bash
api/d/[workspaceid]/lab-orders/*         → api/lims/orders/*
api/d/[workspaceid]/lims-orders/*        → api/lims/orders/*
api/d/[workspaceid]/test-results/*       → api/lims/results/*
api/d/[workspaceid]/test-reference*/*    → api/lims/reference-ranges/*
api/d/[workspaceid]/worklists/*          → api/lims/worklists/*
api/d/[workspaceid]/accession-samples/*  → api/lims/accession/*
api/d/[workspaceid]/lab-report/*         → api/lims/reports/*
api/d/[workspaceid]/laboratory-types/*   → api/lims/laboratories/*
api/d/[workspaceid]/labs/*               → api/lims/laboratories/*
api/d/[workspaceid]/tat/*                → api/lims/turnaround-time/*
api/d/[workspaceid]/validation-state/*   → api/lims/validation/*
```

**Pharmacy APIs to move:**
```bash
api/d/[workspaceid]/pharmacy-*/*         → api/pharmacy/*/
api/d/[workspaceid]/pharmacies/*         → api/pharmacy/pharmacies/*
```

**Admin APIs to move:**
```bash
api/d/[workspaceid]/admin-check/*        → api/admin/check/*
api/d/[workspaceid]/departments/*        → api/admin/departments/*
api/d/[workspaceid]/staff/*              → api/admin/staff/*
api/d/[workspaceid]/users/*              → api/admin/users/*
api/d/[workspaceid]/workspace-info/*     → api/admin/workspace/*
```

**Shared APIs to move:**
```bash
api/d/[workspaceid]/equipment/*          → api/shared/equipment/*
api/d/[workspaceid]/materials/*          → api/shared/materials/*
api/d/[workspaceid]/suppliers/*          → api/shared/suppliers/*
api/d/[workspaceid]/insurance-companies/* → api/shared/insurance/*
api/d/[workspaceid]/shop-orders/*        → api/shared/shop/*
api/d/[workspaceid]/todos/*              → api/shared/todos/*
```

### Phase 3: Frontend Routes Migration
**Duration**: 3-5 days  
**Goal**: Reorganize pages by module

**EHR Pages:**
```bash
app/d/[workspaceid]/patients/*      → app/d/[workspaceid]/ehr/patients/*
app/d/[workspaceid]/doctor/*        → app/d/[workspaceid]/ehr/doctor/*
app/d/[workspaceid]/appointments/*  → app/d/[workspaceid]/ehr/appointments/*
app/d/[workspaceid]/operations/*    → app/d/[workspaceid]/ehr/operations/*
app/d/[workspaceid]/schedule/*      → app/d/[workspaceid]/ehr/schedule/*
```

**LIMS Pages:**
```bash
app/d/[workspaceid]/lab-tech/*      → app/d/[workspaceid]/lims/lab-tech/*
app/d/[workspaceid]/lab-management/* → app/d/[workspaceid]/lims/management/*
app/d/[workspaceid]/lab/*           → app/d/[workspaceid]/lims/dashboard/*
```

**Shared Pages:**
```bash
app/d/[workspaceid]/dashboard/*     → app/d/[workspaceid]/shared/dashboard/*
app/d/[workspaceid]/billing/*       → app/d/[workspaceid]/shared/billing/*
app/d/[workspaceid]/insurance/*     → app/d/[workspaceid]/shared/insurance/*
app/d/[workspaceid]/departments/*   → app/d/[workspaceid]/shared/departments/*
app/d/[workspaceid]/staff/*         → app/d/[workspaceid]/shared/staff/*
app/d/[workspaceid]/todos/*         → app/d/[workspaceid]/shared/todos/*
```

### Phase 4: Components Migration
**Duration**: 2-3 days  
**Goal**: Organize components by module ownership

```bash
components/patients/*               → components/ehr/patients/*
components/lab-tech/*               → components/lims/lab-tech/*
components/admin/*                  → components/admin/* (stays)

# Audit shared components
components/shared/EnhancedLabOrderForm* → Split between ehr/ and lims/
components/shared/* (truly shared)  → components/shared/* (stays)
```

### Phase 5: Import Updates
**Duration**: 2-3 days  
**Goal**: Update all import paths and route references

1. Update tsconfig.json path aliases
2. Update API client calls
3. Update component imports
4. Update navigation/sidebar
5. Run linter and fix issues

### Phase 6: Module Boundaries
**Duration**: 2-3 days  
**Goal**: Establish clear module contracts

1. Create module interfaces
2. Define permissions per module
3. Add module middleware
4. Document module contracts

### Phase 7: Testing
**Duration**: 3-5 days  
**Goal**: Ensure nothing breaks

1. Run unit tests
2. Run integration tests
3. Manual testing per module
4. Cross-module testing
5. Performance testing

---

## 📈 Benefits

### 1. Maintainability
- **Clear ownership**: Each module has defined boundaries
- **Easier debugging**: Issues isolated to specific modules
- **Reduced conflicts**: Teams work in separate folders

### 2. Scalability
- **Module independence**: Can scale modules separately
- **Code splitting**: Better bundle sizes per module
- **Team scaling**: Multiple teams can work independently

### 3. Developer Experience
- **Faster navigation**: Clear folder structure
- **Better IDE support**: Improved autocomplete
- **Easier onboarding**: New developers understand structure quickly

### 4. Performance
- **Lazy loading**: Load modules on demand
- **Smaller bundles**: Only load what's needed
- **Better caching**: Module-specific cache strategies

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking Changes | High | Incremental migration, comprehensive testing |
| Import Path Confusion | Medium | Clear documentation, automated updates |
| Team Disruption | Medium | Communication plan, migration guide |
| Performance Regression | Low | Continuous monitoring, benchmarks |

---

## 📅 Timeline

- **Phase 1 (Preparation)**: ✅ COMPLETED
- **Phase 2 (API Migration)**: 3-5 days
- **Phase 3 (Frontend Migration)**: 3-5 days
- **Phase 4 (Components Migration)**: 2-3 days
- **Phase 5 (Import Updates)**: 2-3 days
- **Phase 6 (Module Boundaries)**: 2-3 days
- **Phase 7 (Testing)**: 3-5 days

**Total Estimated Time**: 16-26 days (3-5 weeks)

**Recommended Approach**: Incremental migration over 4-6 weeks with continuous deployment

---

## 🚀 Next Steps

1. ✅ Phase 1 completed - folders and documentation created
2. ⏭️ Update tsconfig.json with path aliases
3. ⏭️ Start Phase 2 - API routes migration
4. ⏭️ Create detailed task breakdown for each phase
5. ⏭️ Set up monitoring for migration progress

---

## 📚 Resources

- Module READMEs in each folder
- API documentation in api/*/README.md
- Migration checklist (see below)

---

## ✅ Migration Checklist

### Pre-Migration
- [ ] Backup database
- [ ] Create feature branch: `git checkout -b refactor/module-separation`
- [ ] Document current routes and APIs
- [ ] Notify team of upcoming changes

### Phase 1: Preparation
- [x] Create new folder structure
- [x] Add module README files
- [ ] Create module type definitions
- [ ] Set up path aliases

### Phase 2-7: See detailed phase descriptions above

---

*Last Updated: Phase 1 Completed*
*Next: Update tsconfig.json and begin Phase 2*
