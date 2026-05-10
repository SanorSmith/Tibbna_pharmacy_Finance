'use client';

import { useState } from 'react';
import { X, Search, Plus, Minus } from 'lucide-react';
import type { CreatePurchaseOrderRequest } from '@/lib/types/procurement';

interface CreateOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workspaceid: string;
}

interface OrderItem {
  itemid: string;
  itemcode: string;
  name: string;
  uom: string;
  orderedqty: number;
  unitprice: number;
  totalamount: number;
}

export default function CreateOrderDialog({ workspaceid, isOpen, onClose, onSuccess }: CreateOrderDialogProps) {
  const [supplierId, setSupplierId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAddItem = (item: any) => {
    if (orderItems.find(i => i.itemid === item.id)) return;
    setOrderItems([...orderItems, {
      itemid: item.id,
      itemcode: item.itemcode,
      name: item.name,
      uom: item.uom,
      orderedqty: 1,
      unitprice: 0,
      totalamount: 0,
    }]);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleUpdateItemQty = (index: number, qty: number) => {
    const updated = [...orderItems];
    updated[index].orderedqty = qty;
    updated[index].totalamount = qty * updated[index].unitprice;
    setOrderItems(updated);
  };

  const handleUpdateItemPrice = (index: number, price: number) => {
    const updated = [...orderItems];
    updated[index].unitprice = price;
    updated[index].totalamount = price * updated[index].orderedqty;
    setOrderItems(updated);
  };

  const handleCreateOrder = async () => {
    if (!supplierId || orderItems.length === 0) return;

    setLoading(true);
    try {
      const request: CreatePurchaseOrderRequest = {
        vendorid: supplierId,
        expecteddate: expectedDate ? new Date(expectedDate) : undefined,
        notes,
        items: orderItems.map(item => ({
          itemid: item.itemid,
          orderedqty: item.orderedqty,
          unitprice: item.unitprice,
        })),
      };

      const response = await fetch(`/api/d/${workspaceid}/procurement/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        onSuccess();
        onClose();
        setSupplierId('');
        setOrderItems([]);
        setNotes('');
      }
    } catch (error) {
      console.error('Error creating order:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = orderItems.reduce((sum, item) => sum + item.totalamount, 0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#ffffff', borderRadius: '12px', padding: 0, width: '1040px', maxHeight: '96vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>📋 Create Order</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Create a new purchase order</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X style={{ width: '18px', height: '18px', color: '#6b7280' }} />
          </button>
        </div>
        
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>Order Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: '4px' }}>Supplier *</label>
              <select 
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
              >
                <option value="">— Select supplier —</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Order Date</label>
              <input 
                type="date" 
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }} 
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Expected Delivery Date</label>
              <input 
                type="date" 
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }} 
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Notes</label>
              <input 
                placeholder="Optional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }} 
              />
            </div>
          </div>

          <div style={{ marginBottom: '14px', position: 'relative' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Add Items from Inventory</div>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', width: '14px', height: '14px', color: '#9ca3af' }} />
              <input 
                placeholder="Search by name, code, type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 10px 8px 34px', borderRadius: '8px', border: '2px solid #6366f1', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }} 
              />
            </div>
          </div>

          {orderItems.length === 0 ? (
            <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '28px', textAlign: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>📦</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>No items yet</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Search above to add items to this order</div>
            </div>
          ) : (
            <div style={{ marginBottom: '14px' }}>
              {orderItems.map((item, index) => (
                <div key={item.itemid} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{item.itemcode} • {item.uom}</div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={item.orderedqty}
                    onChange={(e) => handleUpdateItemQty(index, parseInt(e.target.value) || 0)}
                    style={{ width: '60px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px', textAlign: 'center', boxSizing: 'border-box' }}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitprice}
                    onChange={(e) => handleUpdateItemPrice(index, parseFloat(e.target.value) || 0)}
                    style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px', textAlign: 'right', boxSizing: 'border-box' }}
                  />
                  <div style={{ width: '80px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#16a34a' }}>
                    ${item.totalamount.toFixed(2)}
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

          {orderItems.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f9fafb', borderRadius: '8px', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Total Order Amount</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#16a34a' }}>${totalAmount.toFixed(2)}</div>
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
              onClick={handleCreateOrder}
              disabled={loading || !supplierId || orderItems.length === 0}
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', background: '#6366f1', color: '#ffffff', opacity: (loading || !supplierId || orderItems.length === 0) ? 0.5 : 1 }}
            >
              {loading ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
