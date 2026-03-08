-- Fix departments table - add missing columns
-- The departments table was missing workspaceid, phone, email, and address columns

-- Add workspaceid column with foreign key to workspaces
ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS workspaceid UUID NOT NULL DEFAULT 'fa9fb036-a7eb-49af-890c-54406dad139d' 
REFERENCES workspaces(workspaceid) ON DELETE CASCADE;

-- Add contact information columns
ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Create index on workspaceid for faster queries
CREATE INDEX IF NOT EXISTS idx_departments_workspaceid ON departments(workspaceid);

COMMENT ON COLUMN departments.workspaceid IS 'Workspace/organization this department belongs to';
COMMENT ON COLUMN departments.phone IS 'Department contact phone number';
COMMENT ON COLUMN departments.email IS 'Department contact email';
COMMENT ON COLUMN departments.address IS 'Department physical address';
