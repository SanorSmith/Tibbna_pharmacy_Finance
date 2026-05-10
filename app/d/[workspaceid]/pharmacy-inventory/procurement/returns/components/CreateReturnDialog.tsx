'use client';

import { useState } from 'react';
import { X, Minus } from 'lucide-react';
import type { CreateSupplierReturnRequest } from '@/lib/types/procurement';

interface CreateReturnDialogProps {
  workspaceid: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ReturnItem {
  itemid: string;
  itemcode: string;
  name: string;
  batchid?: string;
  batchnumber?: string;
  quantity: number;
  unitprice: number;
  reason: string;
}

export default function CreateReturnDialog({ workspaceid, isOpen, onClose, onSuccess }: CreateReturnDialogProps) {
  const [claimId, setClaimId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [description, setDescription] = useState('');
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleRemoveItem = (index: number) => {
    setReturnItems(returnItems.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof ReturnItem, value: any) => {
    const updated = [...returnItems];
    updated[index] = { ...updated[index], [field]: value };
    setReturnItems(updated);
  };

  const handleCreateReturn = async () => {
    if (!vendorId || !description || returnItems.length === 0) return;

    setLoading(true);
    try {
      const request: CreateSupplierReturnRequest = {
        claimid: claimId || undefined,
        vendorid: vendorId,
        expecteddate: expectedDate ? new Date(expectedDate) : undefined,
        description,
        items: returnItems.map(item => ({
          itemid: item.itemid,
          batchid: item.batchid,
          quantity: item.quantity,
          unitprice: item.unitprice,
          reason: item.reason,
        })),
      };

      const response = await fetch(`/api/d/${workspaceid}/procurement/returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        onSuccess();
        onClose();
        setClaimId('');
        setVendorId('');
        setExpectedDate('');
        setDescription('');
        setReturnItems([]);
      }
    } catch (error) {
      console.error('Error creating return:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = returnItems.reduce((sum, item) => sum + item.quantity * item.unitprice, 0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#ffffff', borderRadius: '12px', padding: 0, width: '1040px', maxHeight: '96vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>🚚 Create Supplier Return</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Return items to supplier for credit or replacement</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X style={{ width: '18px', height: '18px', color: '#6b7280' }} />
          </button>
        </div>
        
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Related Claim (optional)</label>
              <select 
                value={claimId}
                onChange={(e) => setClaimId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
              >
                <option value="">— Select claim (optional) —</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: '4px' }}>Supplier *</label>
              <select 
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
              >
                <option value="">— Select supplier —</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Expected Date</label>
              <input 
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: '4px' }}>Description *</label>
              <input 
                placeholder="Reason for return..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {returnItems.length === 0 ? (
            <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '28px', textAlign: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>📦</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Select items to return</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Search inventory to add items to this return</div>
            </div>
          ) : (
            <div style={{ marginBottom: '14px' }}>
              {returnItems.map((item, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{item.itemcode} • {item.batchnumber || 'No batch'}</div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                    style={{ width: '60px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px', textAlign: 'center', boxSizing: 'border-box' }}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitprice}
                    onChange={(e) => handleUpdateItem(index, 'unitprice', parseFloat(e.target.value) || 0)}
                    style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px', textAlign: 'right', boxSizing: 'border-box' }}
                  />
                  <div style={{ width: '80px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#dc2626' }}>
                    ${(item.quantity * item.unitprice).toFixed(2)}
                  </div>
                  <button
                    onClick={() => handleRemoveItem(index)}
                    style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                  >
                    <Minus style={{ width: '12px', height: '12px', color: '#dc2626' }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {returnItems.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f9fafb', borderRadius: '8px', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Total Return Amount</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#dc2626' }}>${totalAmount.toFixed(2)}</div>
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
              onClick={handleCreateReturn}
              disabled={loading || !vendorId || !description || returnItems.length === 0}
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', background: '#6366f1', color: '#ffffff', opacity: (loading || !vendorId || !description || returnItems.length === 0) ? 0.5 : 1 }}
            >
              {loading ? 'Creating...' : 'Create Return'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
