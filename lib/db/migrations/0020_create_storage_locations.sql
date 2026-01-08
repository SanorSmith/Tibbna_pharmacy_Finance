-- Create storage locations table
-- This table defines physical storage locations in the laboratory
-- Supports hierarchical storage organization and capacity tracking

CREATE TABLE IF NOT EXISTS storage_locations (
    locationid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    type TEXT NOT NULL, -- refrigerator, freezer_minus_80, freezer_minus_20, room_temp, incubator, rack, shelf
    category TEXT NOT NULL, -- storage, processing, quarantine, disposal
    building TEXT,
    room TEXT,
    equipment TEXT,
    section TEXT,
    position TEXT,
    capacity INTEGER,
    currentcount INTEGER DEFAULT 0,
    availableslots INTEGER,
    temperaturemin NUMERIC(5,2),
    temperaturemax NUMERIC(5,2),
    humiditymin NUMERIC(5,2),
    humiditymax NUMERIC(5,2),
    restrictedaccess BOOLEAN DEFAULT false,
    accessrequirements TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- active, inactive, maintenance, decommissioned
    isavailable BOOLEAN DEFAULT true,
    sortorder INTEGER DEFAULT 0,
    parentlocationid UUID REFERENCES storage_locations(locationid),
    createdby UUID NOT NULL REFERENCES users(userid),
    createdat TEXT NOT NULL, -- ISO string for consistency
    updatedby UUID REFERENCES users(userid),
    updatedat TEXT, -- ISO string for consistency
    workspaceid TEXT NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS storage_locations_workspace_idx ON storage_locations(workspaceid);
CREATE INDEX IF NOT EXISTS storage_locations_type_idx ON storage_locations(type);
CREATE INDEX IF NOT EXISTS storage_locations_status_idx ON storage_locations(status);
CREATE INDEX IF NOT EXISTS storage_locations_code_idx ON storage_locations(code);
CREATE INDEX IF NOT EXISTS storage_locations_parent_idx ON storage_locations(parentlocationid);

-- Insert default storage locations for demonstration
INSERT INTO storage_locations (name, code, type, category, building, room, equipment, temperaturemin, temperaturemax, createdby, createdat, workspaceid) VALUES
('Main Laboratory Refrigerator', 'REFRIGERATOR_MAIN', 'refrigerator', 'storage', 'Main Building', 'Lab 101', 'Lab Refrigerator LR-2000', 2, 8, (SELECT userid FROM users LIMIT 1), '2025-01-08T00:00:00.000Z', 'fa9fb036-a7eb-49af-890c-54406dad139d'),
('Ultra-Low Temperature Freezer', 'FREEZER_ULT_80', 'freezer_minus_80', 'storage', 'Main Building', 'Lab 102', 'Freezer ULT-80', -86, -74, (SELECT userid FROM users LIMIT 1), '2025-01-08T00:00:00.000Z', 'fa9fb036-a7eb-49af-890c-54406dad139d'),
('Standard Freezer', 'FREEZER_STANDARD_20', 'freezer_minus_20', 'storage', 'Main Building', 'Lab 103', 'Freezer ST-20', -25, -15, (SELECT userid FROM users LIMIT 1), '2025-01-08T00:00:00.000Z', 'fa9fb036-a7eb-49af-890c-54406dad139d'),
('Room Temperature Storage', 'ROOM_TEMP_MAIN', 'room_temp', 'storage', 'Main Building', 'Lab 104', 'Storage Cabinet', 18, 25, (SELECT userid FROM users LIMIT 1), '2025-01-08T00:00:00.000Z', 'fa9fb036-a7eb-49af-890c-54406dad139d'),
('Incubator', 'INCUBATOR_MAIN', 'incubator', 'processing', 'Main Building', 'Lab 105', 'Incubator INC-37', 35, 38, (SELECT userid FROM users LIMIT 1), '2025-01-08T00:00:00.000Z', 'fa9fb036-a7eb-49af-890c-54406dad139d');

-- Add comments for documentation
COMMENT ON TABLE storage_locations IS 'Physical storage locations in the laboratory with hierarchical organization';
COMMENT ON COLUMN storage_locations.type IS 'Type of storage: refrigerator, freezer_minus_80, freezer_minus_20, room_temp, incubator, rack, shelf';
COMMENT ON COLUMN storage_locations.category IS 'Category: storage, processing, quarantine, disposal';
COMMENT ON COLUMN storage_locations.status IS 'Status: active, inactive, maintenance, decommissioned';
