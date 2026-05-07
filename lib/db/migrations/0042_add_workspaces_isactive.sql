-- Add isactive column to workspaces table
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS isactive BOOLEAN NOT NULL DEFAULT TRUE;
