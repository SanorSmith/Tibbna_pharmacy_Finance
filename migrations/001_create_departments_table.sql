-- Migration: Create departments table
-- Description: Adds departments table with name, contact details (phone, email, address)
-- Date: 2025-11-13

CREATE TABLE IF NOT EXISTS departments (
  departmentid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspaceid UUID NOT NULL REFERENCES workspaces(workspaceid) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  createdat TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedat TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on workspaceid for faster queries
CREATE INDEX IF NOT EXISTS idx_departments_workspaceid ON departments(workspaceid);

-- Add comment to table
COMMENT ON TABLE departments IS 'Hospital/clinic departments with contact information';
