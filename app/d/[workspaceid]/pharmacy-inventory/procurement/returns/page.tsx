'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Search, RefreshCw, Eye, Truck, X } from 'lucide-react';
import type { SupplierReturn } from '@/lib/types/procurement';
import PageHeader from '@/app/components/PageHeader';

export default function SupplierReturnsPage() {
  const params = useParams();
  const workspaceid = params.workspaceid as string;
  const [returns, setReturns] = useState<SupplierReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);

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

  const fetchClaims = async () => {
    try {
      const response = await fetch(`/api/d/${workspaceid}/procurement/claims?status=approved`);
      if (response.ok) {
        const data = await response.json();
        setClaims(data);
      }
    } catch (error) {
      console.error('Error fetching claims:', error);
    }
  };

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (dateFrom) params.append('datefrom', dateFrom);
      if (dateTo) params.append('dateto', dateTo);

      const response = await fetch(`/api/d/${workspaceid}/procurement/returns?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReturns(data);
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceid) {
      fetchReturns();
    }
    fetchVendors();
    fetchWarehouses();
    fetchClaims();
  }, [workspaceid, statusFilter, searchQuery, dateFrom, dateTo]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { background: '#fef3c7', color: '#d97706' };
      case 'authorized': return { background: '#dbeafe', color: '#2563eb' };
      case 'shipped': return { background: '#e0f2fe', color: '#0891b2' };
      case 'received': return { background: '#f3f4f6', color: '#6b7280' };
      case 'credited': return { background: '#d1fae5', color: '#16a34a' };
      default: return { background: '#f3f4f6', color: '#374151' };
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', marginTop: '8px' }}>
      <PageHeader
        title="Supplier Returns"
        backPath={`/d/${workspaceid}/pharmacy-inventory`}
        description="Track items returned to suppliers for credit or replacement"
      />
      
      {/* Info Banner */}
      <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Truck style={{ width: '18px', height: '18px', color: '#2563eb' }} />
        <span style={{ fontSize: '12px', color: '#1e40af' }}>
          Supplier Returns track items returned to suppliers for credit or replacement. Posted returns deduct inventory stock.
        </span>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: '#fef3c7', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#d97706', marginBottom: '4px' }}>Pending</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{returns.filter(r => r.status === 'pending').length}</div>
        </div>
        <div style={{ background: '#e0f2fe', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#0891b2', marginBottom: '4px' }}>Shipped</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{returns.filter(r => r.status === 'shipped').length}</div>
        </div>
        <div style={{ background: '#dbeafe', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', marginBottom: '4px' }}>Received</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{returns.filter(r => r.status === 'received').length}</div>
        </div>
        <div style={{ background: '#d1fae5', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', marginBottom: '4px' }}>Credited</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{returns.filter(r => r.status === 'credited').length}</div>
        </div>
      </div>

      {/* Table Section */}
      <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: '16px' }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Supplier Returns</span>
          
          {/* Status Filters */}
          <div style={{ display: 'flex', gap: '5px' }}>
            {['ALL', 'PENDING', 'AUTHORIZED', 'SHIPPED', 'CREDITED'].map((status) => (
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
              placeholder="Search return #, supplier, by..."
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
            onClick={fetchReturns}
            style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb', background: '#f3f4f6', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw style={{ width: '13px', height: '13px' }} />
          </button>

          {/* Create Return Button */}
          <button
            onClick={() => setShowCreateDialog(true)}
            style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', background: '#6366f1', color: '#ffffff', marginLeft: 'auto' }}
          >
            🚚 Create Return
          </button>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Return #', 'Claim #', 'Supplier', 'Items', 'Total', 'Return Date', 'Status', 'Actions'].map((col) => (
                  <th key={col} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Loading...</td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No returns found</td>
                </tr>
              ) : (
                returns.map((ret) => (
                  <tr key={ret.id}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '11px', color: '#6366f1', fontFamily: 'monospace', fontWeight: 600 }}>
                      {ret.returnnumber}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '11px', color: '#6366f1', fontFamily: 'monospace' }}>
                      {ret.claim?.claimnumber || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>
                      {ret.vendor?.name || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827', fontWeight: 600 }}>
                      {ret.items?.length || 0} items
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>
                      ${ret.totalamount?.toFixed(2) || '0.00'}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '12px', color: '#6b7280' }}>
                      {new Date(ret.returndate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: getStatusColor(ret.status).background, color: getStatusColor(ret.status).color }}>
                        {ret.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>
                      <button title="View Details" style={{ background: '#eff6ff', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer' }}>
                        <Eye style={{ width: '12px', height: '12px', color: '#2563eb' }} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Return Dialog */}
      {showCreateDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: 0, width: '1040px', maxHeight: '96vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>🚚 Create Supplier Return</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Return items to supplier for credit or replacement</div>
              </div>
              <button onClick={() => setShowCreateDialog(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X style={{ width: '18px', height: '18px', color: '#6b7280' }} />
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Claim (optional)</label>
                  <select style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}>
                    <option value="">— Select claim (optional) —</option>
                    {claims.map((claim) => (
                      <option key={claim.id} value={claim.id}>{claim.claimnumber}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: '4px' }}>Supplier *</label>
                  <select style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}>
                    <option value="">— Select supplier —</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Expected Date</label>
                  <input type="date" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: '4px' }}>Description *</label>
                  <input placeholder="Reason for return..." style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '28px', textAlign: 'center', marginBottom: '4px' }}>
                <div style={{ fontSize: '28px', marginBottom: '6px' }}>📦</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Select items to return</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Search inventory to add items to this return</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button onClick={() => setShowCreateDialog(false)} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb', background: '#ffffff', color: '#374151' }}>
                  Cancel
                </button>
                <button style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', background: '#6366f1', color: '#ffffff' }}>
                  Create Return
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
