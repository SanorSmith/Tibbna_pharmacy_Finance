# Shared Module

## 🔄 Shared Workspace Features

This module contains features that are used across multiple modules (EHR, LIMS, Pharmacy, Admin).

## Features

- **Dashboard**: Main workspace dashboard with overview metrics
- **Billing**: Invoice management, payment processing
- **Insurance**: Insurance company management, claims
- **Staff Management**: Staff directory, schedules, assignments
- **Department Management**: Department configuration and organization
- **Equipment**: Equipment tracking and maintenance
- **Todos**: Task management and reminders

## Structure

```
shared/
├── dashboard/         # Main workspace dashboard
├── billing/           # Billing and invoicing
├── insurance/         # Insurance management
├── staff/            # Staff directory
├── departments/      # Department management
├── equipment/        # Equipment tracking
└── todos/            # Task management
```

## Usage Guidelines

- Features here should be truly cross-module
- Module-specific features should live in their respective modules
- Shared components should be generic and reusable

## Integration Points

All modules can access shared features based on user permissions.
