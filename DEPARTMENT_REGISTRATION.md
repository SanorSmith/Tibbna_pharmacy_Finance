# Department Registration Feature

## Overview
Department registration system based on the use case diagram with Registration (Name/ID) and Contact (Phone, Email, Address) sections. Features a single-page design with an inline dialog for adding departments.

## Database Schema

### Table: `departments`
- `departmentid` (UUID, Primary Key, Auto-generated)
- `workspaceid` (UUID, Foreign Key to workspaces)
- `name` (TEXT, Required) - Department name
- `phone` (TEXT, Optional) - Contact phone number
- `email` (TEXT, Optional) - Contact email address
- `address` (TEXT, Optional) - Physical address/location
- `createdat` (TIMESTAMP)
- `updatedat` (TIMESTAMP)

## Files Created

### 1. Database Layer
- `/lib/db/tables/department.ts` - Drizzle ORM schema definition
- `/lib/db/schema.ts` - Updated to export department table
- `/migrations/001_create_departments_table.sql` - SQL migration file

### 2. API Routes
- `/app/api/d/[workspaceid]/departments/route.ts`
  - `GET` - List all departments for a workspace
  - `POST` - Create a new department
- `/app/api/d/[workspaceid]/departments/[departmentid]/route.ts`
  - `PATCH` - Update department information
  - `DELETE` - Delete a department

### 3. Pages & Components
- `/app/d/[workspaceid]/departments/page.tsx` - Single page with departments list and inline add dialog

## Features

### All Departments Page
- **List View** - Grid display of all departments with contact information
- **Add Button** - Opens a dialog to register new department
- **Edit Button** - Pencil icon on each card to edit department details
- **Delete Button** - Trash icon on each card to delete department (with confirmation)
- **Empty State** - Helpful message when no departments exist
- **Real-time Updates** - List refreshes after adding, editing, or deleting departments

### Add/Edit Dialog (Unified)
The same dialog is used for both adding new departments and editing existing ones.

#### Registration Section
- **Department Name** (Required) - Text input for department name
- **Department ID** - Auto-generated UUID (displayed as read-only in list view)

#### Contact Details Section
- **Phone** - Optional phone number
- **Email** - Optional email address
- **Address** - Optional physical location/address (textarea)

#### Edit Mode
- Dialog title changes to "Edit Department"
- Form pre-fills with existing department data
- Save button updates existing department

#### Delete Confirmation
- Professional AlertDialog confirmation
- Warns that action cannot be undone
- Shows department name being deleted

## Usage

### 1. Run Database Migration
```bash
# Option 1: Using psql
psql -U your_username -d your_database -f migrations/001_create_departments_table.sql

# Option 2: Using Drizzle Kit
npx drizzle-kit push:pg
```

### 2. Access the Page
- **All Departments**: `/d/{workspaceid}/departments`
- Click "Add Department" button to open registration dialog

### 3. Navigation
The departments page is accessible from the administrator sidebar navigation under "Department" → "All Departments"

## Form Validation
- Department name is required
- All contact fields (phone, email, address) are optional
- Form displays error messages for validation failures
- Success closes dialog and refreshes the list automatically

## UI Components Used
- Shadcn UI components (Button, Input, Textarea, Card, Label, Dialog)
- Lucide React icons (Building, Phone, Mail, MapPin, Plus)
- Next.js App Router with Client Component
- Client-side form handling with loading states and error handling
