'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { CreateSupplierClaimRequest } from '@/lib/types/procurement';

interface CreateClaimDialogProps {
  workspaceid: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateClaimDialog({ workspaceid, isOpen, onClose, onSuccess }: CreateClaimDialogProps) {
  const [grnId, setGrnId] = useState('');
  const [grnItemId, setGrnItemId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [claimType, setClaimType] = useState('');
  const [quantityClaimed, setQuantityClaimed] = useState(0);
  const [amountClaimed, setAmountClaimed] = useState(0);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreateClaim = async () => {
    if (!vendorId || !claimType || !description || quantityClaimed <= 0) return;

    setLoading(true);
    try {
      const request: CreateSupplierClaimRequest = {
        grnid: grnId || undefined,
        grnitemid: grnItemId || undefined,
        vendorid: vendorId,
        claimtype: claimType as any,
        description,
        quantityclaimed: quantityClaimed,
        amountclaimed: amountClaimed,
      };

      const response = await fetch(`/api/d/${workspaceid}/procurement/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        onSuccess();
        onClose();
        setGrnId('');
        setGrnItemId('');
        setVendorId('');
        setClaimType('');
        setQuantityClaimed(0);
        setAmountClaimed(0);
        setDescription('');
      }
    } catch (error) {
      console.error('Error creating claim:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#ffffff', borderRadius: '12px', padding: 0, width: '1040px', maxHeight: '96vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>⚠️ Create Supplier Claim</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Create a claim against supplier for damaged/incorrect/shortage/expired items</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X style={{ width: '18px', height: '18px', color: '#6b7280' }} />
          </button>
        </div>
        
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>GRN</label>
              <select 
                value={grnId}
                onChange={(e) => setGrnId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
              >
                <option value="">— Select GRN (optional) —</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: '4px' }}>Claim Type *</label>
              <select 
                value={claimType}
                onChange={(e) => setClaimType(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
              >
                <option value="">— Select type —</option>
                <option value="DAMAGED">Damaged</option>
                <option value="INCORRECT">Incorrect</option>
                <option value="SHORTAGE">Shortage</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: '4px' }}>Quantity Claimed *</label>
              <input 
                type="number"
                min="1"
                value={quantityClaimed}
                onChange={(e) => setQuantityClaimed(parseInt(e.target.value) || 0)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: '4px' }}>Description *</label>
              <input 
                placeholder="Describe the issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Amount Claimed</label>
              <input 
                type="number"
                min="0"
                step="0.01"
                value={amountClaimed}
                onChange={(e) => setAmountClaimed(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb', background: '#ffffff', color: '#374151' }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateClaim}
              disabled={loading || !vendorId || !claimType || !description || quantityClaimed <= 0}
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', background: '#6366f1', color: '#ffffff', opacity: (loading || !vendorId || !claimType || !description || quantityClaimed <= 0) ? 0.5 : 1 }}
            >
              {loading ? 'Creating...' : 'Create Claim'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
