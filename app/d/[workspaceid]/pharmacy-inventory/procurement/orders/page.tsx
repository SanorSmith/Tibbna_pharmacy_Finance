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
  const [showGRNDialog, setShowGRNDialog] = useState(false);
  const [receivedBy, setReceivedBy] = useState('');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [itemReceivedQtys, setItemReceivedQtys] = useState<{[key: string]: string}>({});
  const [itemBatchNumbers, setItemBatchNumbers] = useState<{[key: string]: string}>({});
  const [itemReturnQtys, setItemReturnQtys] = useState<{[key: string]: string}>({});
  const [itemReturnNotes, setItemReturnNotes] = useState<{[key: string]: string}>({});
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
  const [currency, setCurrency] = useState('USD');
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
        currency,
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
        setCurrency('USD');
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
      setCurrency(order.currency || 'USD');
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
        body: JSON.stringify({ status: 'canceled' }),
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

  const handleOpenGRNDialog = () => {
    setReceivedBy('');
    setReceiptNotes('');
    setItemReceivedQtys({});
    setItemBatchNumbers({});
    setItemReturnQtys({});
    setItemReturnNotes({});
    // Pre-populate received quantities with ordered quantities
    if (selectedOrder && selectedOrder.items) {
      const initialReceivedQtys: {[key: string]: string} = {};
      selectedOrder.items.forEach((item: any) => {
        initialReceivedQtys[item.id] = item.orderedqty.toString();
      });
      setItemReceivedQtys(initialReceivedQtys);
    }
    setShowGRNDialog(true);
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
      case 'pending': return { background: '#fef3c7', color: '#d97706' };
      case 'partial': return { background: '#f3f4f6', color: '#374151' };
      case 'delivered': return { background: '#d1fae5', color: '#16a34a' };
      case 'canceled': return { background: '#fee2e2', color: '#dc2626' };
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
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626', marginBottom: '4px' }}>Canceled</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{orders.filter(o => o.status === 'canceled').length}</div>
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
            {['ALL', 'PENDING', 'PARTIAL', 'DELIVERED', 'CANCELED'].map((status) => (
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
                        {order.status !== 'canceled' && (
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
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Currency</label>
                    <select 
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="IQD">IQD - Iraqi Dinar</option>
                      <option value="AED">AED - UAE Dirham</option>
                      <option value="SAR">SAR - Saudi Riyal</option>
                      <option value="KWD">KWD - Kuwaiti Dinar</option>
                      <option value="QAR">QAR - Qatari Riyal</option>
                      <option value="EGP">EGP - Egyptian Pound</option>
                      <option value="TRY">TRY - Turkish Lira</option>
                    </select>
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
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '28px', width: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>📋 Order — {selectedOrder.ponumber}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Ordered by: {selectedOrder.approvedby || selectedOrder.sentby || '—'} · {new Date(selectedOrder.orderdate).toLocaleDateString()}</div>
              </div>
              <button onClick={() => setShowViewDialog(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '8px 12px' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Supplier</div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{selectedOrder.vendor?.name || '—'}</div>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '8px 12px' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Supplier Email</div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{selectedOrder.vendor?.contact || '—'}</div>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '8px 12px' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Supplier Phone</div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{selectedOrder.vendor?.phone || '—'}</div>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '8px 12px' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Order Date</div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{new Date(selectedOrder.orderdate).toLocaleDateString()}</div>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '8px 12px' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Expected Date</div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{selectedOrder.expecteddate ? new Date(selectedOrder.expecteddate).toLocaleDateString() : '—'}</div>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '8px 12px' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Status</div>
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: getStatusColor(selectedOrder.status).background, color: getStatusColor(selectedOrder.status).color }}>
                  {selectedOrder.status.toUpperCase()}
                </span>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '8px 12px' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Notes</div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{selectedOrder.notes || '—'}</div>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Item</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Unit of Measure</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Ordered Qty</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Unit Cost</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items && selectedOrder.items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827', fontWeight: 600 }}>{item.item?.name || item.name}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>{item.item?.uom || item.uom || '—'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827', fontWeight: 700, textAlign: 'center' }}>{item.orderedqty}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>{selectedOrder.currency || 'USD'}${item.unitprice}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#6366f1', fontWeight: 600 }}>{selectedOrder.currency || 'USD'}${(item.orderedqty * item.unitprice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f9fafb' }}>
                  <td colSpan={4} style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827', fontWeight: 700, textAlign: 'right' }}>Total:</td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '14px', color: '#6366f1', fontWeight: 700 }}>
                    {selectedOrder.currency || 'USD'}${typeof selectedOrder.totalamount === 'string' ? parseFloat(selectedOrder.totalamount).toFixed(2) : (selectedOrder.totalamount || 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowViewDialog(false)}
                style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb', background: '#ffffff', color: '#374151' }}
              >
                Close
              </button>
              <button
                onClick={() => { setShowViewDialog(false); handleEditOrder(selectedOrder.id); }}
                style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #6366f1', background: '#f3f4f6', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit
              </button>
              <button
                onClick={() => { setShowViewDialog(false); handleOpenGRNDialog(); }}
                style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
              >
                + New Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRN Receipt Dialog */}
      {showGRNDialog && selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: 0, width: '1040px', maxHeight: '96vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>📥 New Goods Receipt</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Reviewing order: {selectedOrder.ponumber} · {selectedOrder.vendor?.name || 'null'}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setShowGRNDialog(false)}
                  style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb', background: '#f3f4f6', color: '#374151' }}
                >
                  ← Back
                </button>
                <button
                  onClick={() => setShowGRNDialog(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: '1 1 0%' }}>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Info</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Order #</span>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{selectedOrder.ponumber}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Ordered By</span>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{selectedOrder.approvedby || selectedOrder.sentby || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Date</span>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{new Date(selectedOrder.orderdate).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Expected</span>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{selectedOrder.expecteddate ? new Date(selectedOrder.expecteddate).toLocaleDateString() : '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Status</span>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{selectedOrder.status.toUpperCase()}</span>
                    </div>
                  </div>
                  <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#065f46', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Supplier Info</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Name</span>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{selectedOrder.vendor?.name || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Email</span>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{selectedOrder.vendor?.contact || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Phone</span>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{selectedOrder.vendor?.phone || '—'}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: '4px' }}>Received By *</label>
                    <input
                      placeholder="Your name"
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1', marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Notes</label>
                    <input
                      placeholder="Notes..."
                      value={receiptNotes}
                      onChange={(e) => setReceiptNotes(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', fontSize: '11px' }}>
                  <span style={{ background: '#ffffff', border: '1px solid #e5e7eb', padding: '3px 10px', borderRadius: '20px' }}>⬜ Match</span>
                  <span style={{ background: '#fff7ed', border: '1px solid #fb923c', padding: '3px 10px', borderRadius: '20px', color: '#9a3412' }}>🟠 Short</span>
                  <span style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '3px 10px', borderRadius: '20px', color: '#166534' }}>🟢 Extra</span>
                </div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Item</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Unit</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Ordered</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Reg. Number</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Received</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Diff</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Return Qty</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>Return Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items && selectedOrder.items.map((item: any) => (
                        <tr key={item.id} style={{ background: '#ffffff' }}>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827', fontWeight: 600, minWidth: '140px' }}>
                            {item.item?.name || item.name}
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '12px', color: '#6b7280' }}>
                            {item.item?.uom || item.uom || '—'}
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827', fontWeight: 700, textAlign: 'center' }}>
                            {item.orderedqty}
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>
                            <input
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder=""
                              type="text"
                              value={itemBatchNumbers[item.id] || ''}
                              onChange={(e) => setItemBatchNumbers({ ...itemBatchNumbers, [item.id]: e.target.value })}
                              style={{ width: '100px', padding: '5px 6px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
                            />
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>
                            <input
                              min="0"
                              type="number"
                              value={itemReceivedQtys[item.id] || item.orderedqty.toString()}
                              onChange={(e) => setItemReceivedQtys({ ...itemReceivedQtys, [item.id]: e.target.value })}
                              style={{ width: '75px', padding: '5px 6px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box', textAlign: 'center' }}
                            />
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827', textAlign: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>
                              {(() => {
                                const ordered = item.orderedqty;
                                const received = parseInt(itemReceivedQtys[item.id] || item.orderedqty.toString());
                                const diff = received - ordered;
                                if (diff === 0) return '—';
                                return diff > 0 ? `+${diff}` : diff;
                              })()}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>
                            <input
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="0"
                              type="text"
                              value={itemReturnQtys[item.id] || ''}
                              onChange={(e) => setItemReturnQtys({ ...itemReturnQtys, [item.id]: e.target.value })}
                              style={{ width: '75px', padding: '5px 6px', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '13px', color: '#111827', boxSizing: 'border-box', textAlign: 'center' }}
                            />
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>
                            <input
                              maxLength="120"
                              placeholder="Return reason..."
                              type="text"
                              value={itemReturnNotes[item.id] || ''}
                              onChange={(e) => setItemReturnNotes({ ...itemReturnNotes, [item.id]: e.target.value })}
                              style={{ width: '180px', padding: '5px 6px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', marginTop: '8px' }}>
                  <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '8px', padding: '8px 14px', color: '#065f46', fontWeight: 600 }}>
                    ✓ All match
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                {selectedOrder.items?.length || 0} items · Received by: {receivedBy || '—'}
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowGRNDialog(false)}
                  style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb', background: '#f3f4f6', color: '#374151' }}
                >
                  Cancel
                </button>
                <button
                  disabled={!receivedBy}
                  onClick={() => alert('GRN creation coming soon')}
                  style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', background: '#16a34a', color: '#ffffff', minWidth: '160px', opacity: receivedBy ? 1 : 0.5 }}
                >
                  ✓ Confirm Receipt
                </button>
              </div>
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
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Currency</label>
                    <select 
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="IQD">IQD - Iraqi Dinar</option>
                      <option value="AED">AED - UAE Dirham</option>
                      <option value="SAR">SAR - Saudi Riyal</option>
                      <option value="KWD">KWD - Kuwaiti Dinar</option>
                      <option value="QAR">QAR - Qatari Riyal</option>
                      <option value="EGP">EGP - Egyptian Pound</option>
                      <option value="TRY">TRY - Turkish Lira</option>
                    </select>
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
