# Application URLs Guide

This document provides the correct URLs to access each application module independently in separate browser tabs.

## Quick Access URLs

Replace `{workspaceid}` with your actual workspace ID (e.g., `fa9fb036-a7eb-49af-890c-54406dad139d`)

### EHR (Electronic Health Records)
```
http://localhost:3000/d/{workspaceid}/ehr
```
- **Doctor role**: Redirects to `/ehr/doctor`
- **Nurse role**: Redirects to `/ehr/patients`
- **Other roles**: Redirects to `/ehr/patients`

### LIMS (Laboratory Information Management System)
```
http://localhost:3000/d/{workspaceid}/lims
```
- **Lab Technician role**: Redirects to `/lims/lab-tech`
- **Admin role**: Redirects to `/lims/management`
- **Other roles**: Redirects to `/lims/dashboard`

### Pharmacy
```
http://localhost:3000/d/{workspaceid}/pharmacy
```
- Redirects to `/pharmacy/dashboard` for all roles

## Direct Access URLs (Bypass Role Redirects)

If you want to go directly to a specific section:

### EHR Direct URLs
```
Patients List:    http://localhost:3000/d/{workspaceid}/ehr/patients
Doctor Dashboard: http://localhost:3000/d/{workspaceid}/ehr/doctor
Appointments:     http://localhost:3000/d/{workspaceid}/ehr/appointments
Operations:       http://localhost:3000/d/{workspaceid}/ehr/operations
Schedule:         http://localhost:3000/d/{workspaceid}/ehr/schedule
```

### LIMS Direct URLs
```
Dashboard:        http://localhost:3000/d/{workspaceid}/lims/dashboard
Lab Tech:         http://localhost:3000/d/{workspaceid}/lims/lab-tech
Management:       http://localhost:3000/d/{workspaceid}/lims/management
```

### Pharmacy Direct URLs
```
Dashboard:        http://localhost:3000/d/{workspaceid}/pharmacy/dashboard
Orders:           http://localhost:3000/d/{workspaceid}/pharmacy/orders
```

## Multi-Tab Workflow

To work with multiple applications simultaneously:

1. **Open Tab 1**: `http://localhost:3000/d/{workspaceid}/ehr`
2. **Open Tab 2**: `http://localhost:3000/d/{workspaceid}/lims`
3. **Open Tab 3**: `http://localhost:3000/d/{workspaceid}/pharmacy`

### Benefits:
- ✅ **Same authentication session** across all tabs
- ✅ **No cross-tab interference** - each tab stays in its app
- ✅ **Refresh safely** - each tab maintains its app context
- ✅ **Easy switching** - just click between tabs

### Important Notes:
- **DO NOT** navigate to the base workspace URL `/d/{workspaceid}` as it will trigger role-based redirects
- **Always use** the app-specific URLs (`/ehr`, `/lims`, `/pharmacy`)
- **Bookmark** your frequently used URLs for quick access
- Each app has its own navigation and won't redirect you to other apps

## Example with Real Workspace ID

If your workspace ID is `fa9fb036-a7eb-49af-890c-54406dad139d`:

```
EHR:      http://localhost:3000/d/fa9fb036-a7eb-49af-890c-54406dad139d/ehr
LIMS:     http://localhost:3000/d/fa9fb036-a7eb-49af-890c-54406dad139d/lims
Pharmacy: http://localhost:3000/d/fa9fb036-a7eb-49af-890c-54406dad139d/pharmacy
```

## Troubleshooting

**Problem**: Refreshing a page redirects me to a different app
**Solution**: Make sure you're using the app-specific URLs above, not the base workspace URL

**Problem**: I want to access a specific section directly
**Solution**: Use the "Direct Access URLs" listed above to bypass role-based redirects

**Problem**: I need to switch between apps frequently
**Solution**: Open each app in a separate browser tab using the URLs above
