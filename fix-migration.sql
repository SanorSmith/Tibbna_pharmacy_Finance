-- Fix migration by dropping accessioning tables and recreating them with correct types
-- This is safe since the accessioning module data can be regenerated

-- Drop accessioning tables (in reverse dependency order)
DROP TABLE IF EXISTS sample_accession_audit_log CASCADE;
DROP TABLE IF EXISTS sample_status_history CASCADE;
DROP TABLE IF EXISTS accession_samples CASCADE;

-- Now the migration can proceed cleanly
