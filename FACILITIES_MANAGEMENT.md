# Facilities Management (Labs & Pharmacies)

## Overview
Comprehensive management system for laboratory and pharmacy facilities with full CRUD operations. Features inline add/edit functionality and delete confirmations. Consistent UI pattern across both facility types.

## Database Schema

### Table: `labs`
- `labid` (UUID, Primary Key, Auto-generated)
- `workspaceid` (UUID, Foreign Key to workspaces)
- `name` (TEXT, Required) - Lab name
- `phone` (TEXT, Optional) - Contact phone number
- `email` (TEXT, Optional) - Contact email address
- `address` (TEXT, Optional) - Physical address/location
- `createdat` (TIMESTAMP)
- `updatedat` (TIMESTAMP)

### Table: `pharmacies`
- `pharmacyid` (UUID, Primary Key, Auto-generated)
- `workspaceid` (UUID, Foreign Key to workspaces)
- `name` (TEXT, Required) - Pharmacy name
- `phone` (TEXT, Optional) - Contact phone number
- `email` (TEXT, Optional) - Contact email address
- `address` (TEXT, Optional) - Physical address/location
- `createdat` (TIMESTAMP)
- `updatedat` (TIMESTAMP)

## Files

### 1. Database Layer
- `/lib/db/tables/lab.ts` - Drizzle ORM schema for labs
- `/lib/db/tables/pharmacy.ts` - Drizzle ORM schema for pharmacies
- `/lib/db/schema.ts` - Exports both tables

### 2. API Routes - Labs
- `/app/api/d/[workspaceid]/labs/route.ts`
  - `GET` - List all labs for a workspace
  - `POST` - Create a new lab
- `/app/api/d/[workspaceid]/labs/[labid]/route.ts`
  - `PATCH` - Update lab information
  - `DELETE` - Delete a lab

### 3. API Routes - Pharmacies
- `/app/api/d/[workspaceid]/pharmacies/route.ts`
  - `GET` - List all pharmacies for a workspace
  - `POST` - Create a new pharmacy
- `/app/api/d/[workspaceid]/pharmacies/[pharmacyid]/route.ts`
  - `PATCH` - Update pharmacy information
  - `DELETE` - Delete a pharmacy

### 4. Pages & Components
- `/app/d/[workspaceid]/lab/page.tsx` - Labs list page with inline add/edit
- `/app/d/[workspaceid]/pharmacy/page.tsx` - Pharmacies list page with inline add/edit

## Features

### Labs Page (`/d/{workspaceid}/lab`)

#### List View
- **Grid Display** - Cards showing all labs with contact information
- **Add Button** - "Add Lab" button at top right
- **Edit Button** - Pencil icon on each lab card
- **Delete Button** - Trash icon on each lab card
- **Empty State** - Helpful message when no labs exist
- **Real-time Updates** - List refreshes after add/edit/delete operations

#### Lab Information
- Lab name with TestTube icon
- Lab ID (first 8 characters)
- Phone number
- Email address
- Physical address
- "No contact details available" message if all contact fields empty

### Pharmacies Page (`/d/{workspaceid}/pharmacy`)

#### List View
- **Grid Display** - Cards showing all pharmacies with contact information
- **Add Button** - "Add Pharmacy" button at top right
- **Edit Button** - Pencil icon on each pharmacy card
- **Delete Button** - Trash icon on each pharmacy card
- **Empty State** - Helpful message when no pharmacies exist
- **Real-time Updates** - List refreshes after add/edit/delete operations

#### Pharmacy Information
- Pharmacy name with Pill icon
- Pharmacy ID (first 8 characters)
- Phone number
- Email address
- Physical address
- "No contact details available" message if all contact fields empty

## Add/Edit Dialog (Unified)
Both labs and pharmacies use the same dialog pattern for add and edit operations.

### Registration Section
- **Facility Name** (Required)
  - Labs: "e.g., Clinical Lab, Pathology Lab, Microbiology Lab"
  - Pharmacies: "e.g., Central Pharmacy, Community Pharmacy"

### Contact Details Section
- **Phone** (Optional) - Contact phone number
- **Email** (Optional) - Contact email address
- **Address** (Optional) - Physical location (textarea, 3 rows)

### Edit Mode
- Dialog title changes to "Edit Lab" or "Edit Pharmacy"
- Form pre-fills with existing facility data
- Save button updates existing facility

### Delete Confirmation
- Professional AlertDialog confirmation
- Warns that action cannot be undone
- Shows facility name being deleted
- Separate confirmation for each facility type

## Usage

### Labs Management

#### 1. Access the Page
- **Labs List**: `/d/{workspaceid}/lab`

#### 2. Adding a Lab
1. Click "Add Lab" button
2. Enter lab name (required)
3. Optionally add contact details
4. Click "Register Lab"
5. List updates immediately

#### 3. Editing a Lab
1. Click pencil icon on lab card
2. Modify fields as needed
3. Click "Save Changes"
4. List updates immediately

#### 4. Deleting a Lab
1. Click trash icon on lab card
2. Confirm deletion in AlertDialog
3. Lab removed from list immediately

### Pharmacies Management

#### 1. Access the Page
- **Pharmacies List**: `/d/{workspaceid}/pharmacy`

#### 2. Adding a Pharmacy
1. Click "Add Pharmacy" button
2. Enter pharmacy name (required)
3. Optionally add contact details
4. Click "Register Pharmacy"
5. List updates immediately

#### 3. Editing a Pharmacy
1. Click pencil icon on pharmacy card
2. Modify fields as needed
3. Click "Save Changes"
4. List updates immediately

#### 4. Deleting a Pharmacy
1. Click trash icon on pharmacy card
2. Confirm deletion in AlertDialog
3. Pharmacy removed from list immediately

## Form Validation
- Facility name is required
- All contact fields (phone, email, address) are optional
- Form displays error messages for validation failures
- Success closes dialog and refreshes the list automatically

## UI Components Used
- Shadcn UI components (Button, Input, Textarea, Card, Label, Dialog, AlertDialog)
- Lucide React icons:
  - Labs: TestTube, Phone, Mail, MapPin, Plus, Edit, Trash2
  - Pharmacies: Pill, Phone, Mail, MapPin, Plus, Edit, Trash2
- Next.js App Router with Client Components
- Client-side form handling with loading states and error handling

## Consistent UI Pattern
Both labs and pharmacies follow the exact same UI pattern:
- Same card layout and styling
- Same dialog structure
- Same edit/delete button placement
- Same confirmation dialogs
- Same form validation
- Same empty states

## Access Control
- All authenticated users in the workspace can:
  - View facility lists
  - Add new facilities
  - Edit existing facilities
  - Delete facilities
- No special role restrictions (unlike patients or staff)

## Navigation
- Labs accessible from sidebar: "Lab" → "Lab Tests"
- Pharmacies accessible from sidebar: "Pharmacy"
