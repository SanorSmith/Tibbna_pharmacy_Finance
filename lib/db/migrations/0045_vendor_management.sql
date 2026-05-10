-- Migration: Vendor Management System
-- Add vendor management features including bank details, performance metrics, items, and payments

-- Add new columns to vendors table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_routing_number TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_iban TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_swift_code TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rating_quality INTEGER DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rating_delivery INTEGER DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rating_pricing INTEGER DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS total_purchases TEXT DEFAULT '0';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS last_order_date TIMESTAMP WITH TIME ZONE;

-- Create vendor_items table to track which items each vendor supplies
CREATE TABLE IF NOT EXISTS vendor_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id),
  is_primary_supplier BOOLEAN DEFAULT false,
  lead_time_days INTEGER DEFAULT 0,
  min_order_qty INTEGER DEFAULT 1,
  unit_price TEXT DEFAULT '0',
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on vendor_items
CREATE INDEX IF NOT EXISTS idx_vendor_items_vendor_id ON vendor_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_items_item_id ON vendor_items(item_id);

-- Create vendor_payments table to track payment history
CREATE TABLE IF NOT EXISTS vendor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  payment_reference TEXT,
  amount TEXT DEFAULT '0',
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on vendor_payments
CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor_id ON vendor_payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_date ON vendor_payments(payment_date);
