-- Migration to update po_status enum values
-- Old values: draft, approved, sent, partial, complete, cancelled
-- New values: pending, partial, delivered, canceled

-- First, drop the default value
ALTER TABLE purchase_orders ALTER COLUMN status DROP DEFAULT;

-- Alter the column to text type to allow any value
ALTER TABLE purchase_orders ALTER COLUMN status TYPE text USING status::text;

-- Update existing records to map to new values
UPDATE purchase_orders 
SET status = CASE 
    WHEN status = 'draft' THEN 'pending'
    WHEN status = 'approved' THEN 'pending'
    WHEN status = 'sent' THEN 'pending'
    WHEN status = 'partial' THEN 'partial'
    WHEN status = 'complete' THEN 'delivered'
    WHEN status = 'cancelled' THEN 'canceled'
    ELSE 'pending'
END;

-- Drop the old enum type if it exists
DROP TYPE IF EXISTS po_status;

-- Create the new enum type
CREATE TYPE po_status AS ENUM ('pending', 'partial', 'delivered', 'canceled');

-- Alter the column back to use the new enum type
ALTER TABLE purchase_orders ALTER COLUMN status TYPE po_status USING status::text::po_status;

-- Set the new default value
ALTER TABLE purchase_orders ALTER COLUMN status SET DEFAULT 'pending';
