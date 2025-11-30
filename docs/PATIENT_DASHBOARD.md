# Patient Dashboard

This document describes the current patient dashboard layout and interaction patterns for `/app/d/[workspaceid]/patients/[patientid]/patient-dashboard.tsx`.

## Header

- Shows **patient name** as the main title.
- Second line shows: `Age | Gender | Blood <group>`.
- Optional third line shows `National ID` when available.
- Right side contains:
  - `Patient Overview` button (navigates to the overview page for this patient).
  - `Back` button (uses the router history to go back).

## Tabs

A single horizontal tab bar under the header provides access to major sections:

- **Dashboard** – high-level summary (see below).
- **Notes** – clinical notes.
- **Vitals** – full vital-signs monitor with history and entry form.
- **Appointments** – upcoming and past appointments.
- **History** – medical history records.
- **Diagnoses** – problem/diagnosis list.
- **Labs** – lab results.
- **Imaging** – imaging requests and results.
- **Orders** – laboratory test orders.
- **Meds** – prescriptions (openEHR medication orders).
- **Care Plans** – care plans.
- **Vaccines** – vaccination records.
- **Referrals** – referrals to other providers or departments.

Tabs do **not** cause additional API calls when switching. All patient data is loaded once on mount via `useEffect` and stored in component state; each tab only reads from that state.

## Dashboard tab

The `Dashboard` tab is the default and contains:

1. **Compact 3-column summary**
   - **Patient Contact**
     - Phone (click-to-call), email (mailto), and address.
     - Shows a fallback message if no contact details are recorded.
   - **Key Vitals**
     - Latest blood pressure, heart rate, temperature, and SpO₂ (if available).
   - **Vaccination Summary**
     - Latest vaccine name and targeted disease.
     - Last vaccine date and next due date when available.

2. **Clinical Summary**
   - Active diagnoses (example list for now).
   - Current medications (first few prescriptions if present; otherwise a fallback message).
   - Allergies & alerts (example text plus pointer to the History tab).
   - Recent activity (last visit from notes, last vitals from vital-signs data).

## Dummy data

Some sections show **example data** when no real records exist, to make the UI easier to evaluate:

- **Laboratory Test Orders**
  - When there are no `testOrderRecords`, two example orders are rendered (CBC/ESR and Fasting Lipid Profile).
  - A note under the examples states:
    > "Example data for demonstration. Real laboratory test orders will appear here once created."

- **Prescriptions**
  - When there are no `prescriptionRecords`, a small table renders two example active medications (Atorvastatin and Metformin).
  - A note under the table states:
    > "Example data for demonstration. Real prescriptions will appear here once recorded."

When real data is present, the real records replace the dummy examples automatically.

## Vital Signs styling

- In the **Vitals** tab, each metric card (Temperature, Blood Pressure, Heart Rate, Respiratory Rate, SpO₂) uses a consistent blue color scheme:
  - `bg-blue-50` background
  - `border-blue-100` border
  - Blue icon and value text.

## Button styling

- Primary action buttons on the patient dashboard now use a consistent black style:
  - `bg-black hover:bg-black/80 text-white`.
- This applies, for example, to:
  - `Record New` (Vitals tab)
  - `Record Vaccination` and vaccination `Save`
  - `New Referral` and referral `Save`.
- Secondary actions (e.g. `Cancel`, some prompts) still use the outline variant.
