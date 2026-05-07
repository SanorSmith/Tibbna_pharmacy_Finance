-- Migration: Recreate Vendors Table with Correct Schema
-- This migration recreates the vendors table to match the form field names (camelCase)

-- Drop existing tables that reference vendors
DROP TABLE IF EXISTS vendor_payments CASCADE;
DROP TABLE IF EXISTS vendor_items CASCADE;
DROP TABLE IF EXISTS vendor_contracts CASCADE;

-- Drop and recreate vendors table
DROP TABLE IF EXISTS vendors CASCADE;

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  contactname TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  country TEXT,
  paymentterms INTEGER DEFAULT 30,
  currency TEXT DEFAULT 'USD',
  taxnumber TEXT,
  bankname TEXT,
  bankaccountnumber TEXT,
  bankroutingnumber TEXT,
  bankiban TEXT,
  bankswiftcode TEXT,
  website TEXT,
  ratingquality INTEGER DEFAULT 0,
  ratingdelivery INTEGER DEFAULT 0,
  ratingpricing INTEGER DEFAULT 0,
  totalorders INTEGER DEFAULT 0,
  totalpurchases TEXT DEFAULT '0',
  lastorderdate TIMESTAMP WITH TIME ZONE,
  rating INTEGER DEFAULT 0,
  isactive BOOLEAN DEFAULT true,
  notes TEXT,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vendor_items table
CREATE TABLE vendor_items (
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

-- Create indexes on vendor_items
CREATE INDEX idx_vendor_items_vendor_id ON vendor_items(vendor_id);
CREATE INDEX idx_vendor_items_item_id ON vendor_items(item_id);

-- Create vendor_payments table
CREATE TABLE vendor_payments (
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

-- Create indexes on vendor_payments
CREATE INDEX idx_vendor_payments_vendor_id ON vendor_payments(vendor_id);
CREATE INDEX idx_vendor_payments_date ON vendor_payments(payment_date);

-- Recreate vendor_contracts table
CREATE TABLE vendor_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendorid UUID REFERENCES vendors(id),
  itemid UUID REFERENCES items(id),
  unitprice TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  minorderqty INTEGER DEFAULT 1,
  leadtimedays INTEGER DEFAULT 7,
  validfrom TIMESTAMP WITH TIME ZONE,
  validto TIMESTAMP WITH TIME ZONE,
  isactive BOOLEAN DEFAULT true,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
