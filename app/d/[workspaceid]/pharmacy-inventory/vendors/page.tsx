'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Search, Plus, RefreshCw, Edit, Trash2, Package, DollarSign, Star, X } from 'lucide-react';
import PageHeader from '@/app/components/PageHeader';

export default function VendorsPage() {
  const params = useParams();
  const workspaceid = params.workspaceid as string;
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [showItemsDialog, setShowItemsDialog] = useState(false);
  const [showPaymentsDialog, setShowPaymentsDialog] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeFilter !== 'all') params.append('active', activeFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/d/${workspaceid}/pharmacy-inventory/vendors?${params}`);
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceid) {
      fetchVendors();
    }
  }, [workspaceid, activeFilter, searchQuery]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;
    
    try {
      const response = await fetch(`/api/d/${workspaceid}/pharmacy-inventory/vendors/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchVendors();
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
    }
  };

  const getRatingStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star key={i} style={{ width: '14px', height: '14px', fill: i < rating ? '#f59e0b' : '#d1d5db' }} />
    ));
  };

  const getAverageRating = (vendor: any) => {
    const ratings = [vendor.ratingquality || 0, vendor.ratingdelivery || 0, vendor.ratingpricing || 0];
    const sum = ratings.reduce((a, b) => a + b, 0);
    return (sum / 3).toFixed(1);
  };

  return (
    <div style={{ padding: '24px', background: '#f9fafb', minHeight: '100vh' }}>
      <PageHeader
        title="Vendors"
        backPath={`/d/${workspaceid}/pharmacy-inventory`}
        description="Manage supplier information and relationships"
      />
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>Vendors</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>Manage supplier information and relationships</p>
        </div>
        <button
          onClick={() => { setEditingVendor(null); setShowCreateDialog(true); }}
          style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', background: '#6366f1', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus style={{ width: '16px', height: '16px' }} />
          Add Vendor
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', width: '16px', height: '16px', color: '#9ca3af' }} />
          <input
            placeholder="Search by name, code, contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '8px 10px 8px 36px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['all', 'active', 'inactive'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                background: activeFilter === filter ? '#6366f1' : '#ffffff',
                color: activeFilter === filter ? '#ffffff' : '#374151',
                borderColor: activeFilter === filter ? '#6366f1' : '#e5e7eb'
              }}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={fetchVendors}
          style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#ffffff', cursor: 'pointer' }}
        >
          <RefreshCw style={{ width: '16px', height: '16px', color: '#6b7280' }} />
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Code', 'Name', 'Contact', 'Phone', 'Email', 'Rating', 'Orders', 'Purchases', 'Status', 'Actions'].map((col) => (
                <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading...</td>
              </tr>
            ) : vendors.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>No vendors found</td>
              </tr>
            ) : (
              vendors.map((vendor) => (
                <tr key={vendor.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#111827', fontWeight: 500 }}>{vendor.code || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#111827', fontWeight: 600 }}>{vendor.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{vendor.contactname || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{vendor.phone || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{vendor.email || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#111827' }}>
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                      {getRatingStars(parseFloat(getAverageRating(vendor)))}
                      <span style={{ marginLeft: '6px', fontSize: '12px', color: '#6b7280' }}>{getAverageRating(vendor)}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#111827', fontWeight: 600 }}>{vendor.totalorders || 0}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>${vendor.totalpurchases || '0.00'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: vendor.isactive ? '#d1fae5' : '#fee2e2', color: vendor.isactive ? '#16a34a' : '#dc2626' }}>
                      {vendor.isactive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => { setEditingVendor(vendor); setShowCreateDialog(true); }}
                        title="Edit"
                        style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#ffffff', cursor: 'pointer' }}
                      >
                        <Edit style={{ width: '14px', height: '14px', color: '#6b7280' }} />
                      </button>
                      <button
                        onClick={() => { setSelectedVendor(vendor); setShowItemsDialog(true); }}
                        title="Items"
                        style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#ffffff', cursor: 'pointer' }}
                      >
                        <Package style={{ width: '14px', height: '14px', color: '#6b7280' }} />
                      </button>
                      <button
                        onClick={() => { setSelectedVendor(vendor); setShowPaymentsDialog(true); }}
                        title="Payments"
                        style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#ffffff', cursor: 'pointer' }}
                      >
                        <DollarSign style={{ width: '14px', height: '14px', color: '#6b7280' }} />
                      </button>
                      <button
                        onClick={() => handleDelete(vendor.id)}
                        title="Delete"
                        style={{ padding: '6px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fee2e2', cursor: 'pointer' }}
                      >
                        <Trash2 style={{ width: '14px', height: '14px', color: '#dc2626' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Vendor Dialog */}
      {showCreateDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: 0, width: '800px', maxHeight: '96vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{editingVendor ? 'Update vendor information' : 'Create a new vendor'}</div>
              </div>
              <button onClick={() => { setShowCreateDialog(false); setEditingVendor(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X style={{ width: '18px', height: '18px', color: '#6b7280' }} />
              </button>
            </div>
            <CreateVendorForm
              workspaceid={workspaceid}
              vendor={editingVendor}
              onSuccess={() => { setShowCreateDialog(false); setEditingVendor(null); fetchVendors(); }}
              onCancel={() => { setShowCreateDialog(false); setEditingVendor(null); }}
            />
          </div>
        </div>
      )}

      {/* Vendor Items Dialog */}
      {showItemsDialog && selectedVendor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: 0, width: '900px', maxHeight: '96vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>📦 Items - {selectedVendor.name}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Manage items supplied by this vendor</div>
              </div>
              <button onClick={() => { setShowItemsDialog(false); setSelectedVendor(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X style={{ width: '18px', height: '18px', color: '#6b7280' }} />
              </button>
            </div>
            <VendorItemsDialog
              workspaceid={workspaceid}
              vendorId={selectedVendor.id}
              onClose={() => { setShowItemsDialog(false); setSelectedVendor(null); }}
            />
          </div>
        </div>
      )}

      {/* Vendor Payments Dialog */}
      {showPaymentsDialog && selectedVendor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: 0, width: '900px', maxHeight: '96vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>💰 Payments - {selectedVendor.name}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Payment history with this vendor</div>
              </div>
              <button onClick={() => { setShowPaymentsDialog(false); setSelectedVendor(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X style={{ width: '18px', height: '18px', color: '#6b7280' }} />
              </button>
            </div>
            <VendorPaymentsDialog
              workspaceid={workspaceid}
              vendorId={selectedVendor.id}
              onClose={() => { setShowPaymentsDialog(false); setSelectedVendor(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CreateVendorForm({ workspaceid, vendor, onSuccess, onCancel }: any) {
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
      const url = vendor 
        ? `/api/d/${workspaceid}/pharmacy-inventory/vendors/${vendor.id}`
        : `/api/d/${workspaceid}/pharmacy-inventory/vendors`;
      
      const response = await fetch(url, {
        method: vendor ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving vendor:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>Basic Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: '4px' }}>Company Name *</label>
            <input name="name" defaultValue={vendor?.name} required style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Code</label>
            <input name="code" defaultValue={vendor?.code} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Contact Name</label>
            <input name="contactname" defaultValue={vendor?.contactname} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Phone</label>
            <input name="phone" defaultValue={vendor?.phone} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Email</label>
            <input name="email" type="email" defaultValue={vendor?.email} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Website</label>
            <input name="website" defaultValue={vendor?.website} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>Address</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Address</label>
            <input name="address" defaultValue={vendor?.address} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Country</label>
            <input name="country" defaultValue={vendor?.country} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>Payment Terms</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Payment Terms (days)</label>
            <input name="paymentterms" type="number" defaultValue={vendor?.paymentterms || 30} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Currency</label>
            <input name="currency" defaultValue={vendor?.currency || 'USD'} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Tax Number</label>
            <input name="taxnumber" defaultValue={vendor?.taxnumber} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>Bank Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Bank Name</label>
            <input name="bankName" defaultValue={vendor?.bankname} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Account Number</label>
            <input name="bankAccountNumber" defaultValue={vendor?.bankaccountnumber} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Routing Number</label>
            <input name="bankRoutingNumber" defaultValue={vendor?.bankroutingnumber} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>IBAN</label>
            <input name="bankIban" defaultValue={vendor?.bankiban} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>SWIFT Code</label>
            <input name="bankSwiftCode" defaultValue={vendor?.bankswiftcode} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>Performance Ratings</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Quality (1-5)</label>
            <input name="ratingQuality" type="number" min="1" max="5" defaultValue={vendor?.ratingquality || 0} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Delivery (1-5)</label>
            <input name="ratingDelivery" type="number" min="1" max="5" defaultValue={vendor?.ratingdelivery || 0} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Pricing (1-5)</label>
            <input name="ratingPricing" type="number" min="1" max="5" defaultValue={vendor?.ratingpricing || 0} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Notes</label>
        <textarea name="notes" defaultValue={vendor?.notes} rows={3} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }} />
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: '1px solid #d1d5db', background: '#ffffff', color: '#374151' }}>
          Cancel
        </button>
        <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', background: '#6366f1', color: '#ffffff' }}>
          {vendor ? 'Update' : 'Create'} Vendor
        </button>
      </div>
    </form>
  );
}

function VendorItemsDialog({ workspaceid, vendorId, onClose }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/d/${workspaceid}/pharmacy-inventory/vendors/${vendorId}/items`)
      .then(res => res.json())
      .then(data => { setItems(data); setLoading(false); })
      .catch(console.error);
  }, [workspaceid, vendorId]);

  return (
    <div style={{ padding: '24px' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📦</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>No items yet</div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Items supplied by this vendor will appear here</div>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Item Code', 'Name', 'UoM', 'Primary', 'Lead Time', 'Min Order', 'Unit Price'].map((col) => (
                <th key={col} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 12px', fontSize: '13px', color: '#111827' }}>{item.item_code || '—'}</td>
                <td style={{ padding: '10px 12px', fontSize: '13px', color: '#111827', fontWeight: 600 }}>{item.item_name}</td>
                <td style={{ padding: '10px 12px', fontSize: '13px', color: '#6b7280' }}>{item.uom || '—'}</td>
                <td style={{ padding: '10px 12px' }}>
                  {item.is_primary_supplier ? (
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '12px', background: '#dbeafe', color: '#2563eb' }}>Yes</span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>No</span>
                  )}
                </td>
                <td style={{ padding: '10px 12px', fontSize: '13px', color: '#6b7280' }}>{item.lead_time_days || 0} days</td>
                <td style={{ padding: '10px 12px', fontSize: '13px', color: '#6b7280' }}>{item.min_order_qty || 1}</td>
                <td style={{ padding: '10px 12px', fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>${item.unit_price || '0.00'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ marginTop: '16px', textAlign: 'right' }}>
        <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: '1px solid #d1d5db', background: '#ffffff', color: '#374151' }}>
          Close
        </button>
      </div>
    </div>
  );
}

function VendorPaymentsDialog({ workspaceid, vendorId, onClose }: any) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/d/${workspaceid}/pharmacy-inventory/vendors/${vendorId}/payments`)
      .then(res => res.json())
      .then(data => { setPayments(data); setLoading(false); })
      .catch(console.error);
  }, [workspaceid, vendorId]);

  return (
    <div style={{ padding: '24px' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading...</div>
      ) : payments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>💰</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>No payments yet</div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Payment history will appear here</div>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Reference', 'Amount', 'Date', 'Method', 'Status'].map((col) => (
                <th key={col} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 12px', fontSize: '13px', color: '#111827' }}>{payment.payment_reference || '—'}</td>
                <td style={{ padding: '10px 12px', fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>${payment.amount || '0.00'}</td>
                <td style={{ padding: '10px 12px', fontSize: '13px', color: '#6b7280' }}>{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '—'}</td>
                <td style={{ padding: '10px 12px', fontSize: '13px', color: '#6b7280' }}>{payment.payment_method || '—'}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '12px', background: '#d1fae5', color: '#16a34a' }}>
                    {payment.status || 'Completed'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ marginTop: '16px', textAlign: 'right' }}>
        <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: '1px solid #d1d5db', background: '#ffffff', color: '#374151' }}>
          Close
        </button>
      </div>
    </div>
  );
}
