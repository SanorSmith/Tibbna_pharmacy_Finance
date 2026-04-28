-- ============================================================
-- ANALYSIS: Why duplicate drug IDs exist
-- ============================================================

-- 1. Check for drugs with the same name but different IDs
SELECT 
  d.drugid,
  d.name,
  d.workspaceid,
  d.isactive,
  d.createdat
FROM drugs d
WHERE d.name LIKE '%L-asparginase%' OR d.name LIKE '%Paracetamol%'
ORDER BY d.name, d.createdat;

-- 2. Check which workspaces exist
SELECT workspaceid, name FROM workspaces;

-- 3. Check the specific drug with sellingprice 8.59
SELECT 
  d.drugid,
  d.name,
  d.workspaceid,
  d.isactive,
  db.batchid,
  db.sellingprice,
  db.lotnumber,
  db.expirydate
FROM drugs d
JOIN drug_batches db ON db.drugid = d.drugid
WHERE db.sellingprice = '8.59';

-- 4. Check what drugs have ANY batches with prices
SELECT 
  d.drugid,
  d.name,
  d.workspaceid,
  COUNT(db.batchid) as batch_count,
  COUNT(CASE WHEN db.sellingprice IS NOT NULL THEN 1 END) as with_price,
  MIN(db.sellingprice) as min_price,
  MAX(db.sellingprice) as max_price
FROM drugs d
LEFT JOIN drug_batches db ON db.drugid = d.drugid
GROUP BY d.drugid, d.name, d.workspaceid
HAVING COUNT(db.batchid) > 0
ORDER BY d.name;

-- 5. Check drugs in the order vs drugs with batches
SELECT 
  'ORDER DRUG' as source,
  poi.drugid,
  poi.drugname,
  'NO BATCHES' as has_batches
FROM pharmacy_order_items poi
WHERE poi.orderid = '096c50f6-816c-456a-986e-446b57ac28aa'

UNION ALL

SELECT 
  'WITH BATCHES' as source,
  d.drugid,
  d.name,
  'HAS BATCHES' as has_batches
FROM drugs d
WHERE d.drugid IN (SELECT DISTINCT drugid FROM drug_batches)
  AND d.name LIKE '%L-asparginase%' OR d.name LIKE '%Paracetamol%';
