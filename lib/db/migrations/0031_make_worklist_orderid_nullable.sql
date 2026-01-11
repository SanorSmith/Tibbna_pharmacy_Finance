-- Migration: Make worklist_items.orderid nullable
-- This allows adding samples to worklists without an orderid (e.g., OpenEHR samples)

-- Step 1: Make orderid nullable
ALTER TABLE "worklist_items" 
ALTER COLUMN "orderid" DROP NOT NULL;
