-- Migration: Create patient_reminders table
-- D18: Replace PharmacyTodos with Patient Reminder system

CREATE TABLE IF NOT EXISTS "patient_reminders" (
  "reminderid"    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspaceid"   uuid NOT NULL REFERENCES "workspaces"("workspaceid") ON DELETE CASCADE,
  "patientid"     text,
  "patientname"   text,
  "title"         text NOT NULL,
  "description"   text,
  "reminderdate"  timestamptz,
  "completed"     boolean NOT NULL DEFAULT false,
  "isread"        boolean NOT NULL DEFAULT false,
  "priority"      text NOT NULL DEFAULT 'medium',
  "createdby"     text,
  "createdat"     timestamptz NOT NULL DEFAULT now(),
  "updatedat"     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "patient_reminders_workspace_idx" ON "patient_reminders"("workspaceid");
CREATE INDEX IF NOT EXISTS "patient_reminders_patient_idx"   ON "patient_reminders"("patientid");
