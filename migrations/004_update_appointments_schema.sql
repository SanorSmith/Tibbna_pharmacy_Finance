-- Migration: Update appointments table with new fields
-- Adds appointment name, type, clinical indication, reason for request, and description

-- Create appointment_name enum
CREATE TYPE appointment_name AS ENUM ('new_patient', 're_visit', 'follow_up');

-- Create appointment_type enum
CREATE TYPE appointment_type AS ENUM ('visiting', 'video_call', 'home_visit');

-- Add new columns to appointments table
ALTER TABLE appointments
ADD COLUMN appointmentname appointment_name NOT NULL DEFAULT 'new_patient',
ADD COLUMN appointmenttype appointment_type NOT NULL DEFAULT 'visiting',
ADD COLUMN clinicalindication TEXT,
ADD COLUMN reasonforrequest TEXT,
ADD COLUMN description TEXT;

-- Add comments for documentation
COMMENT ON COLUMN appointments.appointmentname IS 'Type of patient visit: new patient, re-visit, or follow-up';
COMMENT ON COLUMN appointments.appointmenttype IS 'Mode of appointment: visiting (in-person), video call, or home visit';
COMMENT ON COLUMN appointments.clinicalindication IS 'Clinical indication for the appointment';
COMMENT ON COLUMN appointments.reasonforrequest IS 'Reason for requesting the appointment';
COMMENT ON COLUMN appointments.description IS 'Additional description or notes about the appointment';
