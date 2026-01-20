ALTER TABLE lims_orders ADD COLUMN openehrrequestid text;

CREATE INDEX IF NOT EXISTS lims_orders_openehrrequestid_idx ON lims_orders(openehrrequestid);
