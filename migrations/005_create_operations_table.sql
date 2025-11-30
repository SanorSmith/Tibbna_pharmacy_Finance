-- Migration: Create operations table for operative procedures
-- Manages surgical operations with patient, assessment, details, diagnosis, outcomes

-- Create operation_status enum
CREATE TYPE operation_status AS ENUM (
  'scheduled',
  'in_preparation',
  'in_progress',
  'completed',
  'cancelled',
  'postponed'
);

-- Create operation_type enum
CREATE TYPE operation_type AS ENUM (
  'emergency',
  'elective',
  'urgent'
);

-- Create operations table
CREATE TABLE operations (
  operationid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspaceid UUID NOT NULL REFERENCES workspaces(workspaceid) ON DELETE CASCADE,
  patientid UUID NOT NULL REFERENCES patients(patientid) ON DELETE CASCADE,
  surgeonid UUID NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  
  -- Scheduling
  scheduleddate TIMESTAMP WITH TIME ZONE NOT NULL,
  estimatedduration TEXT,
  operationtype operation_type NOT NULL DEFAULT 'elective',
  status operation_status NOT NULL DEFAULT 'scheduled',
  
  -- Assessment
  preoperativeassessment TEXT,
  
  -- Operation details
  operationname TEXT NOT NULL,
  operationdetails TEXT,
  anesthesiatype TEXT,
  theater TEXT,
  
  -- Diagnosis
  operationdiagnosis TEXT,
  
  -- Outcomes
  actualstarttime TIMESTAMP WITH TIME ZONE,
  actualendtime TIMESTAMP WITH TIME ZONE,
  outcomes TEXT,
  complications TEXT,
  
  -- Comments
  comment TEXT,
  
  createdat TIMESTAMP DEFAULT NOW(),
  updatedat TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_operations_workspace ON operations(workspaceid);
CREATE INDEX idx_operations_patient ON operations(patientid);
CREATE INDEX idx_operations_surgeon ON operations(surgeonid);
CREATE INDEX idx_operations_scheduled ON operations(scheduleddate);
CREATE INDEX idx_operations_status ON operations(status);

-- Add comments for documentation
COMMENT ON TABLE operations IS 'Surgical operations and operative procedures';
COMMENT ON COLUMN operations.preoperativeassessment IS 'Pre-operative patient assessment';
COMMENT ON COLUMN operations.operationdetails IS 'Detailed description of the operation';
COMMENT ON COLUMN operations.operationdiagnosis IS 'Diagnosis related to the operation';
COMMENT ON COLUMN operations.outcomes IS 'Post-operative outcomes and results';
COMMENT ON COLUMN operations.complications IS 'Any complications during or after operation';
