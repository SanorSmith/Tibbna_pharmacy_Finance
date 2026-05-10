-- Find and update the Paracetamol item in one query
UPDATE pharmacy_order_items 
SET quantitydispensed = 2, status = 'PARTIALLY_DISPENSED'
WHERE drugname LIKE '%Paracetamol%' AND quantity = 5;

-- Verify the update
SELECT 
    itemid,
    drugname,
    quantity,
    quantitydispensed,
    status,
    (quantity - COALESCE(quantitydispensed, 0)) as remaining_quantity
FROM pharmacy_order_items 
WHERE drugname LIKE '%Paracetamol%' 
ORDER BY createdat DESC;