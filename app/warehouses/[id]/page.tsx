"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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
  warehouse: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10",
  layers:  "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  box:     "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
};

const s: Record<string, any> = {
  page:    { fontFamily: "Inter,sans-serif", minHeight: "100vh", background: "#f8f9fa", color: "#111827" },
  header:  { background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 },
  content: { padding: 24, maxWidth: 1200, margin: "0 auto" },
  card:    { background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: 16 },
  th:      { padding: "10px 14px", textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" as const, background: "#f9fafb", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" as const },
  td:      { padding: "12px 14px", borderBottom: "1px solid #f9fafb", fontSize: 13, color: "#111827" },
  btn:     (c: string) => ({ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: c === "purple" ? "#6366f1" : c === "red" ? "#dc2626" : "#f3f4f6", color: c === "ghost" ? "#374151" : "#fff" }),
  input:   { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, color: "#111827", boxSizing: "border-box" as const },
  label:   { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modal:   { background: "#fff", borderRadius: 12, padding: 28, width: 520, maxHeight: "90vh", overflowY: "auto" as const },
  fgroup:  { marginBottom: 14 },
};

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  bin:        { bg: "#dbeafe", color: "#1d4ed8" },
  shelf:      { bg: "#d1fae5", color: "#065f46" },
  room:       { bg: "#fef3c7", color: "#92400e" },
  cabinet:    { bg: "#ede9fe", color: "#6d28d9" },
  fridge:     { bg: "#cffafe", color: "#0e7490" },
  freezer:    { bg: "#e0f2fe", color: "#0369a1" },
  controlled: { bg: "#fee2e2", color: "#991b1b" },
};

function SectionModal({ section, warehouseId, onClose, onSuccess }: { section?: any; warehouseId: string; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!section;
  const [form, setForm] = useState({
    name:                   section?.section_name        ?? "",
    section_type:           section?.section_type         ?? "bin",
    bin_location:           section?.bin_location         ?? "",
    shelf:                  section?.shelf                ?? "",
    description:            section?.description          ?? "",
    temperature_controlled: section?.temperature_controlled ?? false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setLoading(true);
    try {
      const url    = isEdit ? `/api/sections/${section.id}` : "/api/sections";
      const method = isEdit ? "PATCH" : "POST";
      const payload = { ...form, name: form.name, warehouse_id: warehouseId };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      onSuccess(); onClose();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div style={s.overlay}><div style={s.modal}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h3 style={{ fontSize:16, fontWeight:600, margin:0 }}>{isEdit ? "Edit Section" : "Add Section"}</h3>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer" }}><Icon d={icons.x} size={18} color="#6b7280"/></button>
      </div>
      {error && <div style={{ background:"#fee2e2", color:"#991b1b", borderRadius:8, padding:"8px 12px", fontSize:13, marginBottom:12 }}>{error}</div>}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div style={{ gridColumn:"1/-1", ...s.fgroup }}>
          <label style={s.label}>Section Name *</label>
          <input style={s.input} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Bin A-01"/>
        </div>
        <div style={s.fgroup}>
          <label style={s.label}>Type</label>
          <select style={s.input} value={form.section_type} onChange={e => set("section_type", e.target.value)}>
            {["bin","shelf","room","cabinet","fridge","freezer","controlled"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
          </select>
        </div>
        <div style={{ gridColumn:"1/-1", ...s.fgroup }}>
          <label style={s.label}>Description</label>
          <input style={s.input} value={form.description} onChange={e => set("description", e.target.value)}/>
        </div>
      </div>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:16 }}>
        <button onClick={onClose} style={{ ...s.btn("ghost"), border:"1px solid #e5e7eb" }}>Cancel</button>
        <button onClick={handleSave} disabled={loading} style={s.btn("purple")}>{loading ? "Saving..." : isEdit ? "Save Changes" : "Add Section"}</button>
      </div>
    </div></div>
  );
}

export default function WarehouseDetailPage() {
  const params     = useParams();
  const id         = params.id as string;
  const [wh, setWh]             = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [stock, setStock]       = useState<any[]>([]);
  const [tab, setTab]           = useState<"sections"|"stock">("sections");
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [editSec, setEditSec]   = useState<any>(null);
  const [deleteSec, setDeleteSec] = useState<any>(null);
  const [toast, setToast]       = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const fetchAll = async () => {
    setLoading(true);
    const [whRes, secRes, stockRes] = await Promise.all([
      fetch(`/api/warehouses/${id}`),
      fetch(`/api/sections?warehouse_id=${id}`),
      fetch(`/api/warehouses/${id}/stock`),
    ]);
    setWh(await whRes.json());
    const secData = await secRes.json();
    setSections(Array.isArray(secData) ? secData : []);
    const stockData = await stockRes.json();
    setStock(Array.isArray(stockData) ? stockData : []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);

  const handleDeleteSection = async () => {
    if (!deleteSec) return;
    await fetch(`/api/sections/${deleteSec.id}`, { method: "DELETE" });
    setDeleteSec(null);
    fetchAll();
    showToast("Section deleted");
  };

  const whTypeColors: Record<string, { bg: string; color: string }> = {
    hospital:  { bg: "#dbeafe", color: "#1d4ed8" },
    pharmacy:  { bg: "#ede9fe", color: "#6d28d9" },
    lab:       { bg: "#d1fae5", color: "#065f46" },
    radiology: { bg: "#fef3c7", color: "#92400e" },
  };
  const wtc = whTypeColors[wh?.warehouse_type] ?? { bg: "#f3f4f6", color: "#374151" };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "#9ca3af" }}>Loading...</div>;
  if (!wh || wh.error) return <div style={{ padding: 60, textAlign: "center", color: "#dc2626" }}>Warehouse not found</div>;

  return (
    <div style={s.page}>
      <style>{`* { box-sizing: border-box; } input,select { color: #111827 !important; } tr:hover td { background: #f9fafb; }`}</style>

      <div style={s.header}>
        <Link href="/warehouses" style={{ display:"flex", alignItems:"center", color:"#6b7280", textDecoration:"none" }}><Icon d={icons.back} size={15}/></Link>
        <div style={{ width:1, height:20, background:"#e5e7eb" }}/>
        <div style={{ width:32, height:32, background:"#ede9fe", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}><Icon d={icons.warehouse} size={16} color="#6366f1"/></div>
        <span style={{ fontSize:14, fontWeight:700 }}>{wh.name}</span>
        <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, background:wtc.bg, color:wtc.color }}>{wh.warehouse_type}</span>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <button onClick={fetchAll} style={{ ...s.btn("ghost"), border:"1px solid #e5e7eb", display:"flex", alignItems:"center", gap:5 }}><Icon d={icons.refresh} size={13} color="#374151"/></button>
        </div>
      </div>

      <div style={s.content}>
        {/* Info cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
          {[
            { label:"Sections",    value:sections.length,                                                color:"#6366f1", bg:"#eef2ff" },
            { label:"Stock Items", value:stock.length,                                                   color:"#16a34a", bg:"#f0fdf4" },
            { label:"Location",    value:wh.location ?? "—",                                            color:"#374151", bg:"#f9fafb", isText:true },
            { label:"Manager",     value:wh.manager  ?? "—",                                            color:"#374151", bg:"#f9fafb", isText:true },
          ].map(m => (
            <div key={m.label} style={{ background:m.bg, borderRadius:10, padding:"14px 18px", border:"1px solid #e5e7eb" }}>
              <div style={{ fontSize:11, fontWeight:600, color:m.color, marginBottom:4 }}>{m.label}</div>
              <div style={{ fontSize:(m as any).isText?14:26, fontWeight:700, color:"#111827" }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:2, marginBottom:20, borderBottom:"1px solid #e5e7eb" }}>
          {(["sections","stock"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:"10px 20px", fontSize:13, fontWeight:500, border:"none", background:"none", cursor:"pointer",
                borderBottom: tab===t ? "2px solid #6366f1" : "2px solid transparent",
                color: tab===t ? "#6366f1" : "#6b7280" }}>
              {t === "sections" ? `Sections (${sections.length})` : `Stock (${stock.length})`}
            </button>
          ))}
        </div>

        {/* SECTIONS TAB */}
        {tab === "sections" && (
          <div style={s.card}>
            <div style={{ padding:"12px 16px", borderBottom:"1px solid #f3f4f6", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:13, fontWeight:600 }}>Sections / Bins / Shelves</span>
              <button onClick={() => setShowAdd(true)} style={{ ...s.btn("purple"), display:"flex", alignItems:"center", gap:6 }}>
                <Icon d={icons.plus} size={13} color="#fff"/> Add Section
              </button>
            </div>
            {sections.length === 0 ? (
              <div style={{ padding:40, textAlign:"center", color:"#9ca3af" }}>
                No sections yet. <button onClick={() => setShowAdd(true)} style={{ color:"#6366f1", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Add one →</button>
              </div>
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead><tr>{["Name","Type","Bin Location","Shelf","Temp Controlled","Actions"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {sections.map(sec => {
                      const tc = TYPE_COLORS[sec.section_type] ?? { bg:"#f3f4f6", color:"#374151" };
                      return (
                        <tr key={sec.id}>
                          <td style={{ ...s.td, fontWeight:600 }}>{sec.section_name}</td>
                          <td style={s.td}><span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, background:tc.bg, color:tc.color }}>{sec.section_type}</span></td>
                          <td style={{ ...s.td, fontSize:12, color:"#6b7280" }}>{sec.bin_location ?? "—"}</td>
                          <td style={{ ...s.td, fontSize:12, color:"#6b7280" }}>{sec.shelf ?? "—"}</td>
                          <td style={s.td}><span style={{ fontSize:11, fontWeight:600, padding:"2px 6px", borderRadius:20, background:sec.temperature_controlled?"#cffafe":"#f3f4f6", color:sec.temperature_controlled?"#0e7490":"#6b7280" }}>{sec.temperature_controlled?"Yes":"No"}</span></td>
                          <td style={s.td}>
                            <div style={{ display:"flex", gap:5 }}>
                              <button onClick={() => setEditSec(sec)} style={{ background:"#eff6ff", border:"none", borderRadius:6, padding:"5px 8px", cursor:"pointer", display:"flex", alignItems:"center" }}><Icon d={icons.edit} size={12} color="#2563eb"/></button>
                              <button onClick={() => setDeleteSec(sec)} style={{ background:"#fee2e2", border:"none", borderRadius:6, padding:"5px 8px", cursor:"pointer", display:"flex", alignItems:"center" }}><Icon d={icons.trash} size={12} color="#dc2626"/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* STOCK TAB */}
        {tab === "stock" && (
          <div style={s.card}>
            <div style={{ padding:"12px 16px", borderBottom:"1px solid #f3f4f6" }}>
              <span style={{ fontSize:13, fontWeight:600 }}>Current Stock in this Warehouse</span>
            </div>
            {stock.length === 0 ? (
              <div style={{ padding:40, textAlign:"center", color:"#9ca3af" }}>No stock recorded in this warehouse</div>
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead><tr>{["Item","Code","UOM","Quantity","Reserved","Available","Reorder"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {stock.map((st: any) => {
                      const avail = (st.quantity ?? 0) - (st.reserved_quantity ?? 0);
                      const isLow = avail <= (st.reorder_level ?? 0);
                      return (
                        <tr key={st.id}>
                          <td style={{ ...s.td, fontWeight:600 }}>{st.item_name ?? st.name ?? "—"}</td>
                          <td style={{ ...s.td, fontFamily:"monospace", fontSize:11, color:"#6b7280" }}>{st.itemcode ?? "—"}</td>
                          <td style={s.td}>{st.uom ?? "—"}</td>
                          <td style={{ ...s.td, fontWeight:700, fontSize:15 }}>{st.quantity ?? 0}</td>
                          <td style={{ ...s.td, color:"#d97706" }}>{st.reserved_quantity ?? 0}</td>
                          <td style={{ ...s.td, fontWeight:700, color:isLow?"#dc2626":"#16a34a" }}>{avail}</td>
                          <td style={{ ...s.td, color:"#6b7280" }}>{st.reorder_level ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showAdd  && <SectionModal warehouseId={id} onClose={() => setShowAdd(false)} onSuccess={() => { fetchAll(); showToast("Section added!"); }}/>}
      {editSec  && <SectionModal section={editSec} warehouseId={id} onClose={() => setEditSec(null)} onSuccess={() => { fetchAll(); showToast("Section updated!"); }}/>}
      {deleteSec && (
        <div style={s.overlay}><div style={{ ...s.modal, width:420 }}>
          <h3 style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>Delete Section</h3>
          <p style={{ fontSize:13, color:"#6b7280", marginBottom:20 }}>Delete <strong>{deleteSec.name}</strong>?</p>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <button onClick={() => setDeleteSec(null)} style={{ ...s.btn("ghost"), border:"1px solid #e5e7eb" }}>Cancel</button>
            <button onClick={handleDeleteSection} style={s.btn("red")}>Delete</button>
          </div>
        </div></div>
      )}
      {toast && <div style={{ position:"fixed", bottom:24, right:24, background:"#16a34a", color:"#fff", padding:"11px 18px", borderRadius:10, fontSize:13, fontWeight:600, zIndex:2000 }}>✓ {toast}</div>}
    </div>
  );
}
