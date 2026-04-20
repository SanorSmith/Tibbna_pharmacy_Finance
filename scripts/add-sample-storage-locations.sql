-- Add sample storage locations for pharmacy
-- First, get the pharmacy warehouse ID

DO $$
DECLARE
    pharmacy_warehouse_id uuid;
BEGIN
    -- Get the first active pharmacy warehouse
    SELECT id INTO pharmacy_warehouse_id 
    FROM warehouses 
    WHERE warehouse_type = 'pharmacy' AND is_active = true 
    LIMIT 1;
    
    IF pharmacy_warehouse_id IS NULL THEN
        RAISE NOTICE 'No pharmacy warehouse found. Please create one first.';
    ELSE
        -- Insert sample storage locations
        INSERT INTO warehouse_sections (id, warehouse_id, sectionname, bin_location, section_type, temperature_controlled, description, isactive)
        VALUES
            (gen_random_uuid(), pharmacy_warehouse_id, 'Shelf A-1', 'Aisle 1, Row A', 'shelf', false, 'General medications - alphabetical A-C', true),
            (gen_random_uuid(), pharmacy_warehouse_id, 'Shelf A-2', 'Aisle 1, Row A', 'shelf', false, 'General medications - alphabetical D-F', true),
            (gen_random_uuid(), pharmacy_warehouse_id, 'Shelf B-1', 'Aisle 2, Row B', 'shelf', false, 'General medications - alphabetical G-L', true),
            (gen_random_uuid(), pharmacy_warehouse_id, 'Shelf B-2', 'Aisle 2, Row B', 'shelf', false, 'General medications - alphabetical M-R', true),
            (gen_random_uuid(), pharmacy_warehouse_id, 'Shelf C-1', 'Aisle 3, Row C', 'shelf', false, 'General medications - alphabetical S-Z', true),
            (gen_random_uuid(), pharmacy_warehouse_id, 'Fridge 1', 'Cold Storage Area', 'refrigerator', true, 'Temperature-sensitive medications (2-8°C)', true),
            (gen_random_uuid(), pharmacy_warehouse_id, 'Fridge 2', 'Cold Storage Area', 'refrigerator', true, 'Vaccines and biologics (2-8°C)', true),
            (gen_random_uuid(), pharmacy_warehouse_id, 'Controlled Cabinet', 'Secure Room', 'cabinet', false, 'Controlled substances - locked cabinet', true),
            (gen_random_uuid(), pharmacy_warehouse_id, 'High-Value Shelf', 'Secure Room', 'shelf', false, 'High-value medications', true),
            (gen_random_uuid(), pharmacy_warehouse_id, 'Bulk Storage', 'Back Room', 'bin', false, 'Bulk items and overstock', true)
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Sample storage locations added successfully for pharmacy warehouse: %', pharmacy_warehouse_id;
    END IF;
END $$;

-- Verify the storage locations were added
SELECT 
    ws.sectionname,
    ws.bin_location,
    ws.section_type,
    ws.temperature_controlled,
    ws.description,
    w.name as warehouse_name
FROM warehouse_sections ws
JOIN warehouses w ON w.id = ws.warehouse_id
WHERE w.warehouse_type = 'pharmacy' AND ws.isactive = true
ORDER BY ws.sectionname;
