-- Migration: Create pharmacy procurement tables
-- These mirror the hospital inventory procurement workflow but are pharmacy-specific

-- 1. Create enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pharmacy_po_status') THEN
    CREATE TYPE pharmacy_po_status AS ENUM ('PENDING', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pharmacy_grn_status') THEN
    CREATE TYPE pharmacy_grn_status AS ENUM ('PENDING', 'PARTIAL', 'COMPLETE', 'CORRECTION');
  END IF;
END $$;

-- 2. pharmacy_purchase_orders
CREATE TABLE IF NOT EXISTS pharmacy_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  order_number VARCHAR(50) NOT NULL,
  ordered_by VARCHAR(120) NOT NULL,
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expected_date TIMESTAMP WITH TIME ZONE,
  supplier_id UUID,
  supplier_name VARCHAR(200),
  supplier_email VARCHAR(200),
  supplier_phone VARCHAR(50),
  status pharmacy_po_status DEFAULT 'PENDING',
  notes TEXT,
  total_amount NUMERIC(12,2) DEFAULT 0,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE pharmacy_purchase_orders ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE pharmacy_purchase_orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_ppo_workspace ON pharmacy_purchase_orders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ppo_status ON pharmacy_purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_ppo_order_number ON pharmacy_purchase_orders(order_number);

-- 3. pharmacy_purchase_order_items
CREATE TABLE IF NOT EXISTS pharmacy_purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES pharmacy_purchase_orders(id) ON DELETE CASCADE,
  item_id UUID,
  item_name VARCHAR(200),
  uom VARCHAR(50),
  ordered_qty INTEGER NOT NULL DEFAULT 0,
  unit_cost NUMERIC(10,2),
  total_cost NUMERIC(12,2),
  notes TEXT,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppoi_order ON pharmacy_purchase_order_items(order_id);

-- 4. pharmacy_goods_receipt
CREATE TABLE IF NOT EXISTS pharmacy_goods_receipt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  receipt_number VARCHAR(50) NOT NULL,
  order_id UUID REFERENCES pharmacy_purchase_orders(id),
  order_number VARCHAR(50),
  delivery_note_number VARCHAR(100),
  received_by VARCHAR(120) NOT NULL,
  receipt_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  supplier_name VARCHAR(200),
  supplier_email VARCHAR(200),
  status pharmacy_grn_status DEFAULT 'PENDING',
  notes TEXT,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE pharmacy_goods_receipt ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE;
ALTER TABLE pharmacy_goods_receipt ADD COLUMN IF NOT EXISTS correction_of UUID;
ALTER TABLE pharmacy_goods_receipt ADD COLUMN IF NOT EXISTS correction_reason TEXT;
ALTER TABLE pharmacy_goods_receipt ADD COLUMN IF NOT EXISTS corrected_by VARCHAR(120);
ALTER TABLE pharmacy_goods_receipt ADD COLUMN IF NOT EXISTS correction_type VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_pgr_workspace ON pharmacy_goods_receipt(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pgr_status ON pharmacy_goods_receipt(status);
CREATE INDEX IF NOT EXISTS idx_pgr_receipt_number ON pharmacy_goods_receipt(receipt_number);
CREATE INDEX IF NOT EXISTS idx_pgr_order_id ON pharmacy_goods_receipt(order_id);

-- 5. pharmacy_goods_receipt_items
CREATE TABLE IF NOT EXISTS pharmacy_goods_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES pharmacy_goods_receipt(id) ON DELETE CASCADE,
  item_id UUID,
  item_name VARCHAR(200),
  uom VARCHAR(50),
  ordered_qty INTEGER DEFAULT 0,
  received_qty INTEGER NOT NULL DEFAULT 0,
  delivered_total INTEGER,
  return_claim INTEGER DEFAULT 0,
  dn_reg_num VARCHAR(100),
  unit_cost NUMERIC(10,2),
  batch_number VARCHAR(100),
  lot_number VARCHAR(100),
  expiry_date TIMESTAMP WITH TIME ZONE,
  manufacture_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pgri_receipt ON pharmacy_goods_receipt_items(receipt_id);

-- 6. pharmacy_claim_damage
CREATE TABLE IF NOT EXISTS pharmacy_claim_damage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES pharmacy_goods_receipt(id) ON DELETE CASCADE,
  item_id UUID,
  item_name VARCHAR(200),
  quantity INTEGER DEFAULT 0,
  note VARCHAR(200),
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pcd_receipt ON pharmacy_claim_damage(receipt_id);
