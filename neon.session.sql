-- Make pos_sale_items.drugid nullable to handle cases where drugId is null
ALTER TABLE pos_sale_items ALTER COLUMN drugid DROP NOT NULL;

-- Add quantitydispensed column to track partial dispenses (ignore if already exists)
-- This will fail silently if column exists, which is fine
ALTER TABLE pharmacy_order_items 
ADD COLUMN IF NOT EXISTS quantitydispensed INTEGER DEFAULT 0;

-- Update existing items to set quantitydispensed = quantity for already DISPENSED items
-- Only run if quantitydispensed column exists and is NULL for DISPENSED items
UPDATE pharmacy_order_items 
SET quantitydispensed = quantity 
WHERE status = 'DISPENSED' 
AND quantitydispensed IS NULL;