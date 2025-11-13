-- Migration: Create labs table
-- Description: Adds labs table with name, contact details (phone, email, address)
-- Date: 2025-11-13

CREATE TABLE IF NOT EXISTS labs (
  labid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspaceid UUID NOT NULL REFERENCES workspaces(workspaceid) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  createdat TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedat TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on workspaceid for faster queries
CREATE INDEX IF NOT EXISTS idx_labs_workspaceid ON labs(workspaceid);

-- Add comment to table
COMMENT ON TABLE labs IS 'Laboratory facilities with contact information';
