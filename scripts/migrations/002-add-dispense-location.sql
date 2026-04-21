-- Migration: Add dispense location tracking to pharmacy_order_items
-- This allows tracking which warehouse/location each item was dispensed from

-- Add dispenselocationid column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy_order_items' 
        AND column_name = 'dispenselocationid'
    ) THEN
        ALTER TABLE pharmacy_order_items 
        ADD COLUMN dispenselocationid UUID REFERENCES pharmacy_stock_locations(locationid) ON DELETE SET NULL;
        
        RAISE NOTICE 'Added dispenselocationid column to pharmacy_order_items';
    ELSE
        RAISE NOTICE 'dispenselocationid column already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pharmacy_order_items'
ORDER BY ordinal_position;
