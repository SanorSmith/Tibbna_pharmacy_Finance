-- Add dispense_composition_uid field to pharmacy_orders table
-- This field tracks the OpenEHR ACTION.medication composition UID for dispense events

ALTER TABLE pharmacy_orders 
ADD COLUMN IF NOT EXISTS dispensecompositionuid TEXT;

-- Add index for efficient querying of dispense events
CREATE INDEX IF NOT EXISTS pharmacy_orders_dispense_idx 
ON pharmacy_orders(dispensecompositionuid);

-- Add comment for documentation
COMMENT ON COLUMN pharmacy_orders.dispensecompositionuid IS 'OpenEHR composition UID for medication dispense event (ACTION.medication)';
