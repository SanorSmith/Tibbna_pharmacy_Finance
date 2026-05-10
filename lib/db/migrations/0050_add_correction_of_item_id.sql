-- Add correction_of_item_id to pharmacy_goods_receipt_items
-- This links correction items to the original receipt items they are correcting
ALTER TABLE pharmacy_goods_receipt_items 
ADD COLUMN correction_of_item_id UUID;

-- Add index for faster lookups
CREATE INDEX idx_pharmacy_goods_receipt_items_correction_of_item_id 
ON pharmacy_goods_receipt_items(correction_of_item_id);
