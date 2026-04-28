-- ============================================================
-- COMPLETE INVENTORY AUDIT - All Pharmacy/POS Tables
-- ============================================================

-- 1. Check ALL tables that might contain inventory/stock data
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%stock%' 
       OR table_name LIKE '%inventory%' 
       OR table_name LIKE '%batch%'
       OR table_name LIKE '%pharmacy%'
       OR table_name LIKE '%pos%'
       OR table_name LIKE '%drug%')
ORDER BY table_name;

-- 2. Check pharmacy_stock_levels table specifically
SELECT COUNT(*) as total_records,
       COUNT(DISTINCT drugid) as unique_drugs,
       COUNT(DISTINCT batchid) as unique_batches,
       SUM(quantity) as total_quantity
FROM pharmacy_stock_levels;

-- 3. Sample of pharmacy_stock_levels data
SELECT * FROM pharmacy_stock_levels LIMIT 10;

-- 4. Check drugs table with inventory data
SELECT d.drugid, d.name, d.workspaceid,
       COUNT(db.batchid) as batch_count,
       COUNT(psl.stocklevelid) as stock_count,
       SUM(psl.quantity) as total_stock
FROM drugs d
LEFT JOIN drug_batches db ON db.drugid = d.drugid
LEFT JOIN pharmacy_stock_levels psl ON psl.drugid = d.drugid
GROUP BY d.drugid, d.name, d.workspaceid
HAVING COUNT(db.batchid) > 0 OR COUNT(psl.stocklevelid) > 0
ORDER BY d.name
LIMIT 20;

-- 5. Check if there are any other inventory-related tables
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name NOT IN ('drugs', 'drug_batches', 'pharmacy_stock_levels')
  AND (column_name LIKE '%stock%' 
       OR column_name LIKE '%inventory%' 
       OR column_name LIKE '%quantity%'
       OR column_name LIKE '%price%')
ORDER BY table_name, ordinal_position;

-- 6. Check the specific drugs from your order
SELECT 
  d.drugid, 
  d.name, 
  d.workspaceid,
  d.form,
  -- Check drug_batches
  (SELECT COUNT(*) FROM drug_batches db WHERE db.drugid = d.drugid) as batch_count,
  (SELECT COUNT(*) FROM drug_batches db WHERE db.drugid = d.drugid AND db.sellingprice IS NOT NULL) as with_price,
  (SELECT MIN(db.sellingprice) FROM drug_batches db WHERE db.drugid = d.drugid) as min_price,
  -- Check pharmacy_stock_levels
  (SELECT COUNT(*) FROM pharmacy_stock_levels psl WHERE psl.drugid = d.drugid) as stock_count,
  (SELECT SUM(psl.quantity) FROM pharmacy_stock_levels psl WHERE psl.drugid = d.drugid) as total_stock
FROM drugs d
WHERE d.drugid IN ('6c8d5afb-bd28-484a-aea2-80044187eb19', 'bb9fdccc-f50f-4586-8e0f-c7418a8404f6', 'a486abb9-fea2-4e37-b9b3-264a07920e11')
ORDER BY d.name;

-- 7. Check workspaces to understand the structure
SELECT workspaceid, name FROM workspaces ORDER BY name;

-- 8. Check if there are any POS-specific tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'pos_%'
ORDER BY table_name;
