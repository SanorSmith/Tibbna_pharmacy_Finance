'use client';

import { useState } from 'react';
import { X, Search, Check } from 'lucide-react';
import type { CreateGoodsReceiptRequest, CreateGrnItemRequest } from '@/lib/types/procurement';

interface NewGoodsReceiptDialogProps {
  workspaceid: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vendors: any[];
  warehouses: any[];
  purchaseOrders: any[];
}

interface ReceiptItem {
  itemid: string;
  itemcode: string;
  name: string;
  uom: string;
  orderedqty?: number;
  receivedqty: number;
  rejectedqty: number;
  unitprice?: number;
  batchnumber: string;
  expirydate: string;
  manufacturedate: string;
  notes?: string;
}

export default function NewGoodsReceiptDialog({ workspaceid, isOpen, onClose, onSuccess, vendors, warehouses, purchaseOrders }: NewGoodsReceiptDialogProps) {
  const [poId, setPoId] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpdateItem = (index: number, field: keyof ReceiptItem, value: any) => {
    const updated = [...receiptItems];
    updated[index] = { ...updated[index], [field]: value };
    setReceiptItems(updated);
  };

  const handleCreateGRN = async () => {
    if (!poId || receiptItems.length === 0) return;

    setLoading(true);
    try {
      const request: CreateGoodsReceiptRequest = {
        poid: poId,
        vendorid: '', // Will be populated from PO
        invoicenumber: invoiceNumber,
        invoicedate: invoiceDate ? new Date(invoiceDate) : undefined,
        receivedby: receivedBy,
        notes,
        items: receiptItems.map(item => ({
          itemid: item.itemid,
          orderedqty: item.orderedqty,
          receivedqty: item.receivedqty,
          rejectedqty: item.rejectedqty,
          unitprice: item.unitprice,
          batchnumber: item.batchnumber,
          expirydate: item.expirydate ? new Date(item.expirydate) : undefined,
          manufacturedate: item.manufacturedate ? new Date(item.manufacturedate) : undefined,
          notes: item.notes,
        })),
      };

      const response = await fetch(`/api/d/${workspaceid}/procurement/grn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        onSuccess();
        onClose();
        setPoId('');
        setReceiptItems([]);
        setNotes('');
      }
    } catch (error) {
      console.error('Error creating GRN:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#ffffff', borderRadius: '12px', padding: 0, width: '1040px', maxHeight: '96vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>📥 New Goods Receipt</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Record receipt of goods from supplier</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X style={{ width: '18px', height: '18px', color: '#6b7280' }} />
          </button>
        </div>
        
        <div style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <button style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #6366f1', background: '#6366f1', color: '#ffffff' }}>
                Against a Purchase Order
              </button>
              <button style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb', background: '#ffffff', color: '#374151' }}>
                Standalone (no order)
              </button>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: '4px' }}>Select Purchase Order *</label>
              <select 
                value={poId}
                onChange={(e) => setPoId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
              >
                <option value="">— Select purchase order —</option>
              </select>
            </div>
          </div>

          {receiptItems.length === 0 ? (
            <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '28px', textAlign: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>📦</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Select a purchase order to continue</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Items from the selected order will be displayed here</div>
            </div>
          ) : (
            <div style={{ marginBottom: '14px' }}>
              {receiptItems.map((item, index) => (
                <div key={index} style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{item.itemcode} • {item.uom}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Batch Number *</label>
                      <input
                        value={item.batchnumber}
                        onChange={(e) => handleUpdateItem(index, 'batchnumber', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px', color: '#111827', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Expiry Date</label>
                      <input
                        type="date"
                        value={item.expirydate}
                        onChange={(e) => handleUpdateItem(index, 'expirydate', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px', color: '#111827', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Received Qty *</label>
                      <input
                        type="number"
                        min="0"
                        value={item.receivedqty}
                        onChange={(e) => handleUpdateItem(index, 'receivedqty', parseInt(e.target.value) || 0)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px', color: '#111827', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Rejected Qty</label>
                      <input
                        type="number"
                        min="0"
                        value={item.rejectedqty}
                        onChange={(e) => handleUpdateItem(index, 'rejectedqty', parseInt(e.target.value) || 0)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px', color: '#111827', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Unit Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitprice}
                        onChange={(e) => handleUpdateItem(index, 'unitprice', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px', color: '#111827', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb', background: '#ffffff', color: '#374151' }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateGRN}
              disabled={loading || !poId || receiptItems.length === 0}
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', background: '#6366f1', color: '#ffffff', opacity: (loading || !poId || receiptItems.length === 0) ? 0.5 : 1 }}
            >
              {loading ? 'Creating...' : 'Create Receipt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
