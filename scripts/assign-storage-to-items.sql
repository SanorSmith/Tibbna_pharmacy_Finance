-- Assign storage locations to pharmacy items based on their names
-- This will help demonstrate the storage location feature

DO $$
DECLARE
    shelf_a1 uuid;
    shelf_a2 uuid;
    shelf_b1 uuid;
    shelf_b2 uuid;
    shelf_c1 uuid;
    fridge1 uuid;
    fridge2 uuid;
    controlled_cabinet uuid;
BEGIN
    -- Get storage location IDs
    SELECT id INTO shelf_a1 FROM warehouse_sections WHERE sectionname = 'Shelf A-1' LIMIT 1;
    SELECT id INTO shelf_a2 FROM warehouse_sections WHERE sectionname = 'Shelf A-2' LIMIT 1;
    SELECT id INTO shelf_b1 FROM warehouse_sections WHERE sectionname = 'Shelf B-1' LIMIT 1;
    SELECT id INTO shelf_b2 FROM warehouse_sections WHERE sectionname = 'Shelf B-2' LIMIT 1;
    SELECT id INTO shelf_c1 FROM warehouse_sections WHERE sectionname = 'Shelf C-1' LIMIT 1;
    SELECT id INTO fridge1 FROM warehouse_sections WHERE sectionname = 'Fridge 1' LIMIT 1;
    SELECT id INTO fridge2 FROM warehouse_sections WHERE sectionname = 'Fridge 2' LIMIT 1;
    SELECT id INTO controlled_cabinet FROM warehouse_sections WHERE sectionname = 'Controlled Cabinet' LIMIT 1;
    
    -- Assign items starting with A-C to Shelf A-1
    UPDATE items 
    SET storage_location_id = shelf_a1
    WHERE is_active = true 
      AND (inventorycategory = 'pharmacy' OR inventory_category = 'pharmacy')
      AND UPPER(SUBSTRING(name, 1, 1)) IN ('A', 'B', 'C')
      AND storage_location_id IS NULL;
    
    -- Assign items starting with D-F to Shelf A-2
    UPDATE items 
    SET storage_location_id = shelf_a2
    WHERE is_active = true 
      AND (inventorycategory = 'pharmacy' OR inventory_category = 'pharmacy')
      AND UPPER(SUBSTRING(name, 1, 1)) IN ('D', 'E', 'F')
      AND storage_location_id IS NULL;
    
    -- Assign items starting with G-L to Shelf B-1
    UPDATE items 
    SET storage_location_id = shelf_b1
    WHERE is_active = true 
      AND (inventorycategory = 'pharmacy' OR inventory_category = 'pharmacy')
      AND UPPER(SUBSTRING(name, 1, 1)) IN ('G', 'H', 'I', 'J', 'K', 'L')
      AND storage_location_id IS NULL;
    
    -- Assign items starting with M-R to Shelf B-2
    UPDATE items 
    SET storage_location_id = shelf_b2
    WHERE is_active = true 
      AND (inventorycategory = 'pharmacy' OR inventory_category = 'pharmacy')
      AND UPPER(SUBSTRING(name, 1, 1)) IN ('M', 'N', 'O', 'P', 'Q', 'R')
      AND storage_location_id IS NULL;
    
    -- Assign items starting with S-Z to Shelf C-1
    UPDATE items 
    SET storage_location_id = shelf_c1
    WHERE is_active = true 
      AND (inventorycategory = 'pharmacy' OR inventory_category = 'pharmacy')
      AND UPPER(SUBSTRING(name, 1, 1)) IN ('S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z')
      AND storage_location_id IS NULL;
    
    -- Assign insulin and vaccines to Fridge 1
    UPDATE items 
    SET storage_location_id = fridge1
    WHERE is_active = true 
      AND (inventorycategory = 'pharmacy' OR inventory_category = 'pharmacy')
      AND (LOWER(name) LIKE '%insulin%' OR LOWER(name) LIKE '%vaccine%')
      AND storage_location_id IS NULL;
    
    -- Assign controlled substances to Controlled Cabinet
    UPDATE items 
    SET storage_location_id = controlled_cabinet
    WHERE is_active = true 
      AND (inventorycategory = 'pharmacy' OR inventory_category = 'pharmacy')
      AND controlled = true
      AND storage_location_id IS NULL;
    
    RAISE NOTICE 'Storage locations assigned to pharmacy items';
END $$;

-- Show summary of assignments
SELECT 
    ws.sectionname as "Storage Location",
    COUNT(i.id) as "Items Assigned"
FROM warehouse_sections ws
LEFT JOIN items i ON i.storage_location_id = ws.id AND i.is_active = true
WHERE ws.isactive = true
GROUP BY ws.id, ws.sectionname
ORDER BY ws.sectionname;
