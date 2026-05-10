-- Migration: Add openehrrequestid field and make orderid nullable
-- This allows accessioning samples for both local LIMS orders and OpenEHR orders

-- Step 1: Make orderid nullable to support OpenEHR orders
ALTER TABLE "accession_samples" 
ALTER COLUMN "orderid" DROP NOT NULL;

-- Step 2: Add openehrrequestid column for OpenEHR request IDs
ALTER TABLE "accession_samples" 
ADD COLUMN "openehrrequestid" text;

-- Step 3: Add index on openehrrequestid for faster lookups
CREATE INDEX IF NOT EXISTS "accession_samples_openehr_request_idx" ON "accession_samples" ("openehrrequestid");
