-- Drop foreign key constraint on pos_sale_items.batchid
-- This allows batch IDs from both drug_batches (old) and item_batches (unified inventory)
ALTER TABLE pos_sale_items DROP CONSTRAINT IF EXISTS pos_sale_items_batchid_drug_batches_batchid_fk;
