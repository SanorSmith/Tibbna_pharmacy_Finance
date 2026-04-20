-- Add storage location reference to items table
-- This allows each item to be assigned to a specific shelf/storage location

ALTER TABLE items
ADD COLUMN IF NOT EXISTS storage_location_id UUID REFERENCES warehouse_sections(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_items_storage_location ON items(storage_location_id);

-- Add helpful comment
COMMENT ON COLUMN items.storage_location_id IS 'Reference to the specific shelf/storage location (warehouse_sections) where this item is stored';
