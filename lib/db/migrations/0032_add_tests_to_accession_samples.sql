-- Migration: Add tests field to accession_samples
-- This stores the ordered tests as JSON for OpenEHR orders

-- Step 1: Add tests column to store ordered tests
ALTER TABLE "accession_samples" 
ADD COLUMN "tests" jsonb;

-- Step 2: Add comment
COMMENT ON COLUMN "accession_samples"."tests" IS 'Ordered tests stored as JSON array (e.g., ["CBC", "HGB", "WBC"])';
