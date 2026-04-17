"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);
const icons = {
  back:    "M19 12H5M12 5l-7 7 7 7",
  plus:    "M12 5v14M5 12h14",
  x:       "M18 6L6 18M6 6l12 12",
  edit:    "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:   "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  search:  "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  users:   "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
};

const s: Record<string,any> = {
  page:    { fontFamily:"Inter,sans-serif", minHeight:"100vh", background:"#f8f9fa", color:"#111827" },
  header:  { background:"#fff", borderBottom:"1px solid #e5e7eb", padding:"0 24px", height:56, display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:10 },
  content: { padding:24, maxWidth:1200, margin:"0 auto" },
  card:    { background:"#fff", borderRadius:10, border:"1px solid #e5e7eb", overflow:"hidden", marginBottom:16 },
  th:      { padding:"10px 14px", textAlign:"left" as const, fontSize:11, fontWeight:700, color:"#6b7280", textTransform:"uppercase" as const, background:"#f9fafb", borderBottom:"1px solid #e5e7eb", whiteSpace:"nowrap" as const },
  td:      { padding:"12px 14px", borderBottom:"1px solid #f9fafb", fontSize:13, color:"#111827" },
  btn:     (c:string) => ({ padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", border:"none", background:c==="purple"?"#6366f1":c==="red"?"#dc2626":c==="green"?"#16a34a":"#f3f4f6", color:c==="ghost"?"#374151":"#fff" }),
  input:   { width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid #d1d5db", fontSize:13, color:"#111827", boxSizing:"border-box" as const },
  label:   { fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:4 },
  overlay: { position:"fixed" as const, inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 },
  modal:   { background:"#fff", borderRadius:12, padding:28, width:560, maxHeight:"90vh", overflowY:"auto" as const },
  fgroup:  { marginBottom:12 },
};

const EMPTY = { name:"", code:"", contactname:"", phone:"", email:"", address:"", country:"", paymentterms:"", currency:"USD", notes:"" };

export default function VendorsPage() {
  const [vendors, setVendors]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [modalMode, setModalMode] = useState<"add"|"edit"|null>(null);
  const [activeRow, setActiveRow] = useState<any>(null);
  const [deleteRow, setDeleteRow] = useState<any>(null);
  const [form, setForm]           = useState(EMPTY);
  const [toast, setToast]         = useState("");

  const showToast = (msg:string) => { setToast(msg); setTimeout(()=>setToast(""),3000); };
  const set = (k:string, v:string) => setForm(f => ({...f,[k]:v}));
  const closeModal = () => { setModalMode(null); setActiveRow(null); setForm(EMPTY); };

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/vendors?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setVendors(Array.isArray(data) ? data : (data.vendors ?? []));
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const openAdd = () => { setForm(EMPTY); setActiveRow(null); setModalMode("add"); };
  const openEdit = (v: any) => {
    setForm({ name:v.name??"", code:v.code??"", contactname:v.contactname??"", phone:v.phone??"",
              email:v.email??"", address:v.address??"", country:v.country??"",
              paymentterms:v.paymentterms??"", currency:v.currency??"USD", notes:v.notes??"" });
    setActiveRow(v);
    setModalMode("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast("Vendor name is required"); return; }
    const isEdit = modalMode === "edit";
    const url    = isEdit ? `/api/vendors/${activeRow.id}` : "/api/vendors";
    const method = isEdit ? "PATCH" : "POST";
    closeModal();
    const res = await fetch(url, { method, headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    if (res.ok) { fetchVendors(); showToast(isEdit ? "Vendor updated!" : "Vendor added!"); }
  };

  const handleDelete = async () => {
    const id = deleteRow?.id;
    setDeleteRow(null);
    await fetch(`/api/vendors/${id}`, { method:"DELETE" });
    fetchVendors();
    showToast("Vendor deactivated");
  };

  const filtered = vendors.filter(v =>
    !search.trim() ||
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.contactname?.toLowerCase().includes(search.toLowerCase()) ||
    v.email?.toLowerCase().includes(search.toLowerCase()) ||
    v.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={s.page}>
      <style>{`* { box-sizing:border-box; } input,select { color:#111827 !important; } tr:hover td { background:#f9fafb; }`}</style>

      <div style={s.header}>
        <Link href="/" style={{ display:"flex", alignItems:"center", color:"#6b7280", textDecoration:"none" }}><Icon d={icons.back} size={15}/></Link>
        <div style={{ width:1, height:20, background:"#e5e7eb" }}/>
        <div style={{ width:32, height:32, background:"#ede9fe", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}><Icon d={icons.users} size={16} color="#6366f1"/></div>
        <span style={{ fontSize:14, fontWeight:700 }}>Vendors</span>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <button onClick={fetchVendors} style={{ ...s.btn("ghost"), border:"1px solid #e5e7eb", display:"flex", alignItems:"center", gap:5 }}><Icon d={icons.refresh} size={13} color="#374151"/></button>
          <button onClick={openAdd} style={{ ...s.btn("purple"), display:"flex", alignItems:"center", gap:6 }}><Icon d={icons.plus} size={13} color="#fff"/> Add Vendor</button>
        </div>
      </div>

      <div style={s.content}>
        {/* Summary */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
          {[
            { label:"Total Vendors",  value:vendors.length,                            color:"#6366f1", bg:"#eef2ff" },
            { label:"Active",         value:vendors.filter(v=>v.isactive).length,      color:"#16a34a", bg:"#f0fdf4" },
            { label:"Inactive",       value:vendors.filter(v=>!v.isactive).length,     color:"#6b7280", bg:"#f9fafb" },
          ].map(m=>(
            <div key={m.label} style={{ background:m.bg, borderRadius:10, padding:"14px 18px", border:"1px solid #e5e7eb" }}>
              <div style={{ fontSize:11, fontWeight:600, color:m.color, marginBottom:4 }}>{m.label}</div>
              <div style={{ fontSize:26, fontWeight:700, color:"#111827" }}>{m.value}</div>
            </div>
          ))}
        </div>

        <div style={s.card}>
          {/* Search bar */}
          <div style={{ padding:"12px 16px", borderBottom:"1px solid #f3f4f6", display:"flex", gap:10, alignItems:"center" }}>
            <div style={{ position:"relative", display:"flex", alignItems:"center", flex:1, maxWidth:320 }}>
              <div style={{ position:"absolute", left:10, pointerEvents:"none" }}>
                <Icon d={icons.search} size={13} color="#9ca3af"/>
              </div>
              <input
                placeholder="Search vendors by name, contact, email, code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ ...s.input, paddingLeft:32 }}
              />
            </div>
            <span style={{ fontSize:12, color:"#9ca3af", marginLeft:"auto" }}>{filtered.length} vendors</span>
          </div>

          {loading ? <div style={{ padding:40, textAlign:"center", color:"#9ca3af" }}>Loading...</div>
          : filtered.length===0 ? (
            <div style={{ padding:40, textAlign:"center", color:"#9ca3af" }}>
              {search ? "No vendors match your search" : "No vendors yet."}
              {!search && <button onClick={openAdd} style={{ color:"#6366f1", background:"none", border:"none", cursor:"pointer", fontWeight:600, marginLeft:4 }}>Add one →</button>}
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>{["Vendor","Code","Contact","Email","Phone","Country","Payment Terms","Rating","Status","Actions"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.map(v => (
                    <tr key={v.id}>
                      <td style={{ ...s.td, fontWeight:600 }}>
                        {v.name}
                        {v.notes && <div style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>{v.notes}</div>}
                      </td>
                      <td style={{ ...s.td, fontFamily:"monospace", fontSize:11, color:"#6b7280" }}>{v.code||"—"}</td>
                      <td style={s.td}>{v.contactname||"—"}</td>
                      <td style={{ ...s.td, color:"#6366f1", fontSize:12 }}>{v.email||"—"}</td>
                      <td style={s.td}>{v.phone||"—"}</td>
                      <td style={{ ...s.td, fontSize:12 }}>{v.country||"—"}</td>
                      <td style={{ ...s.td, fontSize:12, color:"#6b7280" }}>{v.paymentterms||"—"}</td>
                      <td style={s.td}>
                        {v.rating ? (
                          <span style={{ fontSize:13 }}>{"⭐".repeat(Math.min(v.rating,5))}</span>
                        ) : "—"}
                      </td>
                      <td style={s.td}>
                        <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, background:v.isactive?"#d1fae5":"#f3f4f6", color:v.isactive?"#065f46":"#6b7280" }}>
                          {v.isactive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={s.td}>
                        <div style={{ display:"flex", gap:5 }}>
                          <button onClick={()=>openEdit(v)} style={{ background:"#eff6ff", border:"none", borderRadius:6, padding:"5px 8px", cursor:"pointer", display:"flex", alignItems:"center" }}>
                            <Icon d={icons.edit} size={12} color="#2563eb"/>
                          </button>
                          <button onClick={()=>setDeleteRow(v)} style={{ background:"#fee2e2", border:"none", borderRadius:6, padding:"5px 8px", cursor:"pointer", display:"flex", alignItems:"center" }}>
                            <Icon d={icons.trash} size={12} color="#dc2626"/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalMode && (
        <div style={s.overlay}><div style={s.modal}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <h3 style={{ fontSize:16, fontWeight:600, margin:0 }}>{modalMode==="edit"?"Edit Vendor":"Add Vendor"}</h3>
            <button onClick={closeModal} style={{ background:"none", border:"none", cursor:"pointer" }}><Icon d={icons.x} size={18} color="#6b7280"/></button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div style={{ gridColumn:"1/-1", ...s.fgroup }}>
              <label style={s.label}>Vendor Name *</label>
              <input style={s.input} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. MedSupply Co."/>
            </div>
            <div style={s.fgroup}>
              <label style={s.label}>Code</label>
              <input style={s.input} value={form.code} onChange={e=>set("code",e.target.value)} placeholder="e.g. VND-001"/>
            </div>
            <div style={s.fgroup}>
              <label style={s.label}>Contact Name</label>
              <input style={s.input} value={form.contactname} onChange={e=>set("contactname",e.target.value)}/>
            </div>
            <div style={s.fgroup}>
              <label style={s.label}>Email</label>
              <input type="email" style={s.input} value={form.email} onChange={e=>set("email",e.target.value)}/>
            </div>
            <div style={s.fgroup}>
              <label style={s.label}>Phone</label>
              <input style={s.input} value={form.phone} onChange={e=>set("phone",e.target.value)}/>
            </div>
            <div style={s.fgroup}>
              <label style={s.label}>Country</label>
              <input style={s.input} value={form.country} onChange={e=>set("country",e.target.value)}/>
            </div>
            <div style={s.fgroup}>
              <label style={s.label}>Currency</label>
              <select style={s.input} value={form.currency} onChange={e=>set("currency",e.target.value)}>
                {["USD","EUR","GBP","IQD","SAR","AED","TRY"].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={s.fgroup}>
              <label style={s.label}>Payment Terms</label>
              <select style={s.input} value={form.paymentterms} onChange={e=>set("paymentterms",e.target.value)}>
                <option value="">— Select —</option>
                {["Net 30","Net 60","Net 90","Cash on Delivery","Prepayment","Letter of Credit"].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:"1/-1", ...s.fgroup }}>
              <label style={s.label}>Address</label>
              <input style={s.input} value={form.address} onChange={e=>set("address",e.target.value)}/>
            </div>
            <div style={{ gridColumn:"1/-1", ...s.fgroup }}>
              <label style={s.label}>Notes</label>
              <input style={s.input} value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Optional notes..."/>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}>
            <button onClick={closeModal} style={{ ...s.btn("ghost"), border:"1px solid #e5e7eb" }}>Cancel</button>
            <button onClick={handleSave} style={s.btn("purple")}>{modalMode==="edit"?"Save Changes":"Add Vendor"}</button>
          </div>
        </div></div>
      )}

      {/* Delete confirm */}
      {deleteRow && (
        <div style={s.overlay}><div style={{ ...s.modal, width:420 }}>
          <h3 style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>Deactivate Vendor</h3>
          <p style={{ fontSize:13, color:"#6b7280", marginBottom:20 }}>Deactivate <strong>{deleteRow.name}</strong>? They won't appear in new purchase orders.</p>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button onClick={()=>setDeleteRow(null)} style={{ ...s.btn("ghost"), border:"1px solid #e5e7eb" }}>Cancel</button>
            <button onClick={handleDelete} style={s.btn("red")}>Deactivate</button>
          </div>
        </div></div>
      )}

      {toast && <div style={{ position:"fixed", bottom:24, right:24, background:"#16a34a", color:"#fff", padding:"11px 18px", borderRadius:10, fontSize:13, fontWeight:600, zIndex:2000 }}>✓ {toast}</div>}
    </div>
  );
}
