-- Add isactive column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS isactive BOOLEAN NOT NULL DEFAULT TRUE;
