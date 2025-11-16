# Doctor Schedule Feature

This document explains the end-to-end implementation of the doctor schedule feature: schema, migrations, APIs, UI, dependencies, access control, and troubleshooting.

## 1) Database Schema and Migrations
- Table: `appointments` (Drizzle ORM)
- File: `lib/db/tables/appointment.ts` (exported from `lib/db/schema.ts`)
- Columns:
  - `appointmentid` uuid pk
  - `workspaceid` uuid fk -> workspaces
  - `patientid` uuid fk -> patients
  - `doctorid` uuid fk -> users
  - `starttime`, `endtime` timestamptz
  - `location` text (optional)
  - `status` enum: `scheduled` | `checked_in` | `in_progress` | `completed` | `cancelled`
  - `notes` jsonb (default `{}`)
  - `createdat`, `updatedat`
- Migrations:
  - Generate: `npm run migrate`
  - Apply: `npm run migrate-push`

## 2) API Endpoints
- List and Create: `app/api/d/[workspaceid]/appointments/route.ts`
  - GET `?from=<ISO>&to=<ISO>&doctorid=<optional>`: list appointments by date range (and doctor if provided).
  - POST body `{ patientid, starttime, endtime, location?, status? }`: create appointment (doctor defaults to current user if role = doctor).
- Update: `app/api/d/[workspaceid]/appointments/[appointmentid]/route.ts`
  - PATCH body `{ starttime?, endtime?, status?, location?, notes? }`: update appointment fields.
- Security: role-based gating (workspace `doctor` or `administrator`) and workspace scoping on all endpoints.

## 3) Access Control
- Server page guard in `app/d/[workspaceid]/schedule/page.tsx` validates workspace membership and role (doctor/admin); redirects if unauthorized.
- API routes enforce the same.

## 4) Navigation
- Sidebar config: `components/sidebar/nav-main.tsx`
  - Schedule link uses `${base}/schedule` for workspace-aware routing (doctor/nurse entries; doctor was correct, nurse updated).

## 5) UI (Schedule Page)
- Server component: `app/d/[workspaceid]/schedule/page.tsx`
  - Awaits dynamic params; checks access; renders client `ScheduleView`.
- Client component: `app/d/[workspaceid]/schedule/schedule-view.tsx`
  - FullCalendar with Day/Week/Month views, date navigation.
  - Drag/resizing events calls PATCH to reschedule.
  - Clicking a slot opens a patient picker (search by name/email/national ID/UUID) to create a 30-min appointment.
  - Right side panel shows “In Progress” and “Checked In”.
  - Event titles and side panel items display patient full name and national ID when available (fallback to UUID).
  - No live polling; data reloads on view/date change and after edits.

## 6) Dependencies & Styles
- Install:
  - `npm install @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction`
- Styles:
  - The installed packages did not ship CSS in this setup, so CDN styles are included in `app/layout.tsx` `<head>`:
    - `https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6/index.global.min.css`
    - `https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6/index.global.min.css`

## 7) Patient Picker
- Triggered by calendar date click.
- Loads patients via `/api/d/[workspaceid]/patients` (on demand) and filters in the client.
- Selecting a patient creates an appointment and reloads current range.

## 8) Rescheduling
- Drag & drop / resize an event to update `starttime` and `endtime` with PATCH.
- Doctors can only modify their own appointments; admins can modify any in the workspace.

## 9) Troubleshooting
- "relation appointments does not exist": run `npm run migrate` then `npm run migrate-push`.
- FullCalendar CSS module not found: CDN links are added to `app/layout.tsx`.
- Missing types for drag/drop: some versions don’t export `EventDropArg`; handler uses `any` for compatibility.
- No names shown: ensure patients endpoint returns data; component loads patients on `datesSet` and on opening the picker.
- Unauthorized: ensure the user is logged in and is a doctor/admin in the selected workspace.

## 10) Quick Test
1. Navigate to `/d/<workspaceid>/schedule` as a doctor/admin.
2. Click a time slot → choose a patient → appointment is created.
3. Drag/resize the event → appointment rescheduled.
4. Side panel shows In Progress / Checked In when statuses match.

## 11) Future Enhancements
- Inline status actions (check-in/start/complete) on event click.
- Real-time updates (SSE/WebSockets).
- Custom event content (location badge, status pill, patient avatar).
- Server-side patient search for large datasets.

---
Maintainers: Update this document when changing related schema, APIs, or UI behaviors.
