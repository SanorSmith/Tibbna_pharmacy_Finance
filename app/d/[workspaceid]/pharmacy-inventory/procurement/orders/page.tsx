'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Search, Plus, RefreshCw, Eye, Edit, X } from 'lucide-react';
import type { PurchaseOrder, POFilters } from '@/lib/types/procurement';
import PageHeader from '@/app/components/PageHeader';

export default function PurchaseOrdersPage() {
  const params = useParams();
  const workspaceid = params.workspaceid as string;
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [orderedBy, setOrderedBy] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors');
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchItems = async (search = '') => {
    try {
      const response = await fetch(`/api/pharmacy/items?search=${encodeURIComponent(search)}&workspaceId=${workspaceid}&source=inventory`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const handleItemSearch = (value: string) => {
    setItemSearchQuery(value);
    fetchItems(value);
  };

  const addItemToOrder = (item: any) => {
    const existing = orderItems.find(oi => oi.itemid === item.id);
    if (existing) {
      setOrderItems(orderItems.map(oi => 
        oi.itemid === item.id 
          ? { ...oi, orderedqty: oi.orderedqty + 1 }
          : oi
      ));
    } else {
      setOrderItems([...orderItems, {
        itemid: item.id,
        itemcode: item.itemcode,
        name: item.name,
        uom: item.uom,
        orderedqty: 1,
        unitprice: parseFloat(item.unitCost) || 0,
        totalamount: parseFloat(item.unitCost) || 0
      }]);
    }
    setItemSearchQuery('');
    setItems([]);
  };

  const handleCreateOrder = async () => {
    if (!supplierId || orderItems.length === 0) return;

    setCreatingOrder(true);
    try {
      const request = {
        vendorid: supplierId,
        expecteddate: expectedDate ? new Date(expectedDate) : undefined,
        notes,
        approvedby: orderedBy,
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
        setShowCreateDialog(false);
        setSupplierId('');
        setOrderItems([]);
        setNotes('');
        setExpectedDate('');
        setOrderedBy('');
        fetchOrders();
      }
    } catch (error) {
      console.error('Error creating order:', error);
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleViewOrder = async (orderId: string) => {
    const order = orders.find((o: any) => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      setShowViewDialog(true);
    }
  };

  const handleEditOrder = async (orderId: string) => {
    const order = orders.find((o: any) => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      setSupplierId(order.vendorid || '');
      setOrderDate(new Date(order.orderdate).toISOString().split('T')[0]);
      setExpectedDate(order.expecteddate ? new Date(order.expecteddate).toISOString().split('T')[0] : '');
      setNotes(order.notes || '');
      setOrderedBy(order.approvedby || '');
      setOrderItems(order.items || []);
      setShowEditDialog(true);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    
    try {
      const response = await fetch(`/api/d/${workspaceid}/procurement/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (response.ok) {
        fetchOrders();
      } else {
        alert('Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Failed to cancel order');
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await fetch('/api/warehouses');
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (dateFrom) params.append('datefrom', dateFrom);
      if (dateTo) params.append('dateto', dateTo);

      const response = await fetch(`/api/d/${workspaceid}/procurement/orders?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceid) {
      fetchOrders();
    }
    fetchVendors();
    fetchItems();
    fetchWarehouses();
  }, [workspaceid, statusFilter, searchQuery, dateFrom, dateTo]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return { background: '#f3f4f6', color: '#374151' };
      case 'pending': return { background: '#fef3c7', color: '#d97706' };
      case 'approved': return { background: '#dbeafe', color: '#2563eb' };
      case 'sent': return { background: '#dbeafe', color: '#2563eb' };
      case 'partial': return { background: '#f3f4f6', color: '#374151' };
      case 'complete': return { background: '#d1fae5', color: '#16a34a' };
      case 'cancelled': return { background: '#fee2e2', color: '#dc2626' };
      default: return { background: '#f3f4f6', color: '#374151' };
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', marginTop: '8px' }}>
      <PageHeader
        title="Purchase Orders"
        backPath={`/d/${workspaceid}/pharmacy-inventory`}
        description="Manage purchase orders from suppliers"
      />
      
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: '#eef2ff', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#6366f1', marginBottom: '4px' }}>Total Orders</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{orders.length}</div>
        </div>
        <div style={{ background: '#fef3c7', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#d97706', marginBottom: '4px' }}>Pending</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{orders.filter(o => o.status === 'pending').length}</div>
        </div>
        <div style={{ background: '#fee2e2', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626', marginBottom: '4px' }}>Cancelled</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{orders.filter(o => o.status === 'cancelled').length}</div>
        </div>
        <div style={{ background: '#e0f2fe', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#0891b2', marginBottom: '4px' }}>Suppliers</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{new Set(orders.map(o => o.vendorid)).size}</div>
        </div>
      </div>

      {/* Table Section */}
      <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: '16px' }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Purchase Orders</span>
          
          {/* Status Filters */}
          <div style={{ display: 'flex', gap: '5px' }}>
            {['ALL', 'PENDING', 'PARTIAL', 'COMPLETE', 'CANCELLED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: statusFilter === status ? '1px solid #6366f1' : '1px solid #e5e7eb',
                  background: statusFilter === status ? '#6366f1' : '#f9fafb',
                  color: statusFilter === status ? '#ffffff' : '#374151',
                }}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search style={{ position: 'absolute', left: '8px', width: '13px', height: '13px', color: '#9ca3af' }} />
            <input
              placeholder="Search order #, supplier, by..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '200px', padding: '8px 10px 8px 26px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '12px', color: '#111827', boxSizing: 'border-box' }}
            />
          </div>

          {/* Date Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#9ca3af', whiteSpace: 'nowrap' }}>From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: '140px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '12px', color: '#111827', boxSizing: 'border-box' }}
            />
            <span style={{ fontSize: '11px', color: '#9ca3af', whiteSpace: 'nowrap' }}>To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ width: '140px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '12px', color: '#111827', boxSizing: 'border-box' }}
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchOrders}
            style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb', background: '#f3f4f6', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw style={{ width: '13px', height: '13px' }} />
          </button>

          {/* Create Order Button */}
          <button
            onClick={() => setShowCreateDialog(true)}
            style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', background: '#6366f1', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}
          >
            <Plus style={{ width: '13px', height: '13px' }} />
            Create Order
          </button>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Order #', 'Ordered By', 'Supplier', 'Items', 'Total', 'Order Date', 'Expected', 'Status', 'Actions'].map((col) => (
                  <th key={col} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Loading...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No orders found</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '11px', color: '#6366f1', fontFamily: 'monospace', fontWeight: 600 }}>
                      {order.ponumber}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827', fontWeight: 600 }}>
                      {order.approvedby || order.sentby || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>
                      {order.vendor?.name || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827', fontWeight: 600 }}>
                      {order.items?.length || 0} items
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>
                      ${typeof order.totalamount === 'string' ? parseFloat(order.totalamount).toFixed(2) : (order.totalamount || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '12px', color: '#6b7280' }}>
                      {new Date(order.orderdate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '12px', color: '#6b7280' }}>
                      {order.expecteddate ? new Date(order.expecteddate).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: getStatusColor(order.status).background, color: getStatusColor(order.status).color }}>
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button title="View" onClick={() => handleViewOrder(order.id)} style={{ background: '#eff6ff', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer' }}>
                          <Eye style={{ width: '12px', height: '12px', color: '#2563eb' }} />
                        </button>
                        <button title="Edit" onClick={() => handleEditOrder(order.id)} style={{ background: '#ede9fe', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer' }}>
                          <Edit style={{ width: '12px', height: '12px', color: '#5b21b6' }} />
                        </button>
                        {order.status !== 'cancelled' && (
                          <button title="Cancel" onClick={() => handleCancelOrder(order.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer' }}>
                            <X style={{ width: '12px', height: '12px', color: '#dc2626' }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Dialog */}
      {showCreateDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: 0, width: '1040px', maxHeight: '96vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>📋 Create Order</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Create a new purchase order</div>
              </div>
              <button
                onClick={() => setShowCreateDialog(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X style={{ width: '18px', height: '18px', color: '#6b7280' }} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: '1 1 0%' }}>
              <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: '4px' }}>Ordered By *</label>
                    <input 
                      placeholder="Full name"
                      value={orderedBy}
                      onChange={(e) => setOrderedBy(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Order Date</label>
                    <input 
                      type="date"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Expected Delivery Date</label>
                    <input 
                      type="date"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1', marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Supplier</label>
                    <select 
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
                    >
                      <option value="">— Select supplier —</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1', marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Notes</label>
                    <input 
                      placeholder="Optional notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '14px', position: 'relative' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Add Items from Inventory</div>
                <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', width: '14px', height: '14px', color: '#9ca3af' }} />
                  <input 
                    placeholder="Search by name, code, type..." 
                    value={itemSearchQuery}
                    onChange={(e) => handleItemSearch(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px 8px 34px', borderRadius: '8px', border: '2px solid #6366f1', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }} 
                  />
                </div>
              </div>

              {orderItems.length === 0 && itemSearchQuery === '' ? (
                <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '28px', textAlign: 'center', marginBottom: '4px' }}>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>📦</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>No items yet</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Search above to add items to this order</div>
                </div>
              ) : null}

              {items.length > 0 && itemSearchQuery !== '' ? (
                <div style={{ borderRadius: '10px', border: '1px solid #e5e7eb', maxHeight: '200px', overflowY: 'auto', marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', padding: '8px 12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    Search Results (click to add)
                  </div>
                  {items.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => addItemToOrder(item)}
                      style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>{item.itemcode} • {item.uom} • Stock: {item.totalStock || 0}</div>
                      </div>
                      <Plus style={{ width: '14px', height: '14px', color: '#6366f1' }} />
                    </div>
                  ))}
                </div>
              ) : null}

              {orderItems.length > 0 ? (
                <div style={{ borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>#</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Item</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Unit of Measure</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Quantity</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Unit Cost ($)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Total</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((oi, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '11px', color: '#9ca3af', width: '28px' }}>{idx + 1}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827', fontWeight: 600, minWidth: '160px' }}>{oi.name}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#6b7280' }}>{oi.uom}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>
                            <input 
                              type="number"
                              min="1"
                              value={oi.orderedqty}
                              onChange={(e) => {
                                const newQty = parseInt(e.target.value) || 1;
                                setOrderItems(orderItems.map((o, i) => i === idx ? { ...o, orderedqty: newQty, totalamount: newQty * o.unitprice } : o));
                              }}
                              style={{ width: '80px', padding: '5px 8px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box', textAlign: 'center' }}
                            />
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>
                            <input 
                              type="number"
                              min="0"
                              step="0.01"
                              value={oi.unitprice}
                              onChange={(e) => {
                                const newPrice = parseFloat(e.target.value) || 0;
                                setOrderItems(orderItems.map((o, i) => i === idx ? { ...o, unitprice: newPrice, totalamount: newPrice * o.orderedqty } : o));
                              }}
                              style={{ width: '100px', padding: '5px 8px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
                            />
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#6366f1', fontWeight: 700 }}>${(oi.orderedqty * oi.unitprice).toFixed(2)}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>
                            <button
                              onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                              style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <X style={{ width: '13px', height: '13px', color: '#dc2626' }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f9fafb' }}>
                        <td colSpan={5} style={{ padding: '10px 16px 10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827', fontWeight: 700, textAlign: 'right' }}>Total:</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '14px', color: '#6366f1', fontWeight: 700 }}>
                          ${orderItems.reduce((sum, item) => sum + (item.orderedqty * item.unitprice), 0).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : null}
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  onClick={() => setShowCreateDialog(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb', background: '#ffffff', color: '#374151' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrder}
                  disabled={creatingOrder || !supplierId || orderItems.length === 0}
                  style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', background: '#6366f1', color: '#ffffff', opacity: (creatingOrder || !supplierId || orderItems.length === 0) ? 0.5 : 1 }}
                >
                  {creatingOrder ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Order Dialog */}
      {showViewDialog && selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>Order Details</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{selectedOrder.ponumber}</div>
              </div>
              <button onClick={() => setShowViewDialog(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X style={{ width: '18px', height: '18px', color: '#6b7280' }} />
              </button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Supplier</div>
                <div style={{ fontSize: '14px', color: '#111827' }}>{selectedOrder.vendor?.name || '—'}</div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Ordered By</div>
                <div style={{ fontSize: '14px', color: '#111827' }}>{selectedOrder.approvedby || selectedOrder.sentby || '—'}</div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Order Date</div>
                <div style={{ fontSize: '14px', color: '#111827' }}>{new Date(selectedOrder.orderdate).toLocaleDateString()}</div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Expected Delivery Date</div>
                <div style={{ fontSize: '14px', color: '#111827' }}>{selectedOrder.expecteddate ? new Date(selectedOrder.expecteddate).toLocaleDateString() : '—'}</div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Status</div>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: getStatusColor(selectedOrder.status).background, color: getStatusColor(selectedOrder.status).color }}>
                  {selectedOrder.status.toUpperCase()}
                </span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Total Amount</div>
                <div style={{ fontSize: '14px', color: '#16a34a', fontWeight: 700 }}>
                  ${typeof selectedOrder.totalamount === 'string' ? parseFloat(selectedOrder.totalamount).toFixed(2) : (selectedOrder.totalamount || 0).toFixed(2)}
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Notes</div>
                <div style={{ fontSize: '14px', color: '#111827' }}>{selectedOrder.notes || '—'}</div>
              </div>
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Items</div>
                  <div style={{ borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Item</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Qty</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Unit Price</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', fontSize: '13px', color: '#111827' }}>{item.itemname || item.name}</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', fontSize: '13px', color: '#111827' }}>{item.orderedqty}</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', fontSize: '13px', color: '#111827' }}>${item.unitprice}</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', fontSize: '13px', color: '#111827' }}>${(item.orderedqty * item.unitprice).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Dialog */}
      {showEditDialog && selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '90%', maxWidth: '700px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>Edit Order</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{selectedOrder.ponumber}</div>
              </div>
              <button onClick={() => setShowEditDialog(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X style={{ width: '18px', height: '18px', color: '#6b7280' }} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: '4px' }}>Ordered By *</label>
                    <input 
                      placeholder="Full name"
                      value={orderedBy}
                      onChange={(e) => setOrderedBy(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Order Date</label>
                    <input 
                      type="date"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Expected Delivery Date</label>
                    <input 
                      type="date"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1', marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Supplier</label>
                    <select 
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
                    >
                      <option value="">— Select supplier —</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1', marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Notes</label>
                    <input 
                      placeholder="Optional notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '14px', position: 'relative' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Items</div>
              </div>

              {orderItems.length > 0 ? (
                <div style={{ borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>#</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Item</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Unit of Measure</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Quantity</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Unit Cost ($)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Total</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((oi, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '11px', color: '#9ca3af', width: '28px' }}>{idx + 1}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827', fontWeight: 600, minWidth: '160px' }}>{oi.name}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#6b7280' }}>{oi.uom}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>
                            <input 
                              type="number"
                              min="1"
                              value={oi.orderedqty}
                              onChange={(e) => {
                                const newQty = parseInt(e.target.value) || 1;
                                setOrderItems(orderItems.map((o, i) => i === idx ? { ...o, orderedqty: newQty, totalamount: newQty * o.unitprice } : o));
                              }}
                              style={{ width: '80px', padding: '5px 8px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box', textAlign: 'center' }}
                            />
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>
                            <input 
                              type="number"
                              min="0"
                              step="0.01"
                              value={oi.unitprice}
                              onChange={(e) => {
                                const newPrice = parseFloat(e.target.value) || 0;
                                setOrderItems(orderItems.map((o, i) => i === idx ? { ...o, unitprice: newPrice, totalamount: newPrice * o.orderedqty } : o));
                              }}
                              style={{ width: '100px', padding: '5px 8px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
                            />
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#6366f1', fontWeight: 700 }}>${(oi.orderedqty * oi.unitprice).toFixed(2)}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>
                            <button
                              onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                              style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <X style={{ width: '13px', height: '13px', color: '#dc2626' }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f9fafb' }}>
                        <td colSpan={5} style={{ padding: '10px 16px 10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827', fontWeight: 700, textAlign: 'right' }}>Total:</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '14px', color: '#6366f1', fontWeight: 700 }}>
                          ${orderItems.reduce((sum, item) => sum + (item.orderedqty * item.unitprice), 0).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : null}
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  onClick={() => setShowEditDialog(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb', background: '#ffffff', color: '#374151' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => alert('Update functionality coming soon')}
                  disabled={creatingOrder || !supplierId || orderItems.length === 0}
                  style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', background: '#6366f1', color: '#ffffff', opacity: (creatingOrder || !supplierId || orderItems.length === 0) ? 0.5 : 1 }}
                >
                  {creatingOrder ? 'Updating...' : 'Update Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
