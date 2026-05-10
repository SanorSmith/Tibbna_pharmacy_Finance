"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PharmacyNav } from "@/components/pharmacy/PharmacyNav";

/* ── Icons & Styles (matching hospital inventory) ─────────────────────────── */
const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const icons = {
  back: "M19 12H5M12 5l-7 7 7 7", plus: "M12 5v14M5 12h14", x: "M18 6L6 18M6 6l12 12",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", check: "M20 6L9 17l-5-5",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  cart: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0",
  doc: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6",
  chevronDown: "M6 9l6 6 6-6",
};
const s: Record<string, any> = {
  page: { fontFamily: "Inter,sans-serif", minHeight: "100vh", background: "#f8f9fa", color: "#111827" },
  header: { background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 12, position: "sticky" as const, top: 0, zIndex: 10 },
  content: { padding: 24, maxWidth: 1400, margin: "0 auto" },
  tabs: { display: "flex", gap: 2, marginBottom: 16, background: "#f0f0ff", border: "1px solid #e0e0ff", flexWrap: "wrap" as const, borderRadius: 12, padding: "5px", position: "sticky" as const, top: 56, zIndex: 9, boxShadow: "0 2px 8px rgba(99,102,241,0.08)" },
  tab: (a: boolean) => ({ padding: "9px 16px", fontSize: 12, fontWeight: a ? 700 : 500, border: "none", background: a ? "#6366f1" : "transparent", cursor: "pointer", color: a ? "#fff" : "#6366f1", borderRadius: 8, margin: "2px", whiteSpace: "nowrap" as const, boxShadow: a ? "0 2px 10px rgba(99,102,241,0.25)" : "none" }),
  card: { background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: 16 },
  th: { padding: "10px 12px", textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" as const, background: "#f9fafb", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" as const },
  td: { padding: "10px 12px", borderBottom: "1px solid #f9fafb", fontSize: 13, color: "#111827" },
  btn: (c: string) => ({ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: c === "purple" ? "#6366f1" : c === "green" ? "#16a34a" : c === "blue" ? "#2563eb" : c === "red" ? "#dc2626" : c === "orange" ? "#d97706" : "#f3f4f6", color: c === "ghost" ? "#374151" : "#fff" }),
  input: { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, color: "#111827", boxSizing: "border-box" as const },
  label: { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modal: { background: "#fff", borderRadius: 12, padding: 28, width: 680, maxHeight: "90vh", overflowY: "auto" as const },
  fgroup: { marginBottom: 12 },
  badge: (bg: string, color: string) => ({ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: bg, color }),
};
const statusColors: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: "#fef3c7", color: "#92400e" },
  PARTIALLY_DELIVERED: { bg: "#fed7aa", color: "#92400e" },
  DELIVERED: { bg: "#d1fae5", color: "#065f46" },
  CANCELLED: { bg: "#fee2e2", color: "#991b1b" },
  PARTIAL: { bg: "#fed7aa", color: "#92400e" },
  COMPLETE: { bg: "#d1fae5", color: "#065f46" },
  CORRECTION: { bg: "#dbeafe", color: "#1d4ed8" },
};
const PG = 15;

