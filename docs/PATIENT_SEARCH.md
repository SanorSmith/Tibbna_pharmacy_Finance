# Patient Search Update

## Overview
- The dedicated `/patients/search` route was removed because it duplicated functionality already available in the main patient list view.
- Search is now handled entirely within `app/d/[workspaceid]/patients/patients-list.tsx`, which filters patients by full name (first, middle, last) and National ID.

## Navigation
- Sidebar entries for "Search Patient" no longer appear for any role; only the canonical "Patient List" remains under the Patients group.

## Why this change?
1. It keeps the experience on a single page, reducing navigation clicks for clinicians.
2. The built-in search is more flexible (name + National ID, case-insensitive, partial matches) and better suited to the existing workspace data.
3. Reduces routing surface area and maintenance overhead.
