-- Add is_quarantined column to item_batches table
ALTER TABLE item_batches 
ADD COLUMN IF NOT EXISTS is_quarantined BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN item_batches.is_quarantined IS 'Indicates if the batch is quarantined and cannot be used';