// ── Dropdown Menu Component ────────────────────────────────────────────────────
function DropdownMenu({ label, isOpen, onToggle, onClose, children }: { label: string; isOpen: boolean; onToggle: () => void; onClose: () => void; children: any }) {
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      <button
        onClick={onToggle}
        style={{
          padding: "10px 18px",
          fontSize: 13,
          fontWeight: 700,
          border: "1px solid #e5e7eb",
          background: isOpen ? "#ffffff" : "transparent",
          cursor: "pointer",
          color: isOpen ? "#2563eb" : "#6b7280",
          borderRadius: 6,
          margin: "4px 2px",
          boxShadow: isOpen ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          display: "flex",
          alignItems: "center",
          gap: 6
        }}
      >
        {label}
        <Icon d={icons.chevronDown} size={12} color={isOpen ? "#2563eb" : "#6b7280"} />
      </button>
      {isOpen && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          minWidth: 180,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 100,
          marginTop: 4,
          padding: 4
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Pagination({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / PG); if (pages <= 1) return null;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end", padding: "10px 16px", borderTop: "1px solid #f3f4f6", background: "#fafafa" }}>
      <button onClick={() => onPage(page - 1)} disabled={page === 1} style={{ padding: "5px 12px", fontSize: 12, borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: page === 1 ? "default" : "pointer", opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
      <span style={{ fontSize: 12, color: "#6b7280" }}>Page {page} of {pages} · {total} records</span>
      <button onClick={() => onPage(page + 1)} disabled={page >= pages} style={{ padding: "5px 12px", fontSize: 12, borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: page >= pages ? "default" : "pointer", opacity: page >= pages ? 0.4 : 1 }}>Next →</button>
    </div>
  );
}

/* ── CreateOrderModal ─────────────────────────────────────────────────────── */
function CreateOrderModal({ allItems, suppliers, onClose, onSuccess, onSearchItems }: { allItems: any[]; suppliers: any[]; onClose: () => void; onSuccess: () => void; onSearchItems: (search: string) => void }) {
  const { workspaceid } = useParams<{ workspaceid: string }>();
  const [form, setForm] = useState({ orderedBy: "", orderDate: new Date().toISOString().slice(0, 10), expectedDate: "", supplierId: "", supplierName: "", supplierEmail: "", supplierPhone: "", notes: "" });
  const [cart, setCart] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const filtered = allItems; // API now handles filtering
  const addItem = (item: any) => { if (cart.find(c => c.itemId === item.itemid)) return; setCart(c => [...c, { itemId: item.itemid, itemName: item.name, uom: item.uom || "piece", orderedQty: 1, unitCost: "" }]); setItemSearch(""); };
  const updateCart = (idx: number, k: string, v: any) => setCart(c => c.map((x, i) => i === idx ? { ...x, [k]: v } : x));
  
  // Load cart data from sessionStorage if available
  useEffect(() => {
    const cartDataStr = sessionStorage.getItem('pharmacyCartData_temp');
    if (cartDataStr) {
      try {
        const cartData = JSON.parse(cartDataStr);
        if (cartData.items && cartData.items.length > 0) {
          setCart(cartData.items);
          if (cartData.supplier) {
            const supplier = suppliers.find(s => s.name === cartData.supplier);
            if (supplier) {
              setForm(f => ({ ...f, supplierId: supplier.id, supplierName: supplier.name, supplierEmail: supplier.email || "", supplierPhone: supplier.phone || "" }));
            }
          }
          if (cartData.createdBy) {
            setForm(f => ({ ...f, orderedBy: cartData.createdBy }));
          }
          sessionStorage.removeItem('pharmacyCartData_temp');
        }
      } catch (e) {
        console.error('Failed to parse temp cart data:', e);
        sessionStorage.removeItem('pharmacyCartData_temp');
      }
    }
  }, [suppliers]);
  
  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchItems(itemSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [itemSearch, onSearchItems]);
  const removeCart = (idx: number) => setCart(c => c.filter((_, i) => i !== idx));
  const total = cart.reduce((s, c) => s + (c.orderedQty || 0) * (parseFloat(c.unitCost) || 0), 0);
  const handleSupplierChange = (id: string) => {
    const sup = suppliers.find((s: any) => s.id === id);
    if (sup) setForm(f => ({ ...f, supplierId: id, supplierName: sup.name, supplierEmail: sup.email || "", supplierPhone: sup.phone || "" }));
  };
  const handleSubmit = async () => {
    if (!form.orderedBy.trim()) { setError("Ordered by is required"); return; }
    if (!cart.length) { setError("Add at least one item"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-procurement/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, items: cart }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      onSuccess(); onClose();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  return (
    <div style={s.overlay}><div style={{ ...s.modal, width: 780 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>📋 New Purchase Order</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon d={icons.x} size={18} color="#6b7280" /></button>
      </div>
      {error && <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={s.fgroup}><label style={s.label}>Ordered By *</label><input style={s.input} value={form.orderedBy} onChange={e => set("orderedBy", e.target.value)} /></div>
        <div style={s.fgroup}><label style={s.label}>Supplier *</label>
          <select style={s.input} value={form.supplierId} onChange={e => handleSupplierChange(e.target.value)}>
            <option value="">Select supplier</option>
            {suppliers.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div style={s.fgroup}><label style={s.label}>Order Date</label><input type="date" style={s.input} value={form.orderDate} onChange={e => set("orderDate", e.target.value)} /></div>
        <div style={s.fgroup}><label style={s.label}>Expected Date</label><input type="date" style={s.input} value={form.expectedDate} onChange={e => set("expectedDate", e.target.value)} /></div>
        <div style={{ gridColumn: "1/-1", ...s.fgroup }}><label style={s.label}>Notes</label><input style={s.input} value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
      </div>
      <div style={{ marginTop: 16, marginBottom: 8 }}>
        <label style={s.label}>Search Items</label>
        <div style={{ position: "relative" }}>
          <input style={{ ...s.input, borderColor: "#6366f1" }} value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Search by name or code..." />
          {itemSearch && filtered.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #6366f1", borderRadius: 8, zIndex: 200, maxHeight: 200, overflowY: "auto" }}>
              {filtered.slice(0, 10).map(item => (
                <div key={item.itemid} onClick={() => addItem(item)} style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                  <span><strong>{item.name}</strong> <span style={{ fontSize: 11, color: "#6b7280" }}>{item.itemcode}</span></span>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>{item.uom}{cart.find(c => c.itemId === item.itemid) ? " ✓ added" : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {cart.length > 0 && (
        <div style={s.card}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Item", "UOM", "Qty", "Unit Cost", "Total", ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>{cart.map((c, i) => (
              <tr key={i}>
                <td style={s.td}>{c.itemName}</td>
                <td style={s.td}>{c.uom}</td>
                <td style={s.td}><input type="number" min={1} style={{ ...s.input, width: 70 }} value={c.orderedQty} onChange={e => updateCart(i, "orderedQty", parseInt(e.target.value) || 0)} /></td>
                <td style={s.td}><input type="number" step="0.01" style={{ ...s.input, width: 90 }} value={c.unitCost} onChange={e => updateCart(i, "unitCost", e.target.value)} /></td>
                <td style={s.td}>{((c.orderedQty || 0) * (parseFloat(c.unitCost) || 0)).toFixed(2)}</td>
                <td style={s.td}><button onClick={() => removeCart(i)} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon d={icons.trash} size={14} color="#dc2626" /></button></td>
              </tr>
            ))}</tbody>
          </table>
          <div style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 14, borderTop: "1px solid #e5e7eb" }}>Total: {total.toFixed(2)}</div>
        </div>
      )}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
        <button onClick={onClose} style={{ ...s.btn("ghost"), border: "1px solid #e5e7eb" }}>Cancel</button>
        <button onClick={handleSubmit} disabled={loading} style={s.btn("purple")}>{loading ? "Creating..." : "📋 Create Order"}</button>
      </div>
    </div></div>
  );
}

/* ── EditOrderModal ───────────────────────────────────────────────────────── */
function EditOrderModal({ detail, suppliers, allItems, onClose, onSuccess, onSearchItems }: { detail: any; suppliers: any[]; allItems: any[]; onClose: () => void; onSuccess: () => void; onSearchItems: (search: string) => void }) {
  const { workspaceid } = useParams<{ workspaceid: string }>();
  const ord = detail.order;
  const [form, setForm] = useState({ orderedBy: ord.orderedby || "", orderDate: ord.orderdate ? new Date(ord.orderdate).toISOString().slice(0, 10) : "", expectedDate: ord.expecteddate ? new Date(ord.expecteddate).toISOString().slice(0, 10) : "", supplierName: ord.suppliername || "", supplierEmail: ord.supplieremail || "", supplierPhone: ord.supplierphone || "", notes: ord.notes || "" });
  const [cart, setCart] = useState<any[]>(detail.items.map((i: any) => ({ itemId: i.itemid, itemName: i.itemname, uom: i.uom, orderedQty: i.orderedqty, unitCost: i.unitcost || "" })));
  const [itemSearch, setItemSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const filtered = allItems; // API now handles filtering
  const addItem = (item: any) => { if (cart.find(c => c.itemId === item.itemid)) return; setCart(c => [...c, { itemId: item.itemid, itemName: item.name, uom: item.uom, orderedQty: 1, unitCost: "" }]); setItemSearch(""); };
  const updateCart = (idx: number, k: string, v: any) => setCart(c => c.map((x, i) => i === idx ? { ...x, [k]: v } : x));

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchItems(itemSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [itemSearch, onSearchItems]);
  const removeCart = (idx: number) => setCart(c => c.filter((_, i) => i !== idx));
  const total = cart.reduce((s, c) => s + (c.orderedQty || 0) * (parseFloat(c.unitCost) || 0), 0);
  const handleSubmit = async () => {
    if (!form.orderedBy.trim()) { setError("Ordered by is required"); return; }
    if (!cart.length) { setError("Add at least one item"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-procurement/orders/${ord.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ edit: true, ...form, items: cart }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      onSuccess(); onClose();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  return (
    <div style={s.overlay}><div style={{ ...s.modal, width: 780 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>✏️ Edit Order — {ord.ordernumber}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon d={icons.x} size={18} color="#6b7280" /></button>
      </div>
      {error && <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={s.fgroup}><label style={s.label}>Ordered By *</label><input style={s.input} value={form.orderedBy} onChange={e => set("orderedBy", e.target.value)} /></div>
        <div style={s.fgroup}><label style={s.label}>Supplier</label><input style={s.input} value={form.supplierName} onChange={e => set("supplierName", e.target.value)} /></div>
        <div style={s.fgroup}><label style={s.label}>Order Date</label><input type="date" style={s.input} value={form.orderDate} onChange={e => set("orderDate", e.target.value)} /></div>
        <div style={s.fgroup}><label style={s.label}>Expected Date</label><input type="date" style={s.input} value={form.expectedDate} onChange={e => set("expectedDate", e.target.value)} /></div>
        <div style={{ gridColumn: "1/-1", ...s.fgroup }}><label style={s.label}>Notes</label><input style={s.input} value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
      </div>
      <div style={{ marginTop: 16, marginBottom: 8 }}>
        <label style={s.label}>Add Items</label>
        <div style={{ position: "relative" }}>
          <input style={{ ...s.input, borderColor: "#6366f1" }} value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Search items..." />
          {itemSearch && filtered.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #6366f1", borderRadius: 8, zIndex: 200, maxHeight: 200, overflowY: "auto" }}>
              {filtered.slice(0, 10).map(item => (
                <div key={item.itemid} onClick={() => addItem(item)} style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f3f4f6" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                  <strong>{item.name}</strong> <span style={{ fontSize: 11, color: "#6b7280" }}>{item.uom}{cart.find(c => c.itemId === item.itemid) ? " ✓" : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {cart.length > 0 && (
        <div style={s.card}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Item", "UOM", "Qty", "Unit Cost", "Total", ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>{cart.map((c, i) => (
              <tr key={i}>
                <td style={s.td}>{c.itemName}</td><td style={s.td}>{c.uom}</td>
                <td style={s.td}><input type="number" min={1} style={{ ...s.input, width: 70 }} value={c.orderedQty} onChange={e => updateCart(i, "orderedQty", parseInt(e.target.value) || 0)} /></td>
                <td style={s.td}><input type="number" step="0.01" style={{ ...s.input, width: 90 }} value={c.unitCost} onChange={e => updateCart(i, "unitCost", e.target.value)} /></td>
                <td style={s.td}>{((c.orderedQty || 0) * (parseFloat(c.unitCost) || 0)).toFixed(2)}</td>
                <td style={s.td}><button onClick={() => removeCart(i)} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon d={icons.trash} size={14} color="#dc2626" /></button></td>
              </tr>
            ))}</tbody>
          </table>
          <div style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 14, borderTop: "1px solid #e5e7eb" }}>Total: {total.toFixed(2)}</div>
        </div>
      )}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
        <button onClick={onClose} style={{ ...s.btn("ghost"), border: "1px solid #e5e7eb" }}>Cancel</button>
        <button onClick={handleSubmit} disabled={loading} style={s.btn("purple")}>{loading ? "Saving..." : "✏️ Save Changes"}</button>
      </div>
    </div></div>
  );
}

/* ── ViewOrderModal ───────────────────────────────────────────────────────── */
function ViewOrderModal({ detail, onClose, onReceive, onEdit }: { detail: any; onClose: () => void; onReceive: () => void; onEdit: () => void }) {
  const ord = detail.order;
  const sc = statusColors[ord.status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <div style={s.overlay}><div style={{ ...s.modal, width: 720 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>📋 Order {ord.ordernumber}</h3>
          <span style={s.badge(sc.bg, sc.color)}>{ord.status}</span>
          {ord.isedited && <span style={s.badge("#dbeafe", "#1d4ed8")}>EDITED</span>}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon d={icons.x} size={18} color="#6b7280" /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {[["Ordered By", ord.orderedby], ["Supplier", ord.suppliername || "—"], ["Order Date", ord.orderdate ? new Date(ord.orderdate).toLocaleDateString() : "—"], ["Expected", ord.expecteddate ? new Date(ord.expecteddate).toLocaleDateString() : "—"], ["Email", ord.supplieremail || "—"], ["Phone", ord.supplierphone || "—"]].map(([l, v]) => (
          <div key={l as string} style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{l}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
          </div>
        ))}
      </div>
      {ord.notes && <div style={{ background: "#f0fdf4", padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>📝 {ord.notes}</div>}
      <div style={s.card}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Item", "UOM", "Qty", "Unit Cost", "Total"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>{detail.items.map((it: any) => (
            <tr key={it.id}>
              <td style={s.td}>{it.itemname}</td><td style={s.td}>{it.uom}</td>
              <td style={s.td}>{it.orderedqty}</td><td style={s.td}>{it.unitcost || "—"}</td>
              <td style={s.td}>{it.totalcost ? parseFloat(it.totalcost).toFixed(2) : "—"}</td>
            </tr>
          ))}</tbody>
        </table>
        <div style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 14, borderTop: "1px solid #e5e7eb" }}>Total: {ord.totalamount ? parseFloat(ord.totalamount).toFixed(2) : "0.00"}</div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
        <button onClick={onClose} style={{ ...s.btn("ghost"), border: "1px solid #e5e7eb" }}>Close</button>
        {(ord.status === "PENDING" || ord.status === "PARTIALLY_DELIVERED") && <button onClick={onEdit} style={s.btn("blue")}>✏️ Edit</button>}
        {(ord.status === "PENDING" || ord.status === "PARTIALLY_DELIVERED") && <button onClick={onReceive} style={s.btn("green")}>📥 Receive This Order</button>}
      </div>
    </div></div>
  );
}

/* ── ReceiveOrderModal ────────────────────────────────────────────────────── */
function ReceiveOrderModal({ detail, onClose, onSuccess, warehouseId }: { detail: any; onClose: () => void; onSuccess: (msg: string) => void; warehouseId: string }) {
  const { workspaceid } = useParams<{ workspaceid: string }>();
  const ord = detail.order;
  const [receivedBy, setReceivedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState(detail.items.map((i: any) => ({ ...i, receivedQty: i.orderedqty || 0, batchNumber: "", lotNumber: "", expiryDate: "", manufactureDate: "", returnClaim: 0, claimNote: "", dnRegNum: "" })));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showExtra, setShowExtra] = useState(false);
  const [showPartial, setShowPartial] = useState(false);

  const updateItem = (idx: number, k: string, v: any) => setItems((its: any[]) => its.map((x: any, i: number) => i === idx ? { ...x, [k]: v } : x));
  const shortItems = items.filter((i: any) => i.receivedQty < (i.orderedqty || 0));
  const extraItems = items.filter((i: any) => i.receivedQty > (i.orderedqty || 0));

  const handleSubmit = async (addAll = true) => {
    if (!receivedBy.trim()) { setError("Received by is required"); return; }
    if (extraItems.length > 0 && !showExtra) { setShowExtra(true); return; }
    setLoading(true);
    try {
      const payload = {
        orderId: ord.id, orderNumber: ord.ordernumber, receivedBy, receiptDate: new Date().toISOString(), supplierName: ord.suppliername, supplierEmail: ord.supplieremail, notes, warehouseId,
        items: items.map((i: any) => ({
          itemId: i.itemid, itemName: i.itemname, uom: i.uom, orderedQty: i.orderedqty || 0,
          receivedQty: addAll ? i.receivedQty : Math.min(i.receivedQty, i.orderedqty || 0),
          unitCost: i.unitcost || 0, batchNumber: i.batchNumber, lotNumber: i.lotNumber,
          expiryDate: i.expiryDate || null, manufactureDate: i.manufactureDate || null,
          returnClaim: i.returnClaim || 0, claimNote: i.claimNote, dnRegNum: i.dnRegNum,
        })),
      };
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-procurement/grn`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const data = await res.json();
      if (shortItems.length > 0) { setShowPartial(true); setShowExtra(false); setLoading(false); return; }
      onSuccess(`Receipt ${data.receiptnumber || ""} created — ${data.status}`);
      onClose();
    } catch (e: any) { setError(e.message); setLoading(false); }
  };

  return (
    <div style={s.overlay}><div style={{ ...s.modal, width: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>📥 Receive Order — {ord.ordernumber}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon d={icons.x} size={18} color="#6b7280" /></button>
      </div>
      {error && <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 8 }}>{error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={{ background: "#f9fafb", borderRadius: 8, padding: 10 }}>
          {[["Order #", ord.ordernumber], ["Ordered By", ord.orderedby], ["Date", ord.orderdate ? new Date(ord.orderdate).toLocaleDateString() : "—"]].map(([l, v]) => <div key={l as string} style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: "#6b7280" }}>{l}:</span> <strong>{v}</strong></div>)}
        </div>
        <div style={{ background: "#f0fdf4", borderRadius: 8, padding: 10 }}>
          {[["Supplier", ord.suppliername || "—"], ["Email", ord.supplieremail || "—"], ["Phone", ord.supplierphone || "—"]].map(([l, v]) => <div key={l as string} style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: "#6b7280" }}>{l}:</span> <strong>{v}</strong></div>)}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={s.fgroup}><label style={s.label}>Received By *</label><input style={s.input} value={receivedBy} onChange={e => setReceivedBy(e.target.value)} /></div>
        <div style={s.fgroup}><label style={s.label}>Notes</label><input style={s.input} value={notes} onChange={e => setNotes(e.target.value)} /></div>
      </div>
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, display: "flex", gap: 16 }}>
        <span>⬜ Match</span><span style={{ color: "#d97706" }}>🟠 Short</span><span style={{ color: "#16a34a" }}>🟢 Extra</span>
      </div>
      <div style={{ ...s.card, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Item", "Unit", "Ordered", "Reg#", "Received", "Diff", "Return", "Claim Note"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>{items.map((it: any, idx: number) => {
            const diff = it.receivedQty - (it.orderedqty || 0);
            const rowBg = diff < 0 ? "#fff7ed" : diff > 0 ? "#f0fdf4" : "#fff";
            return (
              <tr key={idx} style={{ background: rowBg }}>
                <td style={s.td}>{it.itemname}</td>
                <td style={s.td}>{it.uom}</td>
                <td style={s.td}>{it.orderedqty}</td>
                <td style={s.td}><input style={{ ...s.input, width: 80 }} value={it.dnRegNum} onChange={e => updateItem(idx, "dnRegNum", e.target.value)} /></td>
                <td style={s.td}><input type="number" min={0} style={{ ...s.input, width: 70, borderColor: diff < 0 ? "#d97706" : diff > 0 ? "#16a34a" : "#d1d5db" }} value={it.receivedQty} onChange={e => updateItem(idx, "receivedQty", parseInt(e.target.value) || 0)} /></td>
                <td style={s.td}><span style={{ ...s.badge(diff < 0 ? "#fed7aa" : diff > 0 ? "#d1fae5" : "#f3f4f6", diff < 0 ? "#92400e" : diff > 0 ? "#065f46" : "#374151") }}>{diff > 0 ? "+" : ""}{diff}</span></td>
                <td style={s.td}><input type="number" min={0} style={{ ...s.input, width: 60 }} value={it.returnClaim} onChange={e => updateItem(idx, "returnClaim", parseInt(e.target.value) || 0)} /></td>
                <td style={s.td}><input style={{ ...s.input, width: 100 }} value={it.claimNote} onChange={e => updateItem(idx, "claimNote", e.target.value)} /></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      {shortItems.length > 0 && <div style={{ background: "#fff7ed", borderRadius: 8, padding: "8px 12px", fontSize: 12, marginTop: 8, color: "#92400e" }}>⚠️ {shortItems.length} item(s) short</div>}
      {extraItems.length > 0 && <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "8px 12px", fontSize: 12, marginTop: 8, color: "#065f46" }}>⚡ {extraItems.length} item(s) extra</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
        <span style={{ fontSize: 12, color: "#6b7280", marginRight: "auto" }}>{items.length} items · Received by: {receivedBy || "—"}</span>
        <button onClick={onClose} style={{ ...s.btn("ghost"), border: "1px solid #e5e7eb" }}>Cancel</button>
        <button onClick={() => handleSubmit(true)} disabled={loading} style={s.btn("green")}>{loading ? "Processing..." : "✓ Confirm Receipt"}</button>
      </div>

      {/* Extra quantity sub-overlay */}
      {showExtra && (
        <div style={{ ...s.overlay, background: "rgba(0,0,0,0.3)" }}><div style={{ ...s.modal, width: 500 }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>⚡ Extra Quantities Detected</h4>
          {extraItems.map((it: any, i: number) => <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>{it.itemname}: ordered {it.orderedqty}, received {it.receivedQty} (+{it.receivedQty - it.orderedqty})</div>)}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <button onClick={() => { handleSubmit(false); setShowExtra(false); }} style={s.btn("orange")}>Only add ordered qty</button>
            <button onClick={() => { setShowExtra(false); handleSubmit(true); }} style={s.btn("green")}>✓ Add all to stock</button>
          </div>
        </div></div>
      )}

      {/* Partial delivery sub-overlay */}
      {showPartial && (
        <div style={{ ...s.overlay, background: "rgba(0,0,0,0.3)" }}><div style={{ ...s.modal, width: 500 }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>⚠️ Partial Delivery</h4>
          {shortItems.map((it: any, i: number) => <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>{it.itemname}: ordered {it.orderedqty}, received {it.receivedQty} (missing {it.orderedqty - it.receivedQty})</div>)}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <button onClick={() => { setShowPartial(false); onSuccess("Receipt created (partial delivery)"); onClose(); }} style={{ ...s.btn("ghost"), border: "1px solid #e5e7eb" }}>Close</button>
            {ord.supplieremail && <button onClick={() => { window.open(`mailto:${ord.supplieremail}?subject=Partial Delivery - ${ord.ordernumber}&body=Dear Supplier,%0A%0AOrder ${ord.ordernumber} was partially delivered. Missing items:%0A${shortItems.map((it: any) => `- ${it.itemname}: ${it.orderedqty - it.receivedQty} missing`).join("%0A")}%0A%0APlease advise.`); }} style={s.btn("blue")}>✉️ Email Supplier</button>}
          </div>
        </div></div>
      )}
    </div></div>
  );
}

/* ── ViewGRModal ──────────────────────────────────────────────────────────── */
function ViewGRModal({ detail, onClose }: { detail: any; onClose: () => void }) {
  const r = detail.receipt;
  const sc = statusColors[r.status] || { bg: "#f3f4f6", color: "#374151" };
  const [showNote, setShowNote] = useState(false);
  return (
    <div style={s.overlay}><div style={{ ...s.modal, width: 750 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>📥 Receipt {r.receiptnumber}</h3>
          <span style={s.badge(sc.bg, sc.color)}>{r.status}</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon d={icons.x} size={18} color="#6b7280" /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {[["Receipt #", r.receiptnumber], ["Order #", r.ordernumber || "Standalone"], ["Delivery Note", r.deliverynotenumber || "—"], ["Received By", r.receivedby], ["Date", r.receiptdate ? new Date(r.receiptdate).toLocaleDateString() : "—"], ["Supplier", r.suppliername || "—"]].map(([l, v]) => (
          <div key={l as string} style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{l}</div><div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
          </div>
        ))}
      </div>
      <button onClick={() => setShowNote(!showNote)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontSize: 12, cursor: "pointer", marginBottom: showNote ? 12 : 0, color: "#374151" }}>
        {showNote ? "📝 Hide Note" : "📝 Show Note"}
      </button>
      {showNote && (
        <div style={{ background: r.notes ? "#f0fdf4" : "#f3f4f6", padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          📝 {r.notes || "No notes for this receipt"}
        </div>
      )}
      <div style={s.card}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Item", "UOM", "Ordered", "Received", "Diff", "Batch", "Expiry"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>{detail.items.map((it: any) => {
            const diff = (it.receivedqty || 0) - (it.orderedqty || 0);
            return (
              <tr key={it.id}>
                <td style={s.td}>{it.itemname}</td><td style={s.td}>{it.uom}</td>
                <td style={s.td}>{it.orderedqty || "—"}</td><td style={s.td}>{it.receivedqty}</td>
                <td style={s.td}>{it.orderedqty ? <span style={s.badge(diff < 0 ? "#fed7aa" : diff > 0 ? "#d1fae5" : "#f3f4f6", diff < 0 ? "#92400e" : diff > 0 ? "#065f46" : "#374151")}>{diff > 0 ? "+" : ""}{diff}</span> : "—"}</td>
                <td style={s.td}>{it.batchnumber || it.batch_number || "—"}</td>
                <td style={s.td}>{it.expirydate || it.expiry_date ? new Date(it.expirydate || it.expiry_date).toLocaleDateString() : "—"}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      {detail.claims?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>⚠️ Claims / Damages</div>
          {detail.claims.map((c: any) => <div key={c.id} style={{ fontSize: 12, padding: "4px 0" }}>{c.itemname}: {c.quantity} — {c.note || "No note"}</div>)}
        </div>
      )}
      {r.status === "PARTIAL" && r.supplieremail && (
        <div style={{ background: "#fff7ed", borderRadius: 8, padding: "8px 12px", marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#92400e" }}>⚠️ Partial delivery — some items short</span>
          <button onClick={() => window.open(`mailto:${r.supplieremail}?subject=Partial Delivery - ${r.receiptnumber}`)} style={s.btn("orange")}>✉️ Email Supplier</button>
        </div>
      )}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
        <button onClick={onClose} style={{ ...s.btn("ghost"), border: "1px solid #e5e7eb" }}>Close</button>
      </div>
    </div></div>
  );
}

/* ── NewGoodsReceiptModal ─────────────────────────────────────────────────── */
function NewGoodsReceiptModal({ orders, suppliers, allItems, onClose, onSuccess, warehouseId }: { orders: any[]; suppliers: any[]; allItems: any[]; onClose: () => void; onSuccess: (msg: string) => void; warehouseId: string }) {
  const { workspaceid } = useParams<{ workspaceid: string }>();
  const pendingOrders = orders.filter(o => o.status === "PENDING" || o.status === "PARTIALLY_DELIVERED");
  const [mode, setMode] = useState<"select" | "order" | "standalone">("select");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [orderSearch, setOrderSearch] = useState("");
  // Standalone
  const [receivedBy, setReceivedBy] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [standaloneNotes, setStandaloneNotes] = useState("");
  const [standaloneItems, setStandaloneItems] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadOrder = async (order: any) => {
    setSelectedOrder(order);
    try {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-procurement/orders/${order.id}`);
      const data = await res.json();
      setOrderDetail(data);
      setMode("order");
    } catch { setError("Failed to load order"); }
  };

  const filteredOrders = pendingOrders.filter(o => !orderSearch || o.ordernumber?.toLowerCase().includes(orderSearch.toLowerCase()) || o.suppliername?.toLowerCase().includes(orderSearch.toLowerCase()));
  const filteredItems = allItems.filter(i => !itemSearch || i.name?.toLowerCase().includes(itemSearch.toLowerCase()));
  const addStandaloneItem = (item: any) => { if (standaloneItems.find(c => c.itemId === item.id)) return; setStandaloneItems(c => [...c, { itemId: item.id, itemName: item.name, uom: item.uom, receivedQty: 1, returnClaim: 0, claimNote: "", dnRegNum: "", batchNumber: "", expiryDate: "" }]); setItemSearch(""); };
  const updateStandalone = (idx: number, k: string, v: any) => setStandaloneItems(its => its.map((x, i) => i === idx ? { ...x, [k]: v } : x));
  const removeStandalone = (idx: number) => setStandaloneItems(its => its.filter((_, i) => i !== idx));

  const handleStandaloneSubmit = async () => {
    if (!receivedBy.trim()) { setError("Received by is required"); return; }
    if (!standaloneItems.length) { setError("Add at least one item"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-procurement/grn`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receivedBy, receiptDate: new Date().toISOString(), supplierName, notes: standaloneNotes, warehouseId, items: standaloneItems.map(i => ({ ...i, orderedQty: 0, unitCost: 0 })) }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const data = await res.json();
      onSuccess(`Standalone receipt ${data.receiptnumber || ""} created`);
      onClose();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div style={s.overlay}><div style={{ ...s.modal, width: mode === "select" ? 600 : 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>
          {mode === "select" && "📥 New Goods Receipt"}
          {mode === "order" && `📥 Receive — ${selectedOrder?.ordernumber}`}
          {mode === "standalone" && "📦 Standalone Receipt"}
        </h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon d={icons.x} size={18} color="#6b7280" /></button>
      </div>
      {error && <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 8 }}>{error}</div>}

      {mode === "select" && (
        <div>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Choose how to create the receipt:</p>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setMode("order" as any)} style={{ flex: 1, padding: 20, borderRadius: 10, border: "2px solid #6366f1", background: "#f0f0ff", cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Against a Purchase Order</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{pendingOrders.length} pending orders</div>
            </button>
            <button onClick={() => setMode("standalone")} style={{ flex: 1, padding: 20, borderRadius: 10, border: "2px solid #e5e7eb", background: "#f9fafb", cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Standalone (no order)</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Direct receipt without PO</div>
            </button>
          </div>
        </div>
      )}

      {mode === "order" && !orderDetail && (
        <div>
          <button onClick={() => { setMode("select"); setSelectedOrder(null); }} style={{ ...s.btn("ghost"), border: "1px solid #e5e7eb", marginBottom: 12 }}>← Back</button>
          <input style={{ ...s.input, marginBottom: 12 }} value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Search orders..." />
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {filteredOrders.length === 0 && <div style={{ textAlign: "center", padding: 20, color: "#6b7280" }}>No pending orders</div>}
            {filteredOrders.map(o => {
              const sc = statusColors[o.status] || { bg: "#f3f4f6", color: "#374151" };
              return (
                <div key={o.id} onClick={() => loadOrder(o)} style={{ padding: "12px 16px", borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#6366f1")} onMouseLeave={e => (e.currentTarget.style.borderColor = "#e5e7eb")}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{o.ordernumber} <span style={s.badge(sc.bg, sc.color)}>{o.status}</span></div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{o.suppliername || "—"} · {o.item_count} items · {o.orderdate ? new Date(o.orderdate).toLocaleDateString() : "—"}</div>
                  </div>
                  <Icon d={icons.eye} size={16} color="#6366f1" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === "order" && orderDetail && (
        <ReceiveOrderModal detail={orderDetail} onClose={onClose} onSuccess={onSuccess} warehouseId={warehouseId} />
      )}

      {mode === "standalone" && (
        <div>
          <button onClick={() => setMode("select")} style={{ ...s.btn("ghost"), border: "1px solid #e5e7eb", marginBottom: 12 }}>← Back</button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div style={s.fgroup}><label style={s.label}>Received By *</label><input style={s.input} value={receivedBy} onChange={e => setReceivedBy(e.target.value)} /></div>
            <div style={s.fgroup}><label style={s.label}>Supplier</label>
              <select style={s.input} value={supplierName} onChange={e => setSupplierName(e.target.value)}>
                <option value="">Select supplier</option>
                {suppliers.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1/-1", ...s.fgroup }}><label style={s.label}>Notes</label><input style={s.input} value={standaloneNotes} onChange={e => setStandaloneNotes(e.target.value)} /></div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={s.label}>Search Items</label>
            <div style={{ position: "relative" }}>
              <input style={{ ...s.input, borderColor: "#6366f1" }} value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Search items..." />
              {itemSearch && filteredItems.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #6366f1", borderRadius: 8, zIndex: 200, maxHeight: 200, overflowY: "auto" }}>
                  {filteredItems.slice(0, 10).map(item => (
                    <div key={item.id} onClick={() => addStandaloneItem(item)} style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f3f4f6" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                      <strong>{item.name}</strong> <span style={{ fontSize: 11, color: "#6b7280" }}>{item.uom}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {standaloneItems.length > 0 && (
            <div style={s.card}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Item", "Unit", "Qty", "Return", "Note", ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>{standaloneItems.map((it, idx) => (
                  <tr key={idx}>
                    <td style={s.td}>{it.itemName}</td><td style={s.td}>{it.uom}</td>
                    <td style={s.td}><input type="number" min={1} style={{ ...s.input, width: 70 }} value={it.receivedQty} onChange={e => updateStandalone(idx, "receivedQty", parseInt(e.target.value) || 0)} /></td>
                    <td style={s.td}><input type="number" min={0} style={{ ...s.input, width: 60 }} value={it.returnClaim} onChange={e => updateStandalone(idx, "returnClaim", parseInt(e.target.value) || 0)} /></td>
                    <td style={s.td}><input style={{ ...s.input, width: 100 }} value={it.claimNote} onChange={e => updateStandalone(idx, "claimNote", e.target.value)} /></td>
                    <td style={s.td}><button onClick={() => removeStandalone(idx)} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon d={icons.trash} size={14} color="#dc2626" /></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
            <button onClick={onClose} style={{ ...s.btn("ghost"), border: "1px solid #e5e7eb" }}>Cancel</button>
            <button onClick={handleStandaloneSubmit} disabled={loading} style={s.btn("green")}>{loading ? "Processing..." : "✓ Confirm Receipt"}</button>
          </div>
        </div>
      )}
    </div></div>
  );
}

/* ── CorrectionModal ──────────────────────────────────────────────────────── */
function CorrectionModal({ onClose, onSuccess, warehouseId }: { onClose: () => void; onSuccess: (msg: string) => void; warehouseId: string }) {
  const { workspaceid } = useParams<{ workspaceid: string }>();
  const [phase, setPhase] = useState<"search" | "form">("search");
  const [searchQ, setSearchQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [receiptDetail, setReceiptDetail] = useState<any>(null);
  const [corrItems, setCorrItems] = useState<any[]>([]);
  const [correctedBy, setCorrectedBy] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQ) params.set("q", searchQ);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-procurement/grn/correction?${params}`);
      setResults(await res.json());
    } catch { setError("Search failed"); }
  };

  const selectReceipt = async (r: any) => {
    setSelectedReceipt(r);
    try {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-procurement/grn/${r.id}`);
      const data = await res.json();
      setReceiptDetail(data);
      setCorrItems(data.items.map((i: any) => ({ itemId: i.itemid, itemName: i.itemname, uom: i.uom, originalQty: i.receivedqty || 0, correctedQty: i.receivedqty || 0, itemNote: "" })));
      setPhase("form");
    } catch { setError("Failed to load receipt"); }
  };

  const handleSubmit = async () => {
    if (!correctedBy.trim()) { setError("Corrected by is required"); return; }
    if (!reason.trim()) { setError("Reason is required"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-procurement/grn/correction`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalReceiptId: selectedReceipt.id, correctedBy, reason, items: corrItems, warehouseId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const data = await res.json();
      onSuccess(`Correction done: ${data.reversalNumber} / ${data.correctionNumber}`);
      onClose();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div style={s.overlay}><div style={{ ...s.modal, width: 750 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>🔧 GRN Correction</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon d={icons.x} size={18} color="#6b7280" /></button>
      </div>
      {error && <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 8 }}>{error}</div>}

      {phase === "search" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, marginBottom: 12 }}>
            <input style={s.input} value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search receipt/order/supplier..." />
            <input type="date" style={s.input} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <input type="date" style={s.input} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            <button onClick={handleSearch} style={s.btn("purple")}>🔍 Search</button>
          </div>
          {results.length > 0 && (
            <div style={s.card}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Receipt #", "Order #", "Supplier", "Date", "Items", "Status", ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>{results.map(r => (
                  <tr key={r.id}>
                    <td style={s.td}>{r.receiptnumber}</td><td style={s.td}>{r.ordernumber || "—"}</td>
                    <td style={s.td}>{r.suppliername || "—"}</td>
                    <td style={s.td}>{r.receiptdate ? new Date(r.receiptdate).toLocaleDateString() : "—"}</td>
                    <td style={s.td}>{r.item_count}</td>
                    <td style={s.td}><span style={s.badge(statusColors[r.status]?.bg || "#f3f4f6", statusColors[r.status]?.color || "#374151")}>{r.status}</span></td>
                    <td style={s.td}><button onClick={() => selectReceipt(r)} style={s.btn("purple")}>Select</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {phase === "form" && (
        <div>
          <button onClick={() => setPhase("search")} style={{ ...s.btn("ghost"), border: "1px solid #e5e7eb", marginBottom: 12 }}>← Back to search</button>
          <div style={{ background: "#f9fafb", borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 13 }}>
            <strong>{selectedReceipt.receiptnumber}</strong> · {selectedReceipt.suppliername || "—"} · {selectedReceipt.receiptdate ? new Date(selectedReceipt.receiptdate).toLocaleDateString() : "—"}
          </div>
          <div style={s.card}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Item", "UOM", "Original Qty", "Corrected Qty", "Net Diff", "Note"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>{corrItems.map((it, idx) => {
                const diff = it.correctedQty - it.originalQty;
                return (
                  <tr key={idx}>
                    <td style={s.td}>{it.itemName}</td><td style={s.td}>{it.uom}</td>
                    <td style={s.td}>{it.originalQty}</td>
                    <td style={s.td}><input type="number" min={0} style={{ ...s.input, width: 70 }} value={it.correctedQty} onChange={e => setCorrItems(its => its.map((x, i) => i === idx ? { ...x, correctedQty: parseInt(e.target.value) || 0 } : x))} /></td>
                    <td style={s.td}><span style={s.badge(diff < 0 ? "#fee2e2" : diff > 0 ? "#d1fae5" : "#f3f4f6", diff < 0 ? "#991b1b" : diff > 0 ? "#065f46" : "#374151")}>{diff > 0 ? "+" : ""}{diff}</span></td>
                    <td style={s.td}><input style={{ ...s.input, width: 120 }} value={it.itemNote} onChange={e => setCorrItems(its => its.map((x, i) => i === idx ? { ...x, itemNote: e.target.value } : x))} /></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div style={s.fgroup}><label style={s.label}>Corrected By *</label><input style={s.input} value={correctedBy} onChange={e => setCorrectedBy(e.target.value)} /></div>
            <div style={s.fgroup}><label style={s.label}>Reason *</label><input style={s.input} value={reason} onChange={e => setReason(e.target.value)} /></div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
            <button onClick={onClose} style={{ ...s.btn("ghost"), border: "1px solid #e5e7eb" }}>Cancel</button>
            <button onClick={handleSubmit} disabled={loading} style={s.btn("purple")}>{loading ? "Processing..." : "Submit Correction"}</button>
          </div>
        </div>
      )}
    </div></div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════════════════ */
export default function PharmacyProcurementPage() {
  const { workspaceid } = useParams<{ workspaceid: string }>();

  // Tab
  const [tab, setTab] = useState<"orders" | "gr" | "correction">("orders");

  // Data
  const [orders, setOrders] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouseId, setWarehouseId] = useState("");

  // Filters
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [grStatusFilter, setGrStatusFilter] = useState("");
  const [grSearch, setGrSearch] = useState("");

  // Pagination
  const [orderPage, setOrderPage] = useState(1);
  const [grPage, setGrPage] = useState(1);

  // Modals
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showNewGR, setShowNewGR] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [viewOrderId, setViewOrderId] = useState<string | null>(null);
  const [viewOrderDetail, setViewOrderDetail] = useState<any>(null);
  const [editOrderData, setEditOrderData] = useState<any>(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [viewGRId, setViewGRId] = useState<string | null>(null);
  const [viewGRDetail, setViewGRDetail] = useState<any>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Toast
  const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  // Navigation dropdowns
  const [procurementOpen, setProcurementOpen] = useState(false);
  const [partnersOpen, setPartnersOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  // Data fetching
  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (orderStatusFilter) params.set("status", orderStatusFilter);
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-procurement/orders?${params}`);
      setOrders(await res.json());
    } catch { }
  }, [workspaceid, orderStatusFilter]);

  const fetchReceipts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (grStatusFilter) params.set("status", grStatusFilter);
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-procurement/grn?${params}`);
      setReceipts(await res.json());
    } catch { }
  }, [workspaceid, grStatusFilter]);

  const fetchItems = useCallback(async (search = "") => {
    try {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-procurement/items?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setAllItems(Array.isArray(data) ? data : []);
    } catch { }
  }, [workspaceid]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-inventory/vendors?active=active`);
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch { }
  }, [workspaceid]);

  useEffect(() => { fetchItems(); fetchSuppliers(); }, [fetchItems, fetchSuppliers]);
  useEffect(() => { if (tab === "orders") fetchOrders(); }, [tab, orderStatusFilter, fetchOrders]);
  useEffect(() => { if (tab === "gr") fetchReceipts(); }, [tab, grStatusFilter, fetchReceipts]);
  useEffect(() => { setOrderPage(1); }, [orderStatusFilter, orderSearch]);
  useEffect(() => { setGrPage(1); }, [grStatusFilter, grSearch]);

  // Fetch warehouse ID (pharmacy warehouse)
  useEffect(() => {
    fetch('/api/warehouses').then(r => r.json()).then(data => {
      if (Array.isArray(data) && data.length > 0) {
        // Find first pharmacy warehouse
        const pharmacyWarehouse = data.find(w => w.warehousetype === 'pharmacy');
        if (pharmacyWarehouse) {
          setWarehouseId(pharmacyWarehouse.id);
        } else {
          // Fallback to first warehouse if no pharmacy warehouse exists
          setWarehouseId(data[0].id);
        }
      }
    }).catch(() => console.error('Failed to fetch warehouse'));
  }, [workspaceid]);

  // Check for cart data from Shop List and auto-open Create Order modal
  useEffect(() => {
    const cartDataStr = sessionStorage.getItem('pharmacyCartData');
    if (cartDataStr) {
      try {
        const cartData = JSON.parse(cartDataStr);
        if (cartData.items && cartData.items.length > 0) {
          // Store cart data for CreateOrderModal to use
          sessionStorage.setItem('pharmacyCartData_temp', cartDataStr);
          // Auto-open Create Order modal
          setShowCreateOrder(true);
          // Clear the original key so it doesn't trigger again
          sessionStorage.removeItem('pharmacyCartData');
        }
      } catch (e) {
        console.error('Failed to parse cart data:', e);
        sessionStorage.removeItem('pharmacyCartData');
      }
    }
  }, []);

  // View order detail
  const loadOrderDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-procurement/orders/${id}`);
      const data = await res.json();
      setViewOrderDetail(data);
      setViewOrderId(id);
    } catch { }
  };

  // View GR detail
  const loadGRDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-procurement/grn/${id}`);
      const data = await res.json();
      setViewGRDetail(data);
      setViewGRId(id);
    } catch { }
  };

  // Cancel order
  const handleCancelOrder = async () => {
    if (!cancelOrderId) return;
    await fetch(`/api/d/${workspaceid}/pharmacy-procurement/orders/${cancelOrderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "CANCELLED", reason: cancelReason }) });
    setCancelOrderId(null); setCancelReason(""); fetchOrders(); showToast("Order cancelled");
  };

  // Filter data
  const filteredOrders = orders.filter(o => !orderSearch || o.ordernumber?.toLowerCase().includes(orderSearch.toLowerCase()) || o.suppliername?.toLowerCase().includes(orderSearch.toLowerCase()) || o.orderedby?.toLowerCase().includes(orderSearch.toLowerCase()));
  const pagedOrders = filteredOrders.slice((orderPage - 1) * PG, orderPage * PG);

  const filteredReceipts = receipts.filter(r => !grSearch || r.receiptnumber?.toLowerCase().includes(grSearch.toLowerCase()) || r.ordernumber?.toLowerCase().includes(grSearch.toLowerCase()) || r.suppliername?.toLowerCase().includes(grSearch.toLowerCase()) || r.receivedby?.toLowerCase().includes(grSearch.toLowerCase()));
  const pagedReceipts = filteredReceipts.slice((grPage - 1) * PG, grPage * PG);

  return (
    <div style={s.page}>
      {/* Toast */}
      {toast && <div style={{ position: "fixed", top: 16, right: 16, background: "#16a34a", color: "#fff", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>{toast}</div>}

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 24px",background:"#ffffff",borderBottom:"1px solid #e5e7eb",position:"sticky",top:0,zIndex:10}}>
        <span style={{fontSize:24,fontWeight:700,color:"#111827"}}>
          {tab === "orders" ? "Purchase Orders" :
           tab === "gr" ? "Goods Receipt" :
           tab === "correction" ? "Correction" : "Pharmacy Procurement"}
        </span>
      </div>

      {/* Pharmacy Navigation */}
      <PharmacyNav workspaceid={workspaceid} activeTab="inventory" />

      <div style={s.content}>
        <div style={{padding: "24px", maxWidth: "1400px", margin: "0px auto"}}>
      {/* Unified Navigation Bar */}
      <div style={{display:"flex",gap:4,marginBottom:16,background:"#f9fafb",flexWrap:"wrap",borderRadius:8,padding:4,marginTop:16,alignItems:"center"}}>
        {/* Standalone Tabs */}
        <Link href={`/d/${workspaceid}/pharmacy-inventory`} style={{padding:"10px 18px",fontSize:13,fontWeight:700,border:"1px solid #e5e7eb",background:"transparent",cursor:"pointer",color:"#6b7280",borderRadius:6,margin:"4px 2px",textDecoration:"none",display:"block"}}>Items</Link>
        <Link href={`/d/${workspaceid}/pharmacy-inventory`} style={{padding:"10px 18px",fontSize:13,fontWeight:700,border:"1px solid #e5e7eb",background:"transparent",cursor:"pointer",color:"#6b7280",borderRadius:6,margin:"4px 2px",textDecoration:"none",display:"block"}}>Shop List</Link>
        <Link href={`/d/${workspaceid}/pharmacy-inventory`} style={{padding:"10px 18px",fontSize:13,fontWeight:700,border:"1px solid #e5e7eb",background:"transparent",cursor:"pointer",color:"#6b7280",borderRadius:6,margin:"4px 2px",textDecoration:"none",display:"block"}}>Reports</Link>

        {/* Procurement Dropdown */}
        <DropdownMenu 
          label="Procurement" 
          isOpen={procurementOpen} 
          onToggle={()=>setProcurementOpen(!procurementOpen)} 
          onClose={()=>setProcurementOpen(false)}
        >
          <Link href={`/d/${workspaceid}/pharmacy-inventory/procurement`} style={{display:"block",padding:"8px 12px",fontSize:13,color:"#374151",textDecoration:"none",borderRadius:4,cursor:"pointer"}} onClick={()=>setProcurementOpen(false)}>Create Order</Link>
          <Link href={`/d/${workspaceid}/pharmacy-inventory/procurement`} style={{display:"block",padding:"8px 12px",fontSize:13,color:"#374151",textDecoration:"none",borderRadius:4,cursor:"pointer"}} onClick={()=>setProcurementOpen(false)}>Goods Receipt</Link>
          <Link href={`/d/${workspaceid}/pharmacy-inventory/procurement/claims`} style={{display:"block",padding:"8px 12px",fontSize:13,color:"#374151",textDecoration:"none",borderRadius:4,cursor:"pointer"}} onClick={()=>setProcurementOpen(false)}>Claims</Link>
          <Link href={`/d/${workspaceid}/pharmacy-inventory/procurement/returns`} style={{display:"block",padding:"8px 12px",fontSize:13,color:"#374151",textDecoration:"none",borderRadius:4,cursor:"pointer"}} onClick={()=>setProcurementOpen(false)}>Returns</Link>
        </DropdownMenu>

        {/* Partners Dropdown */}
        <DropdownMenu 
          label="Partners" 
          isOpen={partnersOpen} 
          onToggle={()=>setPartnersOpen(!partnersOpen)} 
          onClose={()=>setPartnersOpen(false)}
        >
          <Link href={`/d/${workspaceid}/pharmacy-inventory`} style={{display:"block",padding:"8px 12px",fontSize:13,color:"#374151",textDecoration:"none",borderRadius:4,cursor:"pointer"}} onClick={()=>setPartnersOpen(false)}>Suppliers</Link>
          <Link href={`/d/${workspaceid}/pharmacy-inventory`} style={{display:"block",padding:"8px 12px",fontSize:13,color:"#374151",textDecoration:"none",borderRadius:4,cursor:"pointer"}} onClick={()=>setPartnersOpen(false)}>Manufacturers</Link>
          <Link href={`/d/${workspaceid}/pharmacy-inventory/vendors`} style={{display:"block",padding:"8px 12px",fontSize:13,color:"#374151",textDecoration:"none",borderRadius:4,cursor:"pointer"}} onClick={()=>setPartnersOpen(false)}>Vendors</Link>
        </DropdownMenu>

        {/* Inventory Dropdown */}
        <DropdownMenu 
          label="Inventory" 
          isOpen={inventoryOpen} 
          onToggle={()=>setInventoryOpen(!inventoryOpen)} 
          onClose={()=>setInventoryOpen(false)}
        >
          <Link href={`/d/${workspaceid}/pharmacy-inventory`} style={{display:"block",padding:"8px 12px",fontSize:13,color:"#374151",textDecoration:"none",borderRadius:4,cursor:"pointer"}} onClick={()=>setInventoryOpen(false)}>Stock</Link>
          <Link href={`/d/${workspaceid}/pharmacy-inventory`} style={{display:"block",padding:"8px 12px",fontSize:13,color:"#374151",textDecoration:"none",borderRadius:4,cursor:"pointer"}} onClick={()=>setInventoryOpen(false)}>History</Link>
          <Link href={`/d/${workspaceid}/pharmacy-inventory`} style={{display:"block",padding:"8px 12px",fontSize:13,color:"#374151",textDecoration:"none",borderRadius:4,cursor:"pointer"}} onClick={()=>setInventoryOpen(false)}>Storage</Link>
          <Link href={`/d/${workspaceid}/pharmacy-inventory`} style={{display:"block",padding:"8px 12px",fontSize:13,color:"#374151",textDecoration:"none",borderRadius:4,cursor:"pointer"}} onClick={()=>setInventoryOpen(false)}>Unit of Measure</Link>
        </DropdownMenu>

        {/* Action Buttons */}
        <button onClick={()=>{fetchOrders(); fetchReceipts();}} style={{padding:"8px 16px",fontSize:13,fontWeight:600,border:"1px solid #e5e7eb",background:"#ffffff",cursor:"pointer",color:"#374151",borderRadius:6,margin:"4px 2px"}}>Refresh</button>
        <button onClick={()=>setShowCreateOrder(true)} style={{padding:"8px 16px",fontSize:13,fontWeight:600,border:"none",background:"#2563eb",cursor:"pointer",color:"#ffffff",borderRadius:6,margin:"4px 2px"}}>Add Medicine</button>
      </div>
        {/* Tabs */}
        <div style={s.tabs}>
          {(["orders", "gr", "correction"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={s.tab(tab === t)}>
              {t === "orders" ? "📋 Purchase Orders" : t === "gr" ? "📥 Goods Receipt" : "🔧 Correction"}
            </button>
          ))}
        </div>

        {/* ═══ ORDERS TAB ═══ */}
        {tab === "orders" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
              {["", "PENDING", "PARTIALLY_DELIVERED", "DELIVERED", "CANCELLED"].map(st => (
                <button key={st} onClick={() => setOrderStatusFilter(st)} style={{ ...s.btn(orderStatusFilter === st ? "purple" : "ghost"), border: orderStatusFilter === st ? "none" : "1px solid #e5e7eb", fontSize: 11 }}>
                  {st === "PARTIALLY_DELIVERED" ? "Partial" : (st || "ALL")}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <input style={{ ...s.input, width: 200 }} value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Search orders..." />
              <button onClick={fetchOrders} style={{ ...s.btn("ghost"), border: "1px solid #e5e7eb" }}><Icon d={icons.refresh} size={14} /></button>
              <button onClick={() => setShowCreateOrder(true)} style={s.btn("purple")}>+ Create Order</button>
            </div>
            <div style={s.card}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Order #", "Ordered By", "Supplier", "Items", "Total", "Order Date", "Expected", "Status", "Actions"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {pagedOrders.length === 0 && <tr><td colSpan={9} style={{ ...s.td, textAlign: "center", color: "#6b7280", padding: 30 }}>No orders found</td></tr>}
                  {pagedOrders.map(o => {
                    const sc = statusColors[o.status] || { bg: "#f3f4f6", color: "#374151" };
                    return (
                      <tr key={o.id}>
                        <td style={s.td}><strong>{o.ordernumber}</strong></td>
                        <td style={s.td}>{o.orderedby}</td>
                        <td style={s.td}>{o.suppliername || "—"}</td>
                        <td style={s.td}>{o.item_count}</td>
                        <td style={s.td}>{o.totalamount ? parseFloat(o.totalamount).toFixed(2) : "0.00"}</td>
                        <td style={s.td}>{o.orderdate ? new Date(o.orderdate).toLocaleDateString() : "—"}</td>
                        <td style={s.td}>{o.expecteddate ? new Date(o.expecteddate).toLocaleDateString() : "—"}</td>
                        <td style={s.td}>
                          <span style={s.badge(sc.bg, sc.color)}>{o.status === "PARTIALLY_DELIVERED" ? "Partial" : o.status}</span>
                          {o.isedited && <span style={{ ...s.badge("#dbeafe", "#1d4ed8"), marginLeft: 4 }}>EDITED</span>}
                        </td>
                        <td style={s.td}>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={() => loadOrderDetail(o.id)} title="View" style={{ background: "none", border: "none", cursor: "pointer" }}><Icon d={icons.eye} size={15} color="#6366f1" /></button>
                            {(o.status === "PENDING" || o.status === "PARTIALLY_DELIVERED") && (
                              <>
                                <button onClick={async () => { const res = await fetch(`/api/d/${workspaceid}/pharmacy-procurement/orders/${o.id}`); setEditOrderData(await res.json()); }} title="Edit" style={{ background: "none", border: "none", cursor: "pointer" }}><Icon d={icons.edit} size={15} color="#2563eb" /></button>
                                <button onClick={() => setCancelOrderId(o.id)} title="Cancel" style={{ background: "none", border: "none", cursor: "pointer" }}><Icon d={icons.x} size={15} color="#dc2626" /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Pagination page={orderPage} total={filteredOrders.length} onPage={setOrderPage} />
            </div>
          </div>
        )}

        {/* ═══ GOODS RECEIPT TAB ═══ */}
        {tab === "gr" && (
          <div>
            <div style={{ background: "#eff6ff", borderRadius: 10, padding: "12px 16px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#1d4ed8" }}>📥 Goods Receipt Notes — track deliveries against purchase orders or standalone receipts</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowCorrection(true)} style={s.btn("orange")}>🔧 Correction</button>
                <button onClick={() => setShowNewGR(true)} style={s.btn("green")}>+ New Receipt</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
              {["", "PENDING", "PARTIAL", "COMPLETE", "CORRECTION"].map(st => (
                <button key={st} onClick={() => setGrStatusFilter(st)} style={{ ...s.btn(grStatusFilter === st ? "purple" : "ghost"), border: grStatusFilter === st ? "none" : "1px solid #e5e7eb", fontSize: 11 }}>
                  {st || "ALL"}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <input style={{ ...s.input, width: 200 }} value={grSearch} onChange={e => setGrSearch(e.target.value)} placeholder="Search receipts..." />
              <button onClick={fetchReceipts} style={{ ...s.btn("ghost"), border: "1px solid #e5e7eb" }}><Icon d={icons.refresh} size={14} /></button>
            </div>
            <div style={s.card}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Receipt #", "Order #", "Supplier", "Received By", "Date", "Items", "Status", "Actions"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {pagedReceipts.length === 0 && <tr><td colSpan={8} style={{ ...s.td, textAlign: "center", color: "#6b7280", padding: 30 }}>No receipts found</td></tr>}
                  {pagedReceipts.map(r => {
                    const sc = statusColors[r.status] || { bg: "#f3f4f6", color: "#374151" };
                    return (
                      <tr key={r.id}>
                        <td style={s.td}><strong>{r.receiptnumber}</strong>{r.correctiontype && <span style={{ fontSize: 10, color: "#6b7280", marginLeft: 4 }}>({r.correctiontype})</span>}</td>
                        <td style={s.td}>{r.ordernumber || "Standalone"}</td>
                        <td style={s.td}>{r.suppliername || "—"}</td>
                        <td style={s.td}>{r.receivedby}</td>
                        <td style={s.td}>{r.receiptdate ? new Date(r.receiptdate).toLocaleDateString() : "—"}</td>
                        <td style={s.td}>{r.item_count}</td>
                        <td style={s.td}><span style={s.badge(sc.bg, sc.color)}>{r.status === "PARTIALLY_DELIVERED" ? "Partial" : r.status}</span></td>
                        <td style={s.td}>
                          <button onClick={() => loadGRDetail(r.id)} title="View" style={{ background: "none", border: "none", cursor: "pointer" }}><Icon d={icons.eye} size={15} color="#6366f1" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Pagination page={grPage} total={filteredReceipts.length} onPage={setGrPage} />
            </div>
          </div>
        )}

        {/* ═══ CORRECTION TAB ═══ */}
        {tab === "correction" && (
          <div style={{ background: "#fff", borderRadius: 10, padding: 24, border: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>🔧 GRN Correction Tool</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Search for a completed receipt to create a correction (reversal + corrected entry).</p>
            <button onClick={() => setShowCorrection(true)} style={s.btn("purple")}>Open Correction Wizard</button>
          </div>
        )}
        </div>
      </div>

      {/* ═══ MODALS ═══ */}
      {showCreateOrder && <CreateOrderModal allItems={allItems} suppliers={suppliers} onClose={() => { setShowCreateOrder(false); sessionStorage.removeItem('pharmacyCartData_temp'); }} onSuccess={() => { fetchOrders(); showToast("Order created!"); }} onSearchItems={fetchItems} />}
      {editOrderData && <EditOrderModal detail={editOrderData} suppliers={suppliers} allItems={allItems} onClose={() => setEditOrderData(null)} onSuccess={() => { setEditOrderData(null); fetchOrders(); showToast("Order updated!"); }} onSearchItems={fetchItems} />}
      {viewOrderId && viewOrderDetail && !showReceiveModal && (
        <ViewOrderModal detail={viewOrderDetail} onClose={() => { setViewOrderId(null); setViewOrderDetail(null); }}
          onReceive={() => setShowReceiveModal(true)}
          onEdit={() => { setEditOrderData(viewOrderDetail); setViewOrderId(null); setViewOrderDetail(null); }} />
      )}
      {showReceiveModal && viewOrderDetail && (
        <ReceiveOrderModal detail={viewOrderDetail} onClose={() => { setShowReceiveModal(false); setViewOrderId(null); setViewOrderDetail(null); }}
          onSuccess={(msg) => { setShowReceiveModal(false); setViewOrderId(null); setViewOrderDetail(null); fetchOrders(); fetchReceipts(); setTab("gr"); showToast(msg); }} warehouseId={warehouseId} />
      )}
      {showNewGR && <NewGoodsReceiptModal orders={orders} suppliers={suppliers} allItems={allItems} onClose={() => setShowNewGR(false)} onSuccess={(msg) => { setShowNewGR(false); fetchReceipts(); fetchOrders(); showToast(msg); }} warehouseId={warehouseId} />}
      {viewGRId && viewGRDetail && <ViewGRModal detail={viewGRDetail} onClose={() => { setViewGRId(null); setViewGRDetail(null); }} />}
      {showCorrection && <CorrectionModal onClose={() => setShowCorrection(false)} onSuccess={(msg) => { setShowCorrection(false); fetchReceipts(); showToast(msg); }} warehouseId={warehouseId} />}
      {cancelOrderId && (
        <div style={s.overlay}><div style={{ ...s.modal, width: 420 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Cancel Order</h3>
          <div style={s.fgroup}><label style={s.label}>Reason</label><textarea style={{ ...s.input, minHeight: 60 }} value={cancelReason} onChange={e => setCancelReason(e.target.value)} /></div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => { setCancelOrderId(null); setCancelReason(""); }} style={{ ...s.btn("ghost"), border: "1px solid #e5e7eb" }}>Back</button>
            <button onClick={handleCancelOrder} style={s.btn("red")}>Confirm Cancel</button>
          </div>
        </div></div>
      )}
    </div>
  );
}
