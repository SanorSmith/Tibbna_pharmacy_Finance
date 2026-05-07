-- POS Receipt Reprints Table
-- Track reprint history for sales, returns, and shift reports
CREATE TABLE IF NOT EXISTS pos_receipt_reprints (
  reprintid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspaceid UUID NOT NULL REFERENCES workspaces(workspaceid) ON DELETE CASCADE,
  
  -- Reference to original document (one of these)
  saleid UUID REFERENCES pos_sales(saleid) ON DELETE SET NULL,
  returnid UUID REFERENCES pos_returns(returnid) ON DELETE SET NULL,
  shiftid UUID REFERENCES pos_shifts(shiftid) ON DELETE SET NULL,
  
  -- Type of receipt
  receipttype TEXT NOT NULL CHECK (receipttype IN ('SALE', 'RETURN', 'SHIFT')),
  
  -- Reprint details
  reprintdate TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  cashierid UUID NOT NULL REFERENCES users(userid),
  printformat TEXT NOT NULL CHECK (printformat IN ('PDF', 'THERMAL', 'BROWSER')),
  reason TEXT,
  
  createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pos_receipt_reprints_workspace ON pos_receipt_reprints(workspaceid);
CREATE INDEX IF NOT EXISTS idx_pos_receipt_reprints_sale ON pos_receipt_reprints(saleid);
CREATE INDEX IF NOT EXISTS idx_pos_receipt_reprints_return ON pos_receipt_reprints(returnid);
CREATE INDEX IF NOT EXISTS idx_pos_receipt_reprints_shift ON pos_receipt_reprints(shiftid);
CREATE INDEX IF NOT EXISTS idx_pos_receipt_reprints_date ON pos_receipt_reprints(reprintdate);
CREATE INDEX IF NOT EXISTS idx_pos_receipt_reprints_cashier ON pos_receipt_reprints(cashierid);
