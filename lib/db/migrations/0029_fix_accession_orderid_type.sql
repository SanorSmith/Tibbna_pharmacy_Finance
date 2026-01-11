-- Migration: Fix accession_samples.orderid type from text to uuid
-- This fixes the type mismatch between accession_samples.orderid and lims_orders.orderid

-- WARNING: This migration will clear the accession_samples table due to incompatible data types
-- The existing data has text-based orderid values that cannot be converted to UUID

-- Step 1: Truncate the table to remove incompatible data
-- This cascades to related tables (sample_status_history, sample_accession_audit_log)
TRUNCATE TABLE "accession_samples" CASCADE;

-- Step 2: Drop the existing index on orderid
DROP INDEX IF EXISTS "accession_samples_order_idx";

-- Step 3: Alter the column type from text to uuid
ALTER TABLE "accession_samples" 
ALTER COLUMN "orderid" TYPE uuid USING "orderid"::uuid;

-- Step 4: Add foreign key constraint to lims_orders
ALTER TABLE "accession_samples" 
ADD CONSTRAINT "accession_samples_orderid_lims_orders_orderid_fk" 
FOREIGN KEY ("orderid") REFERENCES "lims_orders"("orderid") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Step 5: Recreate the index
CREATE INDEX IF NOT EXISTS "accession_samples_order_idx" ON "accession_samples" ("orderid");
