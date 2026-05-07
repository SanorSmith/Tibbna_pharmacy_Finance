'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Search, RefreshCw, Eye, Check, X } from 'lucide-react';
import type { SupplierClaim } from '@/lib/types/procurement';
import PageHeader from '@/app/components/PageHeader';

export default function SupplierClaimsPage() {
  const params = useParams();
  const workspaceid = params.workspaceid as string;
  const [claims, setClaims] = useState<SupplierClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [claimTypeFilter, setClaimTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);

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

  const fetchGRNs = async () => {
    try {
      const response = await fetch(`/api/d/${workspaceid}/procurement/grn?status=posted`);
      if (response.ok) {
        const data = await response.json();
        setGrns(data);
      }
    } catch (error) {
      console.error('Error fetching GRNs:', error);
    }
  };

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (claimTypeFilter !== 'ALL') params.append('claimtype', claimTypeFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (dateFrom) params.append('datefrom', dateFrom);
      if (dateTo) params.append('dateto', dateTo);

      const response = await fetch(`/api/d/${workspaceid}/procurement/claims?${params}`);
      if (response.ok) {
        const data = await response.json();
        setClaims(data);
      }
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceid) {
      fetchClaims();
    }
    fetchVendors();
    fetchWarehouses();
    fetchGRNs();
  }, [workspaceid, statusFilter, claimTypeFilter, searchQuery, dateFrom, dateTo]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return { background: '#fef3c7', color: '#d97706' };
      case 'approved': return { background: '#dbeafe', color: '#2563eb' };
      case 'rejected': return { background: '#fee2e2', color: '#dc2626' };
      case 'resolved': return { background: '#d1fae5', color: '#16a34a' };
      default: return { background: '#f3f4f6', color: '#374151' };
    }
  };

  const getClaimTypeColor = (type: string) => {
    switch (type) {
      case 'DAMAGED': return { background: '#fee2e2', color: '#dc2626' };
      case 'INCORRECT': return { background: '#fef3c7', color: '#d97706' };
      case 'SHORTAGE': return { background: '#dbeafe', color: '#2563eb' };
      case 'EXPIRED': return { background: '#f3f4f6', color: '#6b7280' };
      default: return { background: '#f3f4f6', color: '#374151' };
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', marginTop: '8px' }}>
      <PageHeader
        title="Supplier Claims"
        backPath={`/d/${workspaceid}/pharmacy-inventory`}
        description="Manage claims against suppliers for damaged, incorrect, or short-supplied goods"
      />
      
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: '#fef3c7', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#d97706', marginBottom: '4px' }}>Submitted</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{claims.filter(c => c.status === 'submitted').length}</div>
        </div>
        <div style={{ background: '#dbeafe', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', marginBottom: '4px' }}>Approved</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{claims.filter(c => c.status === 'approved').length}</div>
        </div>
        <div style={{ background: '#fee2e2', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626', marginBottom: '4px' }}>Rejected</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{claims.filter(c => c.status === 'rejected').length}</div>
        </div>
        <div style={{ background: '#d1fae5', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', marginBottom: '4px' }}>Resolved</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{claims.filter(c => c.status === 'resolved').length}</div>
        </div>
      </div>

      {/* Table Section */}
      <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: '16px' }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Supplier Claims</span>
          
          {/* Status Filters */}
          <div style={{ display: 'flex', gap: '5px' }}>
            {['ALL', 'SUBMITTED', 'APPROVED', 'REJECTED', 'RESOLVED'].map((status) => (
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

          {/* Claim Type Filters */}
          <div style={{ display: 'flex', gap: '5px' }}>
            {['ALL', 'DAMAGED', 'INCORRECT', 'SHORTAGE', 'EXPIRED'].map((type) => (
              <button
                key={type}
                onClick={() => setClaimTypeFilter(type)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: claimTypeFilter === type ? '1px solid #6366f1' : '1px solid #e5e7eb',
                  background: claimTypeFilter === type ? '#6366f1' : '#f9fafb',
                  color: claimTypeFilter === type ? '#ffffff' : '#374151',
                }}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search style={{ position: 'absolute', left: '8px', width: '13px', height: '13px', color: '#9ca3af' }} />
            <input
              placeholder="Search claim #, supplier, by..."
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
            onClick={fetchClaims}
            style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb', background: '#f3f4f6', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw style={{ width: '13px', height: '13px' }} />
          </button>

          {/* Create Claim Button */}
          <button
            onClick={() => setShowCreateDialog(true)}
            style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', background: '#6366f1', color: '#ffffff', marginLeft: 'auto' }}
          >
            ⚠️ Create Claim
          </button>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Claim #', 'Type', 'Supplier', 'GRN', 'Amount', 'Date', 'Status', 'Actions'].map((col) => (
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
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No claims found</td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '11px', color: '#6366f1', fontFamily: 'monospace', fontWeight: 600 }}>
                      {claim.claimnumber}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: getClaimTypeColor(claim.claimtype).background, color: getClaimTypeColor(claim.claimtype).color }}>
                        {claim.claimtype}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>
                      {claim.vendor?.name || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '11px', color: '#6366f1', fontFamily: 'monospace' }}>
                      {claim.grnid ? 'GRN' : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>
                      ${claim.amountclaimed?.toFixed(2) || '0.00'}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '12px', color: '#6b7280' }}>
                      {new Date(claim.claimdate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: getStatusColor(claim.status).background, color: getStatusColor(claim.status).color }}>
                        {claim.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f9fafb', fontSize: '13px', color: '#111827' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button title="View" style={{ background: '#eff6ff', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer' }}>
                          <Eye style={{ width: '12px', height: '12px', color: '#2563eb' }} />
                        </button>
                        {claim.status === 'submitted' && (
                          <>
                            <button title="Approve" style={{ background: '#d1fae5', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer' }}>
                              <Check style={{ width: '12px', height: '12px', color: '#16a34a' }} />
                            </button>
                            <button title="Reject" style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer' }}>
                              <X style={{ width: '12px', height: '12px', color: '#dc2626' }} />
                            </button>
                          </>
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

      {/* Create Claim Dialog */}
      {showCreateDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: 0, width: '1040px', maxHeight: '96vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>⚠️ Create Supplier Claim</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Create a claim against supplier for damaged/incorrect/shortage/expired items</div>
              </div>
              <button onClick={() => setShowCreateDialog(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X style={{ width: '18px', height: '18px', color: '#6b7280' }} />
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: '4px' }}>GRN *</label>
                  <select style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}>
                    <option value="">— Select GRN —</option>
                    {grns.map((grn) => (
                      <option key={grn.id} value={grn.id}>{grn.grnnumber}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: '4px' }}>Vendor *</label>
                  <select style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}>
                    <option value="">— Select vendor —</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: '4px' }}>Claim Type *</label>
                  <select style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}>
                    <option value="">— Select type —</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="INCORRECT">Incorrect</option>
                    <option value="SHORTAGE">Shortage</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: '4px' }}>Quantity Claimed *</label>
                  <input type="number" min="1" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: '4px' }}>Description *</label>
                  <input placeholder="Describe the issue..." style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Amount Claimed</label>
                  <input type="number" min="0" step="0.01" placeholder="0.00" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button onClick={() => setShowCreateDialog(false)} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb', background: '#ffffff', color: '#374151' }}>
                  Cancel
                </button>
                <button style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', background: '#6366f1', color: '#ffffff' }}>
                  Create Claim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
