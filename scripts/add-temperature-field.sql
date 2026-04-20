-- Add temperature field to warehouse_sections table
-- This will store the actual temperature range (e.g., "2-8°C", "Room temp", "15-25°C")

-- Add the temperature column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'warehouse_sections' 
        AND column_name = 'temperature'
    ) THEN
        ALTER TABLE warehouse_sections 
        ADD COLUMN temperature TEXT;
        
        RAISE NOTICE 'Added temperature column to warehouse_sections';
    ELSE
        RAISE NOTICE 'Temperature column already exists';
    END IF;
END $$;

-- Update existing records with temperature info based on temperature_controlled flag
UPDATE warehouse_sections
SET temperature = CASE 
    WHEN temperature_controlled = true THEN '2-8°C'
    ELSE 'Room temp'
END
WHERE temperature IS NULL;

-- Show the updated schema
SELECT 
    sectionname,
    section_type,
    temperature_controlled,
    temperature,
    bin_location
FROM warehouse_sections
WHERE isactive = true
ORDER BY sectionname;
