-- Migration: Add reserved quantity to pharmacy_stock_levels
-- This allows stock reservation when orders are created

-- Add reservedquantity column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pharmacy_stock_levels' 
        AND column_name = 'reservedquantity'
    ) THEN
        ALTER TABLE pharmacy_stock_levels 
        ADD COLUMN reservedquantity INTEGER NOT NULL DEFAULT 0;
        
        RAISE NOTICE 'Added reservedquantity column to pharmacy_stock_levels';
    ELSE
        RAISE NOTICE 'reservedquantity column already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'pharmacy_stock_levels'
ORDER BY ordinal_position;
