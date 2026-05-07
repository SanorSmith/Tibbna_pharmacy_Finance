-- Add isactive column to pos_shifts table
ALTER TABLE pos_shifts ADD COLUMN IF NOT EXISTS isactive BOOLEAN NOT NULL DEFAULT TRUE;
