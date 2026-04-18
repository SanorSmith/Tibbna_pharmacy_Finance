"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const icons = {
  back:    "M19 12H5M12 5l-7 7 7 7",
  plus:    "M12 5v14M5 12h14",
  x:       "M18 6L6 18M6 6l12 12",
  edit:    "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:   "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  search:  "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  warehouse: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10",
  eye:     "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 12m-3 0a3 3 0 106 0 3 3 0 00-6 0",
};

const s: Record<string, any> = {
  page:    { fontFamily: "Inter,sans-serif", minHeight: "100vh", background: "#f8f9fa", color: "#111827" },
  header:  { background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 },
  content: { padding: 24, maxWidth: 1200, margin: "0 auto" },
  card:    { background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: 16 },
  th:      { padding: "10px 14px", textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" as const, background: "#f9fafb", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" as const },
  td:      { padding: "12px 14px", borderBottom: "1px solid #f9fafb", fontSize: 13, color: "#111827" },
  btn:     (c: string) => ({ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: c === "purple" ? "#6366f1" : c === "red" ? "#dc2626" : c === "green" ? "#16a34a" : "#f3f4f6", color: c === "ghost" ? "#374151" : "#fff" }),
  input:   { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, color: "#111827", boxSizing: "border-box" as const },
  label:   { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modal:   { background: "#fff", borderRadius: 12, padding: 28, width: 520, maxHeight: "90vh", overflowY: "auto" as const },
  fgroup:  { marginBottom: 14 },
};

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  hospital:  { bg: "#dbeafe", color: "#1d4ed8" },
  pharmacy:  { bg: "#ede9fe", color: "#6d28d9" },
  lab:       { bg: "#d1fae5", color: "#065f46" },
  radiology: { bg: "#fef3c7", color: "#92400e" },
};

function WarehouseModal({ wh, onClose, onSuccess }: { wh?: any; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!wh;
  const [form, setForm] = useState({
    name:           wh?.name           ?? "",
    warehouse_type: wh?.warehouse_type ?? "hospital",
    location:       wh?.location       ?? "",
    manager:        wh?.manager        ?? "",
    description:    wh?.description    ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setLoading(true);
    try {
      const url    = isEdit ? `/api/warehouses/${wh.id}` : "/api/warehouses";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      onSuccess(); onClose();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div style={s.overlay}><div style={s.modal}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h3 style={{ fontSize:16, fontWeight:600, margin:0 }}>{isEdit ? "Edit Warehouse" : "Add Warehouse"}</h3>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer" }}><Icon d={icons.x} size={18} color="#6b7280"/></button>
      </div>
      {error && <div style={{ background:"#fee2e2", color:"#991b1b", borderRadius:8, padding:"8px 12px", fontSize:13, marginBottom:12 }}>{error}</div>}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div style={{ gridColumn:"1/-1", ...s.fgroup }}>
          <label style={s.label}>Warehouse Name *</label>
          <input style={s.input} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Main Pharmacy Store"/>
        </div>
        <div style={s.fgroup}>
          <label style={s.label}>Type</label>
          <select style={s.input} value={form.warehouse_type} onChange={e => set("warehouse_type", e.target.value)}>
            {["hospital","pharmacy","lab","radiology"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
          </select>
        </div>
        <div style={s.fgroup}>
          <label style={s.label}>Manager</label>
          <input style={s.input} value={form.manager} onChange={e => set("manager", e.target.value)} placeholder="Manager name"/>
        </div>
        <div style={{ gridColumn:"1/-1", ...s.fgroup }}>
          <label style={s.label}>Location</label>
          <input style={s.input} value={form.location} onChange={e => set("location", e.target.value)} placeholder="Floor, building, room..."/>
        </div>
        <div style={{ gridColumn:"1/-1", ...s.fgroup }}>
          <label style={s.label}>Description</label>
          <input style={s.input} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Optional notes..."/>
        </div>
      </div>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:16 }}>
        <button onClick={onClose} style={{ ...s.btn("ghost"), border:"1px solid #e5e7eb" }}>Cancel</button>
        <button onClick={handleSave} disabled={loading} style={s.btn("purple")}>{loading ? "Saving..." : isEdit ? "Save Changes" : "Add Warehouse"}</button>
      </div>
    </div></div>
  );
}

function ConfirmModal({ name, onClose, onConfirm }: { name: string; onClose: () => void; onConfirm: () => void }) {
  return (
    <div style={s.overlay}><div style={{ ...s.modal, width:420 }}>
      <h3 style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>Deactivate Warehouse</h3>
      <p style={{ fontSize:13, color:"#6b7280", marginBottom:20 }}>Are you sure you want to deactivate <strong>{name}</strong>?</p>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <button onClick={onClose} style={{ ...s.btn("ghost"), border:"1px solid #e5e7eb" }}>Cancel</button>
        <button onClick={onConfirm} style={s.btn("red")}>Deactivate</button>
      </div>
    </div></div>
  );
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAdd, setShowAdd]       = useState(false);
  const [editWh, setEditWh]         = useState<any>(null);
  const [deleteWh, setDeleteWh]     = useState<any>(null);
  const [toast, setToast]           = useState("");

  

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/warehouses");
    const data = await res.json();
    const all  = Array.isArray(data) ? data : (data.warehouses ?? []);
    setWarehouses(all);
    setLoading(false);
  }, []);

  useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);
const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };
  const handleDelete = async () => {
    if (!deleteWh) return;
    await fetch(`/api/warehouses/${deleteWh.id}`, { method: "DELETE" });
    setDeleteWh(null);
    fetchWarehouses();
    showToast("Warehouse deactivated");
  };
