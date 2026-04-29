-- Add quantitydispensed column to track partial dispenses
ALTER TABLE pharmacy_order_items 
ADD COLUMN quantitydispensed INTEGER DEFAULT 0;

-- Update existing items to set quantitydispensed = quantity for already DISPENSED items
UPDATE pharmacy_order_items 
SET quantitydispensed = quantity 
WHERE status = 'DISPENSED';
