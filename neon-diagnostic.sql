-- ============================================================
-- DIAGNOSTIC: Why are drug prices showing as 0/null?
-- Order: 096c50f6-816c-456a-986e-446b57ac28aa
-- ============================================================

-- 1. What drugs are in this order and their current prices?
SELECT poi.drugid, poi.drugname, poi.unitprice, poi.batchid, poi.quantity
FROM pharmacy_order_items poi
WHERE poi.orderid = '096c50f6-816c-456a-986e-446b57ac28aa';

-- 2. Do these drugs have any drug_batches records?
SELECT db.drugid, db.batchid, db.sellingprice, db.purchaseprice, db.expirydate, db.lotnumber
FROM drug_batches db
WHERE db.drugid IN (
  SELECT drugid FROM pharmacy_order_items WHERE orderid = '096c50f6-816c-456a-986e-446b57ac28aa'
);

-- 3. Are these drugs linked to items via items.drug_id?
SELECT i.id as item_id, i.drug_id, i.name, i.item_code
FROM items i
WHERE i.drug_id IN (
  SELECT drugid FROM pharmacy_order_items WHERE orderid = '096c50f6-816c-456a-986e-446b57ac28aa'
);

-- 4. Do any item_batches exist with prices for linked items?
SELECT ib.id, ib.item_id, ib.batch_number, ib.selling_price, ib.unit_cost, ib.quantity
FROM item_batches ib
WHERE ib.item_id IN (
  SELECT i.id FROM items i
  WHERE i.drug_id IN (
    SELECT drugid FROM pharmacy_order_items WHERE orderid = '096c50f6-816c-456a-986e-446b57ac28aa'
  )
);

-- 5. How many drug_batches have ANY prices set at all?
SELECT COUNT(*) as total_batches,
       COUNT(sellingprice) as with_selling_price,
       COUNT(purchaseprice) as with_purchase_price
FROM drug_batches;

-- 6. How many item_batches have ANY prices set at all?
SELECT COUNT(*) as total_batches,
       COUNT(selling_price) as with_selling_price,
       COUNT(unit_cost) as with_unit_cost
FROM item_batches;

-- 7. How many items are linked to drugs (have drug_id set)?
SELECT COUNT(*) as total_items,
       COUNT(drug_id) as linked_to_drugs
FROM items
WHERE item_type = 'drug';
