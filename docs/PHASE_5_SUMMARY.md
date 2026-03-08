# Phase 5: Import Updates & Route Mapping - IN PROGRESS

## Summary

Phase 5 focuses on updating imports, navigation, and API calls to use the new module-specific structure. This phase is partially complete with comprehensive documentation created.

---

## ✅ Completed Tasks

### 1. Route Mapping Documentation
**Status**: Complete

Created comprehensive route mapping documentation (`ROUTE_MAPPING.md`) that includes:
- Frontend route mappings (old → new)
- API endpoint mappings (old → new)
- Component import mappings
- Migration strategy (4 phases)
- Usage examples
- Path alias reference

**Coverage:**
- 14 frontend routes mapped
- 35+ API endpoints mapped
- 7 component imports mapped
- Migration examples provided

---

## ⏳ Remaining Tasks

### 2. Update Navigation/Sidebar
**Status**: Pending

**Tasks:**
- [ ] Locate sidebar/navigation configuration
- [ ] Update route references to use new module paths
- [ ] Add module grouping in navigation
- [ ] Test navigation links

**Files to Update:**
- `components/sidebar/*`
- Navigation configuration files
- Menu/route definitions

### 3. Update API Client Calls
**Status**: Pending

**Tasks:**
- [ ] Create module-specific API client helpers
- [ ] Update fetch/axios calls to use new endpoints
- [ ] Update React Query keys
- [ ] Test API calls

**Strategy:**
- Create helper functions for each module
- Gradual migration (keep old endpoints working)
- Use path aliases for clean imports

### 4. Update Component Imports
**Status**: Pending

**Tasks:**
- [ ] Update imports in page components
- [ ] Update imports in other components
- [ ] Run linter and fix issues
- [ ] Test component rendering

**Approach:**
- Use find/replace for common patterns
- Update imports file by file
- Test after each major change

---

## Migration Strategy

### Current Approach: Dual Support
- ✅ Both old and new routes work
- ✅ No breaking changes
- ✅ Backward compatible
- ⏳ Gradual migration in progress

### Next Steps
1. **Update navigation** to use new routes
2. **Create API helpers** for module-specific calls
3. **Update imports** gradually
4. **Test thoroughly** after each change

---

## Route Mapping Reference

### Frontend Routes

**EHR Module:**
```
/d/[workspaceid]/patients        → /d/[workspaceid]/ehr/patients
/d/[workspaceid]/doctor          → /d/[workspaceid]/ehr/doctor
/d/[workspaceid]/appointments    → /d/[workspaceid]/ehr/appointments
/d/[workspaceid]/operations      → /d/[workspaceid]/ehr/operations
/d/[workspaceid]/schedule        → /d/[workspaceid]/ehr/schedule
```

**LIMS Module:**
```
/d/[workspaceid]/lab-tech        → /d/[workspaceid]/lims/lab-tech
/d/[workspaceid]/lab-management  → /d/[workspaceid]/lims/management
/d/[workspaceid]/lab             → /d/[workspaceid]/lims/dashboard
```

**Shared Module:**
```
/d/[workspaceid]/dashboard       → /d/[workspaceid]/shared/dashboard
/d/[workspaceid]/billing         → /d/[workspaceid]/shared/billing
/d/[workspaceid]/insurance       → /d/[workspaceid]/shared/insurance
/d/[workspaceid]/staff           → /d/[workspaceid]/shared/staff
/d/[workspaceid]/departments     → /d/[workspaceid]/shared/departments
/d/[workspaceid]/todos           → /d/[workspaceid]/shared/todos
```

### API Endpoints

**EHR APIs:**
```
/api/d/[workspaceid]/patients/*     → /api/ehr/patients/*
/api/d/[workspaceid]/appointments/* → /api/ehr/appointments/*
/api/d/[workspaceid]/operations/*   → /api/ehr/operations/*
```

**LIMS APIs:**
```
/api/d/[workspaceid]/lab-orders/*   → /api/lims/orders/*
/api/d/[workspaceid]/test-results/* → /api/lims/results/*
/api/d/[workspaceid]/worklists/*    → /api/lims/worklists/*
```

**Pharmacy APIs:**
```
/api/d/[workspaceid]/pharmacy-*/*   → /api/pharmacy/*/
```

---

## Benefits Achieved

✅ **Clear Documentation**: Complete route mapping reference
✅ **Migration Path**: 4-phase strategy defined
✅ **Examples Provided**: Usage examples for all scenarios
✅ **Path Aliases**: Clean import patterns documented
✅ **Backward Compatible**: Old routes still work

---

## Next Actions

1. **Immediate**: Update sidebar navigation
2. **Short-term**: Create API client helpers
3. **Medium-term**: Update component imports
4. **Testing**: Verify all changes work

---

## Documentation Created

- ✅ `ROUTE_MAPPING.md` - Comprehensive route mapping
- ⏳ API client helpers (pending)
- ⏳ Navigation update guide (pending)
- ⏳ Import update checklist (pending)

---

## Commit Details

**Commit**: `6b517f8`  
**Message**: Phase 5: Add comprehensive route mapping documentation  
**Files Changed**: 1 file  
**Insertions**: 236 lines

---

*Phase 5 in progress. Route mapping complete. Navigation updates pending.*
