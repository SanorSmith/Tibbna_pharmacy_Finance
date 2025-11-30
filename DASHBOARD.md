# Administrator Dashboard

## Overview
Comprehensive administrator dashboard providing real-time statistics, key metrics, and quick access to all management features. The dashboard serves as the central hub for administrators to monitor and manage the entire workspace.

## Access
- **Route**: `/d/[workspaceid]/dashboard`
- **Role**: Administrator only
- **Navigation**: First item in administrator sidebar menu

## Features

### Key Metrics Section
Displays essential statistics in card format:

**1. Total Patients**
- Shows total number of registered patients
- Icon: Users
- Description: "Registered in system"

**2. Staff Members**
- Shows total number of active staff
- Icon: UserCheck
- Description: "Active staff"

**3. Total Appointments**
- Shows all-time appointment count
- Icon: Calendar
- Description: "All time"

**4. Departments**
- Shows number of active departments
- Icon: Building
- Description: "Active departments"

### Today's Activity Section
Real-time activity metrics with color-coded borders:

**1. Today's Appointments** (Blue border)
- Count of appointments scheduled for today
- Icon: Clock
- Description: "Scheduled for today"

**2. Pending Appointments** (Amber border)
- Count of appointments awaiting check-in
- Icon: AlertCircle
- Description: "Awaiting check-in"

**3. System Status** (Green border)
- Overall system health indicator
- Icon: Activity
- Shows: "Active" / "All systems operational"

### Facilities Overview Section
Summary of facility resources:

**1. Laboratories**
- Total number of lab facilities
- Icon: TestTube
- Description: "Lab facilities"

**2. Pharmacies**
- Total number of pharmacy locations
- Icon: Pill
- Description: "Pharmacy locations"

**3. Growth**
- Combined total of patients and staff registrations
- Icon: TrendingUp
- Description: "Total registrations"

### Quick Actions Section
Direct navigation cards to key management areas:

**Primary Actions** (with filled buttons):
1. **Manage Patients** - Navigate to patient list
2. **Manage Staff** - Navigate to staff list
3. **View Appointments** - Navigate to appointments

**Secondary Actions** (with outline buttons):
4. **Departments** - Manage hospital departments
5. **Laboratories** - Manage lab facilities
6. **Pharmacies** - Manage pharmacy locations

## Technical Implementation

### Files
- `/app/d/[workspaceid]/dashboard/page.tsx` - Server component with auth check
- `/app/d/[workspaceid]/dashboard/dashboard-content.tsx` - Client component with data fetching

### Data Fetching
Dashboard fetches data from multiple endpoints in parallel:
- `/api/d/[workspaceid]/patients`
- `/api/d/[workspaceid]/staff`
- `/api/d/[workspaceid]/appointments`
- `/api/d/[workspaceid]/departments`
- `/api/d/[workspaceid]/labs`
- `/api/d/[workspaceid]/pharmacies`

### Calculations
- **Today's Appointments**: Filters appointments with `starttime` between today 00:00 and tomorrow 00:00
- **Pending Appointments**: Filters appointments with status "scheduled"
- **Growth**: Sum of total patients and staff

### UI Components
- Shadcn UI Card, CardHeader, CardTitle, CardDescription, CardContent
- Shadcn UI Button
- Lucide React icons
- Next.js Link for navigation
- Responsive grid layouts (1/2/3/4 columns)

## Layout & Styling

### Grid Layouts
- **Key Metrics**: 4 columns (lg), 2 columns (md), 1 column (mobile)
- **Today's Activity**: 3 columns (lg), 2 columns (md), 1 column (mobile)
- **Facilities**: 3 columns (lg), 2 columns (md), 1 column (mobile)
- **Quick Actions**: 3 columns (lg), 2 columns (md), 1 column (mobile)

### Visual Hierarchy
- Section headings: `text-xl font-semibold`
- Metric values: `text-2xl font-bold`
- Descriptions: `text-xs text-muted-foreground`
- Hover effects: `hover:shadow-md transition-shadow` on action cards

### Color Coding
- Blue border: Today's activity
- Amber border: Pending/warning items
- Green border: System status/healthy

## Navigation Integration

### Sidebar Menu
Dashboard appears as the first item in the administrator menu:
```
Administrator Menu:
├── Dashboard (LayoutDashboard icon)
├── Appointments
├── Patients
├── Staff Management
├── Pharmacy
├── Lab
└── Department
```

### Active State Highlighting
- Uses `usePathname()` hook to detect current route
- Automatically highlights active menu item
- Sub-items also show active state
- Collapsible sections auto-expand when child is active

## Access Control

### Authorization
- Checks if user is workspace administrator
- Checks if user has global admin permissions
- Redirects non-administrators to workspace home

### Permission Check
```typescript
const isAdmin = membership?.role === "administrator";
const isGlobalAdmin = normalizePerms(user.permissions).includes("admin");
```

## Loading States
- Shows "Loading dashboard..." while fetching data
- Shows "Failed to load dashboard data" on error
- Graceful fallback for missing data (shows 0 for counts)

## Usage

### Accessing Dashboard
1. Log in as administrator
2. Dashboard is the first item in sidebar
3. Click "Dashboard" to view overview

### Monitoring Metrics
- View real-time statistics at a glance
- Check today's activity for daily operations
- Monitor pending appointments requiring attention

### Quick Navigation
- Click any quick action card to navigate to that section
- Use primary actions for most common tasks
- Use secondary actions for facility management

## Future Enhancements
Potential additions for future versions:
- Charts and graphs for trend visualization
- Recent activity feed
- Notifications and alerts
- Performance metrics
- Resource utilization stats
- Appointment completion rates
- Staff availability overview
