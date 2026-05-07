-- Migration: Create procurement tables and update GRN status enum
-- This matches the hospital inventory system workflow

-- Create/update enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'po_status_enum') THEN
    CREATE TYPE po_status_enum AS ENUM ('draft', 'approved', 'sent', 'partial', 'complete', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grn_status_enum') THEN
    CREATE TYPE grn_status_enum AS ENUM ('draft', 'pending', 'approved', 'posted', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'claim_status_enum') THEN
    CREATE TYPE claim_status_enum AS ENUM ('submitted', 'approved', 'rejected', 'resolved');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'claim_type_enum') THEN
    CREATE TYPE claim_type_enum AS ENUM ('DAMAGED', 'INCORRECT', 'SHORTAGE', 'EXPIRED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_status_enum') THEN
    CREATE TYPE return_status_enum AS ENUM ('pending', 'authorized', 'shipped', 'received', 'credited');
  END IF;
END $$;

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ponumber TEXT NOT NULL,
  vendorid UUID,
  prid UUID,
  warehouseid UUID,
  status po_status_enum DEFAULT 'draft',
  orderdate TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expecteddate TIMESTAMP WITH TIME ZONE,
  totalamount TEXT DEFAULT '0',
  currency TEXT DEFAULT 'USD',
  paymentterms INTEGER DEFAULT 30,
  shippingaddress TEXT,
  notes TEXT,
  approvedby TEXT,
  sentby TEXT,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poid UUID NOT NULL,
  itemid UUID,
  itemcode TEXT,
  itemname TEXT,
  orderedqty INTEGER NOT NULL,
  receivedqty INTEGER DEFAULT 0,
  unitprice TEXT,
  totalprice TEXT,
  notes TEXT,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goods_receipt_notes table
CREATE TABLE IF NOT EXISTS goods_receipt_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grnnumber TEXT NOT NULL,
  poid UUID,
  vendorid UUID,
  warehouseid UUID,
  status grn_status_enum DEFAULT 'draft',
  receiptdate TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invoicenumber TEXT,
  invoicedate TIMESTAMP WITH TIME ZONE,
  receivedby TEXT,
  notes TEXT,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create grn_items table
CREATE TABLE IF NOT EXISTS grn_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grnid UUID NOT NULL,
  itemid UUID,
  poitemid UUID,
  orderedqty INTEGER,
  receivedqty INTEGER NOT NULL,
  rejectedqty INTEGER DEFAULT 0,
  unitprice TEXT,
  batchnumber TEXT,
  expirydate TIMESTAMP WITH TIME ZONE,
  manufacturedate TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supplier_claims table
CREATE TABLE IF NOT EXISTS supplier_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claimnumber TEXT NOT NULL,
  grnid UUID,
  grnitemid UUID,
  vendorid UUID,
  status claim_status_enum DEFAULT 'submitted',
  claimtype claim_type_enum,
  description TEXT,
  quantityclaimed INTEGER,
  amountclaimed TEXT,
  resolutionnotes TEXT,
  resolvedby TEXT,
  resolvedat TIMESTAMP WITH TIME ZONE,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supplier_returns table
CREATE TABLE IF NOT EXISTS supplier_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  returnnumber TEXT NOT NULL,
  claimid UUID,
  vendorid UUID,
  status return_status_enum DEFAULT 'pending',
  returndate TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expecteddate TIMESTAMP WITH TIME ZONE,
  receiveddate TIMESTAMP WITH TIME ZONE,
  creditnote TEXT,
  totalamount TEXT,
  description TEXT,
  receivedby TEXT,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supplier_return_items table
CREATE TABLE IF NOT EXISTS supplier_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  returnid UUID NOT NULL,
  itemid UUID,
  batchid UUID,
  quantity INTEGER NOT NULL,
  unitprice TEXT,
  reason TEXT,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
