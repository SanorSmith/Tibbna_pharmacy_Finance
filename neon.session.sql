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

-- 3. Check the specific GRN that was just created
SELECT
  id,
  grn_number,
  status,
  order_id,
  warehouse_id,
  received_date,
  notes
FROM pharmacy_goods_receipt
WHERE id = '047c575f-d9b2-4aa2-ba8c-c4d87106ef3f';

-- 4. Check the GRN items
SELECT
  gri.id,
  gri.item_id,
  i.name as item_name,
  gri.quantity_received,
  gri.unit_cost,
  gri.batch_number,
  gri.expiry_date,
  gri.lot_number
FROM pharmacy_goods_receipt_items gri
JOIN items i ON i.id = gri.item_id
WHERE gri.goods_receipt_id = '047c575f-d9b2-4aa2-ba8c-c4d87106ef3f';

-- 5. Check inventory_stock for the received item
-- ============================================
-- PHARMACY SEARCH DEBUG CHECK
-- ============================================

-- 6. Check pharmacy warehouses
SELECT
  id,
  name,
  warehouse_type,
  is_active
FROM warehouses
WHERE warehouse_type = 'pharmacy';

-- 7. Check items matching "pen"
SELECT
  id,
  name,
  itemcode,
  generic_name,
  is_active,
  inventorycategory,
  workspace_id
FROM items
WHERE (name ILIKE '%pen%'
  OR generic_name ILIKE '%pen%'
  OR itemcode ILIKE '%pen%'
  OR item_code ILIKE '%pen%')
LIMIT 10;

-- 8. Check all pharmacy items
SELECT
  COUNT(*) as count
FROM items
WHERE is_active = true
AND (inventorycategory = 'pharmacy' OR inventory_category = 'pharmacy');

-- 9. Check workspaces
SELECT
  workspaceid,
  name
FROM workspaces
LIMIT 5;

-- ============================================
-- ACTIVATE ITEMS MATCHING "pen"
-- ============================================

-- Activate all items matching "pen"
UPDATE items
SET is_active = true
WHERE (name ILIKE '%pen%'
  OR generic_name ILIKE '%pen%'
  OR itemcode ILIKE '%pen%'
  OR item_code ILIKE '%pen%');

-- Verify the update
SELECT
  id,
  name,
  itemcode,
  is_active,
  inventorycategory,
  workspace_id
FROM items
WHERE (name ILIKE '%pen%'
  OR generic_name ILIKE '%pen%'
  OR itemcode ILIKE '%pen%'
  OR item_code ILIKE '%pen%')
LIMIT 10;
SELECT
  ist.id,
  ist.item_id,
  i.name as item_name,
  ist.warehouse_id,
  w.name as warehouse_name,
  ist.quantity,
  ist.reserved_quantity,
  ist.batch_id,
  ib.batch_number
FROM inventory_stock ist
JOIN items i ON i.id = ist.item_id
JOIN warehouses w ON w.id = ist.warehouse_id
LEFT JOIN item_batches ib ON ib.id = ist.batch_id
WHERE i.name ILIKE '%penta%'
ORDER BY ist.created_at DESC
LIMIT 10;

-- 6. Check item_batches for the received item
SELECT
  ib.id,
  ib.item_id,
  i.name as item_name,
  ib.batch_number,
  ib.quantity,
  ib.unit_cost,
  ib.expiry_date,
  ib.lot_number,
  ib.is_quarantined,
  ib.created_at
FROM item_batches ib
JOIN items i ON i.id = ib.item_id
WHERE i.name ILIKE '%penta%'
ORDER BY ib.created_at DESC
LIMIT 10;

-- 7. Check stock_transactions for the GRN
SELECT
  st.id,
  st.item_id,
  i.name as item_name,
  st.transaction_type,
  st.quantity,
  st.warehouse_id,
  st.batch_id,
  st.reference_id,
  st.reference_type,
  st.transaction_date,
  st.notes
FROM stock_transactions st
JOIN items i ON i.id = st.item_id
WHERE st.reference_id = '047c575f-d9b2-4aa2-ba8c-c4d87106ef3f'
ORDER BY st.transaction_date DESC;

-- 8. Check Paracetamol specifically
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

-- 9. Check data consistency
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