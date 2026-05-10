-- Add patient_ref column to stock_transactions table
-- This column was missing from the database but exists in the Drizzle schema

ALTER TABLE stock_transactions 
ADD COLUMN IF NOT EXISTS patient_ref TEXT;

-- Add comment for documentation
COMMENT ON COLUMN stock_transactions.patient_ref IS 'Reference to patient ID for patient-related transactions (e.g., dispense)';
