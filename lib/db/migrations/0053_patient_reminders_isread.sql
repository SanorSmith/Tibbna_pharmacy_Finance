-- Migration: Add "isread" column to patient_reminders
-- Tracks notification "read" status separately from "completed" (task done).
-- Additive only — no existing columns touched.

ALTER TABLE "patient_reminders" ADD COLUMN IF NOT EXISTS "isread" boolean NOT NULL DEFAULT false;
