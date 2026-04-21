-- Add packaging information fields to items table
-- Run this migration to add manufacturer, packaging type, and package size tracking

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS packaging_type TEXT,
ADD COLUMN IF NOT EXISTS package_size TEXT,
ADD COLUMN IF NOT EXISTS tablets_per_pack INTEGER;

-- Add helpful comment
COMMENT ON COLUMN items.packaging_type IS 'Type of packaging: bottle, blister, box, vial, tube, sachet, etc.';
COMMENT ON COLUMN items.package_size IS 'Package size description: e.g., "30 tablets", "100ml", "10 vials"';
COMMENT ON COLUMN items.tablets_per_pack IS 'Number of tablets/capsules per package (for solid dosage forms)';
