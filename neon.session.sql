-- ============================================
-- INVENTORY STATUS CHECK
-- ============================================

-- 1. Check inventory_stock table status
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN quantity > 0 THEN 1 END) as records_with_stock,
  COUNT(CASE WHEN quantity = 0 THEN 1 END) as records_zero_stock,
  SUM(quantity) as total_quantity,
  SUM(reserved_quantity) as total_reserved
FROM inventory_stock;

-- 2. Check item_batches table status
SELECT 
  COUNT(*) as total_batches,
  COUNT(CASE WHEN quantity > 0 THEN 1 END) as batches_with_stock,
  COUNT(CASE WHEN quantity = 0 THEN 1 END) as batches_zero_stock,
  SUM(quantity) as total_batch_quantity,
  COUNT(CASE WHEN is_quarantined = true THEN 1 END) as quarantined_batches,
  COUNT(CASE WHEN expiry_date < CURRENT_TIMESTAMP THEN 1 END) as expired_batches
FROM item_batches;

-- 3. Check Paracetamol specifically
SELECT 
  i.id,
  i.name,
  i.generic_name,
  COALESCE(SUM(ist.quantity), 0) as stock_quantity,
  COALESCE(SUM(ib.quantity), 0) as batch_quantity
FROM items i
LEFT JOIN inventory_stock ist ON ist.item_id = i.id
LEFT JOIN item_batches ib ON ib.item_id = i.id
WHERE i.name ILIKE '%paracetamol%'
GROUP BY i.id, i.name, i.generic_name
ORDER BY i.name
LIMIT 5;

-- 4. Check data consistency
SELECT 
  COUNT(*) as mismatched_items
FROM (
  SELECT 
    i.id,
    COALESCE(SUM(ist.quantity), 0) as stock_qty,
    COALESCE(SUM(ib.quantity), 0) as batch_qty
  FROM items i
  LEFT JOIN inventory_stock ist ON ist.item_id = i.id
  LEFT JOIN item_batches ib ON ib.item_id = i.id
  GROUP BY i.id
) t
WHERE stock_qty != batch_qty;