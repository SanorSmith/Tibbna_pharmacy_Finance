-- POS Returns & Refunds Module
-- Migration: 0040_pos_returns_refunds.sql

-- 1. Return Reasons (predefined policies)
CREATE TABLE IF NOT EXISTS pos_return_reasons (
    reasonid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspaceid UUID NOT NULL REFERENCES workspaces(workspaceid) ON DELETE CASCADE,
    reasoncode TEXT NOT NULL,
    reasonname TEXT NOT NULL,
    reasondescription TEXT,
    requiresapproval BOOLEAN NOT NULL DEFAULT false,
    allowsexchange BOOLEAN NOT NULL DEFAULT true,
    applyrestockingfee BOOLEAN NOT NULL DEFAULT false,
    restockingfeepercentage NUMERIC(5,2) NOT NULL DEFAULT 0,
    isactive BOOLEAN NOT NULL DEFAULT true,
    displayorder INTEGER NOT NULL DEFAULT 0,
    createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_return_reasons_workspace ON pos_return_reasons(workspaceid);
CREATE INDEX IF NOT EXISTS idx_pos_return_reasons_active ON pos_return_reasons(isactive);

-- 2. Returns (main return transactions)
CREATE TABLE IF NOT EXISTS pos_returns (
    returnid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    returnnumber TEXT NOT NULL UNIQUE,
    workspaceid UUID NOT NULL REFERENCES workspaces(workspaceid) ON DELETE CASCADE,
    
    -- Original Sale Reference
    originalsaleid UUID NOT NULL REFERENCES pos_sales(saleid) ON DELETE RESTRICT,
    originalsalenumber TEXT,
    originalsaledate TIMESTAMPTZ,
    
    -- Return Details
    returntype TEXT NOT NULL,
    returndate TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    returnreasonid UUID REFERENCES pos_return_reasons(reasonid) ON DELETE SET NULL,
    returnnotes TEXT,
    
    -- Customer Info
    patientid UUID REFERENCES patients(patientid) ON DELETE SET NULL,
    customername TEXT,
    customerphone TEXT,
    
    -- Financial
    totalreturnamount NUMERIC(12,2) NOT NULL DEFAULT 0,
    restockingfee NUMERIC(12,2) NOT NULL DEFAULT 0,
    refundamount NUMERIC(12,2) NOT NULL DEFAULT 0,
    refundmethod TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'PENDING',
    
    -- Approval workflow
    requiresapproval BOOLEAN NOT NULL DEFAULT false,
    approvedby UUID REFERENCES users(userid) ON DELETE SET NULL,
    approvedat TIMESTAMPTZ,
    rejectionreason TEXT,
    
    -- Processing
    processedby UUID REFERENCES users(userid) ON DELETE SET NULL,
    processedat TIMESTAMPTZ,
    shiftid UUID REFERENCES pos_shifts(shiftid) ON DELETE SET NULL,
    
    -- Audit
    createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_returns_workspace ON pos_returns(workspaceid);
CREATE INDEX IF NOT EXISTS idx_pos_returns_original_sale ON pos_returns(originalsaleid);
CREATE INDEX IF NOT EXISTS idx_pos_returns_date ON pos_returns(returndate);
CREATE INDEX IF NOT EXISTS idx_pos_returns_status ON pos_returns(status);
CREATE INDEX IF NOT EXISTS idx_pos_returns_number ON pos_returns(returnnumber);
CREATE INDEX IF NOT EXISTS idx_pos_returns_shift ON pos_returns(shiftid);

-- 3. Return Items (individual items being returned)
CREATE TABLE IF NOT EXISTS pos_return_items (
    returnitemid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    returnid UUID NOT NULL REFERENCES pos_returns(returnid) ON DELETE CASCADE,
    
    -- Original Sale Item Reference
    originalsaleitemid UUID REFERENCES pos_sale_items(itemid) ON DELETE SET NULL,
    
    -- Product Info
    drugid UUID,
    drugname TEXT NOT NULL,
    batchid UUID,
    lotnumber TEXT,
    
    -- Quantities
    quantityreturned INTEGER NOT NULL,
    originalquantity INTEGER,
    
    -- Pricing
    unitprice NUMERIC(10,2) NOT NULL,
    totalprice NUMERIC(10,2) NOT NULL,
    
    -- Condition & restocking
    itemcondition TEXT DEFAULT 'OPENED',
    restockeligible BOOLEAN NOT NULL DEFAULT true,
    restocked BOOLEAN NOT NULL DEFAULT false,
    
    -- Notes
    itemnotes TEXT,
    
    createdat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_return_items_return ON pos_return_items(returnid);
CREATE INDEX IF NOT EXISTS idx_pos_return_items_drug ON pos_return_items(drugid);

-- 4. Refund Transactions (payment records for refunds)
CREATE TABLE IF NOT EXISTS pos_refund_transactions (
    refundtransactionid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    returnid UUID NOT NULL REFERENCES pos_returns(returnid) ON DELETE CASCADE,
    
    refundamount NUMERIC(12,2) NOT NULL,
    refundmethod TEXT NOT NULL,
    
    -- Payment details
    paymentreference TEXT,
    cardlast4 TEXT,
    
    -- Store credit
    storecreditcode TEXT,
    
    transactiondate TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processedby UUID REFERENCES users(userid) ON DELETE SET NULL,
    
    createdat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_refund_trans_return ON pos_refund_transactions(returnid);
CREATE INDEX IF NOT EXISTS idx_pos_refund_trans_method ON pos_refund_transactions(refundmethod);

-- 5. Seed default return reasons for workspace
INSERT INTO pos_return_reasons (workspaceid, reasoncode, reasonname, reasondescription, requiresapproval, allowsexchange, applyrestockingfee, restockingfeepercentage, displayorder)
SELECT 
    w.workspaceid,
    r.reasoncode,
    r.reasonname,
    r.reasondescription,
    r.requiresapproval,
    r.allowsexchange,
    r.applyrestockingfee,
    r.restockingfeepercentage,
    r.displayorder
FROM workspaces w
CROSS JOIN (VALUES
    ('DEFECTIVE', 'Defective/Damaged Product', 'Product was defective or damaged on receipt', false, true, false, 0.00, 1),
    ('WRONG_ITEM', 'Wrong Item Dispensed', 'Customer received wrong medication', false, true, false, 0.00, 2),
    ('ALLERGY', 'Allergic Reaction', 'Patient had allergic reaction to medication', false, true, false, 0.00, 3),
    ('EXPIRED', 'Product Expired', 'Product was expired at time of sale', false, false, false, 0.00, 4),
    ('CHANGED_MIND', 'Changed Mind', 'Customer changed mind about purchase', false, true, true, 15.00, 5),
    ('DOCTOR_CHANGED', 'Doctor Changed Prescription', 'Prescriber changed the prescription', false, true, false, 0.00, 6),
    ('DUPLICATE', 'Duplicate Purchase', 'Customer accidentally purchased twice', false, true, false, 0.00, 7),
    ('OTHER', 'Other Reason', 'Other reason for return', true, true, false, 0.00, 8)
) AS r(reasoncode, reasonname, reasondescription, requiresapproval, allowsexchange, applyrestockingfee, restockingfeepercentage, displayorder);