const wtype = (w: any) => w.warehouse_type ?? w.warehousetype ?? "";

  const counts = {
    all:       warehouses.length,
    hospital:  warehouses.filter(w => wtype(w) === "hospital").length,
    pharmacy:  warehouses.filter(w => wtype(w) === "pharmacy").length,
    lab:       warehouses.filter(w => wtype(w) === "lab").length,
    radiology: warehouses.filter(w => wtype(w) === "radiology").length,
  };

  const filtered = warehouses.filter(w =>
    (typeFilter === "all" || wtype(w) === typeFilter) &&
    (w.name?.toLowerCase().includes(search.toLowerCase()) ||
     w.location?.toLowerCase().includes(search.toLowerCase()) ||
     w.manager?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={s.page}>
      <style>{`* { box-sizing: border-box; } input,select { color: #111827 !important; } tr:hover td { background: #f9fafb; }`}</style>

      <div style={s.header}>
        <Link href="/" style={{ display:"flex", alignItems:"center", color:"#6b7280", textDecoration:"none" }}><Icon d={icons.back} size={15}/></Link>
        <div style={{ width:1, height:20, background:"#e5e7eb" }}/>
        <div style={{ width:32, height:32, background:"#ede9fe", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}><Icon d={icons.warehouse} size={16} color="#6366f1"/></div>
        <span style={{ fontSize:14, fontWeight:700 }}>Warehouses</span>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <button onClick={fetchWarehouses} style={{ ...s.btn("ghost"), border:"1px solid #e5e7eb", display:"flex", alignItems:"center", gap:5 }}><Icon d={icons.refresh} size={13} color="#374151"/></button>
          <button onClick={() => setShowAdd(true)} style={{ ...s.btn("purple"), display:"flex", alignItems:"center", gap:6 }}><Icon d={icons.plus} size={13} color="#fff"/> Add Warehouse</button>
        </div>
      </div>

      <div style={s.content}>
        {/* Summary */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:24 }}>
          {[
            { key:"all",       label:"All",       value:counts.all,       color:"#6366f1", bg:"#eef2ff" },
            { key:"hospital",  label:"Hospital",  value:counts.hospital,  color:"#1d4ed8", bg:"#dbeafe" },
            { key:"pharmacy",  label:"Pharmacy",  value:counts.pharmacy,  color:"#6d28d9", bg:"#ede9fe" },
            { key:"lab",       label:"Lab",       value:counts.lab,       color:"#065f46", bg:"#d1fae5" },
            { key:"radiology", label:"Radiology", value:counts.radiology, color:"#92400e", bg:"#fef3c7" },
          ].map(m => (
            <div key={m.key} onClick={() => setTypeFilter(m.key)}
              style={{ background:typeFilter===m.key ? m.bg : "#fff", borderRadius:10, padding:"14px 18px", border:`1px solid ${typeFilter===m.key ? m.color+"40" : "#e5e7eb"}`, cursor:"pointer" }}>
              <div style={{ fontSize:11, fontWeight:600, color:m.color, marginBottom:4 }}>{m.label}</div>
              <div style={{ fontSize:26, fontWeight:700, color:"#111827" }}>{m.value}</div>
            </div>
          ))}
        </div>

        <div style={s.card}>
          <div style={{ padding:"12px 16px", borderBottom:"1px solid #f3f4f6", display:"flex", gap:10, alignItems:"center" }}>
            <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
              <div style={{ position:"absolute", left:10, pointerEvents:"none" }}><Icon d={icons.search} size={13} color="#9ca3af"/></div>
              <input placeholder="Search warehouses..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...s.input, width:240, paddingLeft:30 }}/>
            </div>
            <span style={{ marginLeft:"auto", fontSize:12, color:"#9ca3af" }}>{filtered.length} warehouses</span>
          </div>

          {loading ? <div style={{ padding:40, textAlign:"center", color:"#9ca3af" }}>Loading...</div>
          : filtered.length === 0 ? <div style={{ padding:40, textAlign:"center", color:"#9ca3af" }}>No warehouses found</div>
          : <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>{["Name","Type","Location","Manager","Description","Status","Actions"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map(w => {
const tc = TYPE_COLORS[wtype(w)] ?? { bg:"#f3f4f6", color:"#374151" };                  return (
                    <tr key={w.id}>
                      <td style={{ ...s.td, fontWeight:600 }}>
                        <div>{w.name}</div>
                        <div style={{ fontSize:11, color:"#9ca3af", fontFamily:"monospace" }}>{w.id.slice(0,8)}...</div>
                      </td>
                      <td style={s.td}>
                        <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, background:tc.bg, color:tc.color }}>
                          {w.warehouse_type}
                        </span>
                      </td>
                      <td style={{ ...s.td, fontSize:12, color:"#6b7280" }}>{w.location ?? "—"}</td>
                      <td style={s.td}>{w.manager ?? "—"}</td>
                      <td style={{ ...s.td, fontSize:12, color:"#6b7280", maxWidth:200 }}>
                        <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{w.description ?? "—"}</div>
                      </td>
                      <td style={s.td}>
                        <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, background:w.is_active?"#d1fae5":"#f3f4f6", color:w.is_active?"#065f46":"#6b7280" }}>
                          {w.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={s.td}>
                        <div style={{ display:"flex", gap:5 }}>
                          <button onClick={() => setEditWh(w)} style={{ background:"#eff6ff", border:"none", borderRadius:6, padding:"5px 8px", cursor:"pointer", display:"flex", alignItems:"center" }}>
                            <Icon d={icons.edit} size={12} color="#2563eb"/>
                          </button>
                          <Link href={`/warehouses/${w.id}`} style={{ background:"#f0fdf4", border:"none", borderRadius:6, padding:"5px 8px", cursor:"pointer", display:"flex", alignItems:"center", textDecoration:"none" }}>
                            <Icon d={icons.eye} size={12} color="#16a34a"/>
                          </Link>
                          <button onClick={() => setDeleteWh(w)} style={{ background:"#fee2e2", border:"none", borderRadius:6, padding:"5px 8px", cursor:"pointer", display:"flex", alignItems:"center" }}>
                            <Icon d={icons.trash} size={12} color="#dc2626"/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>}
        </div>
      </div>

      {showAdd  && <WarehouseModal onClose={() => setShowAdd(false)} onSuccess={() => { fetchWarehouses(); showToast("Warehouse added!"); }}/>}
      {editWh   && <WarehouseModal wh={editWh} onClose={() => setEditWh(null)} onSuccess={() => { fetchWarehouses(); showToast("Warehouse updated!"); }}/>}
      {deleteWh && <ConfirmModal name={deleteWh.name} onClose={() => setDeleteWh(null)} onConfirm={handleDelete}/>}
      {toast && <div style={{ position:"fixed", bottom:24, right:24, background:"#16a34a", color:"#fff", padding:"11px 18px", borderRadius:10, fontSize:13, fontWeight:600, zIndex:2000 }}>✓ {toast}</div>}
    </div>
  );
}
