// ─── Procurement Types ───────────────────────────────────────────────────────────────

// PO Status
export type POStatus = 'draft' | 'pending' | 'approved' | 'sent' | 'partial' | 'complete' | 'cancelled';

// GRN Status
export type GRNStatus = 'draft' | 'pending' | 'approved' | 'posted' | 'cancelled';

// Claim Type
export type ClaimType = 'DAMAGED' | 'INCORRECT' | 'SHORTAGE' | 'EXPIRED';

// Claim Status
export type ClaimStatus = 'submitted' | 'approved' | 'rejected' | 'resolved';

// Return Status
export type ReturnStatus = 'pending' | 'authorized' | 'shipped' | 'received' | 'credited';

// ─── Purchase Order ───────────────────────────────────────────────────────────────

export interface PurchaseOrder {
  id: string;
  ponumber: string;
  vendorid?: string;
  prid?: string;
  warehouseid?: string;
  status: POStatus;
  orderdate: Date;
  expecteddate?: Date;
  totalamount: number;
  currency: string;
  paymentterms: number;
  shippingaddress?: string;
  notes?: string;
  approvedby?: string;
  sentby?: string;
  createdat: Date;
  updatedat: Date;
  items?: PurchaseOrderItem[];
  vendor?: {
    id: string;
    name: string;
    contact?: string;
  };
}

export interface PurchaseOrderItem {
  id: string;
  poid: string;
  itemid: string;
  orderedqty: number;
  receivedqty: number;
  unitprice: number;
  totalamount: number;
  createdat: Date;
  item?: {
    id: string;
    itemcode: string;
    name: string;
    uom: string;
  };
}

export interface CreatePurchaseOrderRequest {
  vendorid: string;
  warehouseid?: string;
  expecteddate?: Date;
  paymentterms?: number;
  shippingaddress?: string;
  notes?: string;
  items: CreatePurchaseOrderItemRequest[];
}

export interface CreatePurchaseOrderItemRequest {
  itemid: string;
  orderedqty: number;
  unitprice: number;
}

export interface UpdatePurchaseOrderRequest {
  status?: POStatus;
  expecteddate?: Date;
  paymentterms?: number;
  shippingaddress?: string;
  notes?: string;
  approvedby?: string;
  sentby?: string;
}

// ─── Goods Receipt Note ─────────────────────────────────────────────────────────────

export interface GoodsReceiptNote {
  id: string;
  grnnumber: string;
  poid?: string;
  vendorid?: string;
  warehouseid?: string;
  status: GRNStatus;
  receiptdate: Date;
  invoicenumber?: string;
  invoicedate?: Date;
  receivedby?: string;
  notes?: string;
  createdat: Date;
  updatedat: Date;
  items?: GrnItem[];
  purchaseOrder?: PurchaseOrder;
  vendor?: {
    id: string;
    name: string;
  };
}

export interface GrnItem {
  id: string;
  grnid: string;
  itemid: string;
  poitemid?: string;
  orderedqty?: number;
  receivedqty: number;
  rejectedqty: number;
  unitprice?: number;
  batchnumber?: string;
  expirydate?: Date;
  manufacturedate?: Date;
  notes?: string;
  createdat: Date;
  item?: {
    id: string;
    itemcode: string;
    name: string;
    uom: string;
  };
}

export interface CreateGoodsReceiptRequest {
  poid?: string;
  vendorid: string;
  warehouseid?: string;
  invoicenumber?: string;
  invoicedate?: Date;
  receivedby?: string;
  notes?: string;
  items: CreateGrnItemRequest[];
}

export interface CreateGrnItemRequest {
  itemid: string;
  poitemid?: string;
  orderedqty?: number;
  receivedqty: number;
  rejectedqty: number;
  unitprice?: number;
  batchnumber?: string;
  expirydate?: Date;
  manufacturedate?: Date;
  notes?: string;
}

export interface PostGoodsReceiptRequest {
  notes?: string;
}

// ─── Supplier Claim ────────────────────────────────────────────────────────────────

export interface SupplierClaim {
  id: string;
  workspaceid: string;
  claimnumber: string;
  grnid?: string;
  grnitemid?: string;
  vendorid: string;
  claimtype: ClaimType;
  status: ClaimStatus;
  claimdate: Date;
  description: string;
  quantityclaimed: number;
  amountclaimed: number;
  resolveddate?: Date;
  resolutionnotes?: string;
  createdby?: string;
  createdat: Date;
  updatedat: Date;
  vendor?: {
    id: string;
    name: string;
  };
  grnItem?: GrnItem;
}

export interface CreateSupplierClaimRequest {
  grnid?: string;
  grnitemid?: string;
  vendorid: string;
  claimtype: ClaimType;
  description: string;
  quantityclaimed: number;
  amountclaimed: number;
}

export interface UpdateSupplierClaimRequest {
  status?: ClaimStatus;
  resolutionnotes?: string;
  resolveddate?: Date;
}

// ─── Supplier Return ───────────────────────────────────────────────────────────────

export interface SupplierReturn {
  id: string;
  workspaceid: string;
  returnnumber: string;
  claimid?: string;
  vendorid: string;
  status: ReturnStatus;
  returndate: Date;
  expecteddate?: Date;
  description: string;
  totalamount: number;
  creditnote?: string;
  receiveddate?: Date;
  receivedby?: string;
  createdby?: string;
  createdat: Date;
  updatedat: Date;
  vendor?: {
    id: string;
    name: string;
  };
  claim?: SupplierClaim;
  items?: SupplierReturnItem[];
}

export interface SupplierReturnItem {
  id: string;
  returnid: string;
  itemid: string;
  batchid?: string;
  quantity: number;
  unitprice: number;
  reason: string;
  createdat: Date;
  item?: {
    id: string;
    itemcode: string;
    name: string;
    uom: string;
  };
  batch?: {
    id: string;
    batchnumber: string;
    expirydate: Date;
  };
}

export interface CreateSupplierReturnRequest {
  claimid?: string;
  vendorid: string;
  expecteddate?: Date;
  description: string;
  items: CreateSupplierReturnItemRequest[];
}

export interface CreateSupplierReturnItemRequest {
  itemid: string;
  batchid?: string;
  quantity: number;
  unitprice: number;
  reason: string;
}

export interface UpdateSupplierReturnRequest {
  status?: ReturnStatus;
  creditnote?: string;
  receiveddate?: Date;
  receivedby?: string;
}

// ─── Filters ───────────────────────────────────────────────────────────────────────

export interface POFilters {
  status?: POStatus;
  vendorid?: string;
  datefrom?: Date;
  dateto?: Date;
  search?: string;
}

export interface GRNFilters {
  status?: GRNStatus;
  vendorid?: string;
  datefrom?: Date;
  dateto?: Date;
  search?: string;
}

export interface ClaimFilters {
  status?: ClaimStatus;
  vendorid?: string;
  claimtype?: ClaimType;
  datefrom?: Date;
  dateto?: Date;
  search?: string;
}

export interface ReturnFilters {
  status?: ReturnStatus;
  vendorid?: string;
  datefrom?: Date;
  dateto?: Date;
  search?: string;
}
