"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AddDrugToPharmacyWizard } from "@/components/AddDrugToPharmacyWizard";

const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  back:    "M19 12H5M12 5l-7 7 7 7",
  plus:    "M12 5v14M5 12h14",
  x:       "M18 6L6 18M6 6l12 12",
  check:   "M20 6L9 17l-5-5",
  search:  "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  pill:    "M10.5 6.5L6.5 10.5M9 3l12 12-6 6L3 9l6-6z",
  import:  "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  edit:    "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  eye:     "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6",
  trash:   "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  lock:    "M12 17a2 2 0 100-4 2 2 0 000 4zm6-6V9a6 6 0 10-12 0v2H4v13h16V11h-2z",
  layers:  "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
};

const s: Record<string, any> = {
  page:    { fontFamily: "Inter,sans-serif", minHeight: "100vh", background: "#f8f9fa", color: "#111827" },
  header:  { background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 },
  content: { padding: 24, maxWidth: 1400, margin: "0 auto" },
  tabs:    { display: "flex", gap: 4, marginBottom: 16, background: "#f3f4f6", flexWrap: "wrap" as const, borderRadius: 10, padding: "4px", position: "sticky" as const, top: 56, zIndex: 9 },
  tab:     (a: boolean) => ({ padding: "10px 18px", fontSize: 13, fontWeight: a?700:500, border: "none", background: a?"#6366f1":"transparent", cursor: "pointer", borderBottom: "none", color: a?"#fff":"#6b7280", borderRadius: 8, margin: "4px 2px" }),
  card:    { background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: 16 },
  th:      { padding: "10px 12px", textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" as const, background: "#f9fafb", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" as const },
  td:      { padding: "10px 12px", borderBottom: "1px solid #f9fafb", fontSize: 13, color: "#111827" },
  btn:     (c: string) => ({ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: c === "purple" ? "#6366f1" : c === "green" ? "#16a34a" : c === "blue" ? "#2563eb" : c === "red" ? "#dc2626" : "#f3f4f6", color: c === "ghost" ? "#374151" : "#fff" }),
  input:   { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, color: "#111827", boxSizing: "border-box" as const },
  label:   { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modal:   { background: "#fff", borderRadius: 12, padding: 28, width: 600, maxHeight: "90vh", overflowY: "auto" as const },
  fgroup:  { marginBottom: 14 },
};

function stockColor(qty: number, reorder: number) {
  if (qty === 0) return { bg: "#fee2e2", color: "#991b1b", label: "Out of stock" };
  if (qty <= reorder) return { bg: "#fef3c7", color: "#92400e", label: "Low stock" };
  return { bg: "#d1fae5", color: "#065f46", label: "In stock" };
}

function expiryAlert(date: string | null) {
  if (!date) return null;
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  if (days <= 0) return { label: "Expired", bg: "#fee2e2", color: "#991b1b" };
  if (days <= 90) return { label: `Expires ${days}d`, bg: "#fef3c7", color: "#92400e" };
  return null;
}

function Pagination({ page, total, pageSize, setPage }: { page: number; total: number; pageSize: number; setPage: (p: number) => void }) {
  const totalPages = Math.ceil(total / pageSize);
  if (total <= pageSize) return null;
  return (
    <div style={{ padding: "12px 16px", borderTop: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 12, color: "#6b7280" }}>Showing {(page-1)*pageSize+1}–{Math.min(page*pageSize, total)} of {total}</span>
      <div style={{ display: "flex", gap: 4 }}>
        <button onClick={() => setPage(Math.max(1, page-1))} disabled={page===1}
          style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #e5e7eb", background: page===1?"#f9fafb":"#fff", fontSize: 12, cursor: page===1?"default":"pointer", color: page===1?"#d1d5db":"#374151" }}>← Prev</button>
        {Array.from({length: totalPages}, (_,i)=>i+1)
          .filter(p => p===1 || p===totalPages || Math.abs(p-page)<=1)
          .reduce((acc:(number|string)[],p,idx,arr)=>{ if(idx>0&&(p as number)-(arr[idx-1] as number)>1) acc.push("..."); acc.push(p); return acc; },[])
          .map((p,idx) => typeof p==="string"
            ? <span key={`d${idx}`} style={{padding:"5px 8px",fontSize:12,color:"#9ca3af"}}>…</span>
            : <button key={p} onClick={()=>setPage(p as number)} style={{padding:"5px 10px",borderRadius:6,border:"1px solid",fontSize:12,cursor:"pointer",background:page===p?"#6366f1":"#fff",borderColor:page===p?"#6366f1":"#e5e7eb",color:page===p?"#fff":"#374151",fontWeight:page===p?600:400}}>{p}</button>
          )}
        <button onClick={() => setPage(Math.min(totalPages, page+1))} disabled={page===totalPages}
          style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #e5e7eb", background: page===totalPages?"#f9fafb":"#fff", fontSize: 12, cursor: page===totalPages?"default":"pointer", color: page===totalPages?"#d1d5db":"#374151" }}>Next →</button>
      </div>
    </div>
  );
}

// ── Shelf Search / Create ──────────────────────────────────────────────────────
const DEFAULT_SHELVES = ["Shelf A-1","Shelf A-2","Shelf B-1","Shelf B-2","Shelf C-1","Shelf C-2","Fridge 1","Fridge 2","Freezer 1","Cabinet 1","Controlled Room","Dispensary Counter"];

function ShelfSearch({ value, existingShelves, onChange }: { value:string; existingShelves:string[]; onChange:(v:string)=>void }) {
  const [query, setQuery] = useState(value||"");
  const [open, setOpen]   = useState(false);
  const allShelves = [...new Set([...DEFAULT_SHELVES, ...existingShelves])];
  const filtered   = allShelves.filter(s => !query || s.toLowerCase().includes(query.toLowerCase()));
  const showCreate = query.trim() && !allShelves.find(s=>s.toLowerCase()===query.toLowerCase());
  return (
    <div style={{position:"relative"}}>
      <input style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #d1d5db",fontSize:13,color:"#111827",boxSizing:"border-box" as const}}
        value={query} placeholder="Search or create shelf..."
        onChange={e=>{setQuery(e.target.value);onChange(e.target.value);setOpen(true);}}
        onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)}/>
      {open && (filtered.length>0||showCreate) && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1px solid #e5e7eb",borderRadius:8,boxShadow:"0 4px 12px rgba(0,0,0,0.1)",zIndex:200,maxHeight:200,overflowY:"auto" as const}}>
          {filtered.slice(0,10).map(s=>(
            <div key={s} onMouseDown={()=>{setQuery(s);onChange(s);setOpen(false);}}
              style={{padding:"8px 12px",cursor:"pointer",fontSize:13,borderBottom:"1px solid #f3f4f6"}}
              onMouseEnter={e=>(e.currentTarget.style.background="#f9fafb")}
              onMouseLeave={e=>(e.currentTarget.style.background="#fff")}>{s}</div>
          ))}
          {showCreate && (
            <div onMouseDown={()=>{setQuery(query);onChange(query);setOpen(false);}}
              style={{padding:"8px 12px",cursor:"pointer",fontSize:13,color:"#6366f1",fontWeight:600,borderTop:"1px solid #e5e7eb",display:"flex",alignItems:"center",gap:6}}>
              <span>+</span> Create "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Manufacturer Search Input ──────────────────────────────────────────────────
function MfgSearchInput({ value, manufacturers, onChange }: { value: string; manufacturers: any[]; onChange: (v: string) => void }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen]   = useState(false);
  const filtered = manufacturers.filter(m =>
    !query || m.name.toLowerCase().includes(query.toLowerCase()) || (m.country??"").toLowerCase().includes(query.toLowerCase())
  );
  return (
    <div style={{ position:"relative" }}>
      <input style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid #d1d5db", fontSize:13, color:"#111827", boxSizing:"border-box" as const }}
        value={query} placeholder="Search manufacturer..."
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && filtered.length > 0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1px solid #e5e7eb", borderRadius:8, boxShadow:"0 4px 12px rgba(0,0,0,0.1)", zIndex:200, maxHeight:180, overflowY:"auto" as const }}>
          {filtered.slice(0,10).map(m => (
            <div key={m.id} onMouseDown={() => { setQuery(m.name); onChange(m.name); setOpen(false); }}
              style={{ padding:"8px 12px", cursor:"pointer", fontSize:13, borderBottom:"1px solid #f3f4f6" }}
              onMouseEnter={e => (e.currentTarget.style.background="#f9fafb")}
              onMouseLeave={e => (e.currentTarget.style.background="#fff")}>
              <strong>{m.name}</strong>
              {m.country && <span style={{ fontSize:11, color:"#6b7280", marginLeft:6 }}>{m.country}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Item Modal ─────────────────────────────────────────────────────────────────
function ItemModal({ item, onClose, onSuccess, manufacturers, warehouses }: { item?: any; onClose: ()=>void; onSuccess: ()=>void; manufacturers?: any[]; warehouses?: any[] }) {
  const isEdit = !!item;
  const ITEM_TYPES = ["device","cosmetic","cream","supplement","personal_care","baby_care","herbal","medical_supply","consumable","other"];
  const [form, setForm] = useState({
    name:         item?.name          ?? "",
    genericname:  item?.genericName   ?? item?.generic_Name ?? "",
    itemcode:     item?.itemcode      ?? "",
    itemtype:     item?.itemType      ?? "device",
    uom:          item?.uom           ?? "piece",
    manufacturer: item?.manufacturer  ?? "",
    description:  item?.description   ?? "",
    barcode:      item?.barcode       ?? "",
    min_level:    String(item?.minLevel ?? ""),
    max_level:    String(item?.maxLevel ?? ""),
    controlled:   item?.controlled    ?? false,
    unit_cost:    String(item?.unitCost     ?? ""),
    selling_price:String(item?.sellingPrice ?? ""),
    storage_location_id: item?.storageLocationId ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [scanning, setScanning] = useState(false);
  const [storageLocations, setStorageLocations] = useState<any[]>([]);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    fetch('/api/pharmacy/storage').then(r=>r.json()).then(d=>setStorageLocations(Array.isArray(d)?d:[]));
  }, []);

  const handleSave = async () => {
    if (!form.name.trim() || !form.itemcode.trim()) { setError("Name and item code are required"); return; }
    if (!form.manufacturer.trim()) { setError("Manufacturer is required — please select from the list"); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        inventorycategory: "pharmacy",
        price_type: "fixed",
        insurance_coverage_pct: 0,
        min_level: parseInt(form.min_level)||0,
        reorder_level: parseInt(form.min_level)||0,
        max_level: parseInt(form.max_level)||null,
        unitcost: form.unit_cost,
        sellingprice: form.selling_price,
      };
      const res = await fetch(isEdit ? `/api/pharmacy/items/${item.id}` : "/api/pharmacy/items", {
        method: isEdit?"PATCH":"POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      onSuccess(); onClose();
    } catch(e: any) { setError(e.message); } finally { setLoading(false); }
  };

  // Handle USB barcode scanner (acts as keyboard input)
  const handleBarcodeKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && form.barcode.trim()) {
      // Barcode scanner pressed Enter — search for item by barcode
      setScanning(true);
      fetch(`/api/pharmacy/items?search=${encodeURIComponent(form.barcode)}`)
        .then(r => r.json())
        .then(data => {
          const match = Array.isArray(data) ? data.find((i:any) => i.barcode === form.barcode) : null;
          if (match) {
            set("name", match.name);
            set("genericname", match.genericName ?? "");
            set("itemcode", match.itemcode ?? "");
            set("manufacturer", match.manufacturer ?? "");
          }
          setScanning(false);
        })
        .catch(() => setScanning(false));
    }
  };

  return (
    <div style={s.overlay}><div style={s.modal}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h3 style={{fontSize:16,fontWeight:600}}>{isEdit?"Edit Item":"Add Pharmacy Item"}</h3>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer"}}><Icon d={icons.x} size={18} color="#6b7280"/></button>
      </div>
      {error && <div style={{background:"#fee2e2",color:"#991b1b",borderRadius:8,padding:"8px 12px",fontSize:13,marginBottom:12}}>{error}</div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>

        {/* Barcode with scan support */}
        <div style={{gridColumn:"1/-1",...s.fgroup}}>
          <label style={s.label}>Barcode <span style={{fontSize:11,color:"#6b7280",fontWeight:400}}>(scan or type — press Enter to auto-fill)</span></label>
          <div style={{position:"relative",display:"flex",alignItems:"center"}}>
            <input style={{...s.input,paddingRight:80}} value={form.barcode}
              onChange={e=>set("barcode",e.target.value)}
              onKeyDown={handleBarcodeKey}
              placeholder="Scan barcode or type manually..."/>
            {scanning && <span style={{position:"absolute",right:10,fontSize:11,color:"#6366f1",fontWeight:600}}>Searching...</span>}
          </div>
          <div style={{fontSize:11,color:"#6b7280",marginTop:3}}>💡 Connect a USB barcode scanner and scan the product. Fields will auto-fill if item exists.</div>
        </div>

        <div style={s.fgroup}><label style={s.label}>Item Name *</label><input style={s.input} value={form.name} onChange={e=>set("name",e.target.value)}/></div>
        <div style={s.fgroup}><label style={s.label}>Item Code *</label><input style={s.input} value={form.itemcode} onChange={e=>set("itemcode",e.target.value)} placeholder="e.g. ITM-001"/></div>

        <div style={s.fgroup}><label style={s.label}>Item Type</label>
          <select style={s.input} value={form.itemtype} onChange={e=>set("itemtype",e.target.value)}>
            {ITEM_TYPES.map(t=><option key={t} value={t}>{t.replace(/_/g," ").replace(/\w/g,c=>c.toUpperCase())}</option>)}
          </select>
        </div>
        <div style={s.fgroup}><label style={s.label}>Unit of Measure</label>
          <select style={s.input} value={form.uom} onChange={e=>set("uom",e.target.value)}>
            {["piece","bottle","tube","box","pack","sachet","ml","g","kg","strip"].map(u=><option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div style={{...s.fgroup,position:"relative"}}><label style={s.label}>Manufacturer *</label>
          <MfgSearchInput value={form.manufacturer} manufacturers={manufacturers??[]} onChange={v=>set("manufacturer",v)}/>
        </div>
        <div style={s.fgroup}><label style={s.label}>Generic / Brand Name</label><input style={s.input} value={form.genericname} onChange={e=>set("genericname",e.target.value)}/></div>

        {/* Pricing — fixed only */}
        <div style={{gridColumn:"1/-1",borderTop:"1px solid #f3f4f6",paddingTop:12,marginTop:4}}>
          <div style={{fontSize:12,fontWeight:600,color:"#374151",marginBottom:10}}>💰 Pricing</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={s.fgroup}><label style={s.label}>Purchase Price (Cost)</label>
              <input type="number" step="0.01" style={s.input} value={form.unit_cost} onChange={e=>set("unit_cost",e.target.value)} placeholder="0.00"/>
            </div>
            <div style={s.fgroup}><label style={s.label}>Selling Price</label>
              <input type="number" step="0.01" style={s.input} value={form.selling_price} onChange={e=>set("selling_price",e.target.value)} placeholder="0.00"/>
            </div>
            {form.selling_price && parseFloat(form.selling_price) > 0 && form.unit_cost && parseFloat(form.unit_cost) > 0 && (
              <div style={{gridColumn:"1/-1",padding:"8px 12px",background:"#f0fdf4",borderRadius:6,fontSize:12,color:"#16a34a"}}>
                Margin: <strong>${(parseFloat(form.selling_price)-parseFloat(form.unit_cost)).toFixed(2)}</strong>
                {" "}({(((parseFloat(form.selling_price)-parseFloat(form.unit_cost))/parseFloat(form.unit_cost))*100).toFixed(1)}%)
              </div>
            )}
          </div>
        </div>

        {/* Stock levels — min and max only */}
        <div style={s.fgroup}><label style={s.label}>Min Stock Level</label><input type="number" style={s.input} value={form.min_level} onChange={e=>set("min_level",e.target.value)}/></div>
        <div style={s.fgroup}><label style={s.label}>Max Stock Level</label><input type="number" style={s.input} value={form.max_level} onChange={e=>set("max_level",e.target.value)}/></div>

        <div style={{gridColumn:"1/-1",...s.fgroup}}><label style={s.label}>Description</label><input style={s.input} value={form.description} onChange={e=>set("description",e.target.value)}/></div>

        <div style={{gridColumn:"1/-1",...s.fgroup}}>
          <label style={s.label}>Storage Location / Shelf</label>
          <select style={s.input} value={form.storage_location_id} onChange={e=>set("storage_location_id",e.target.value)}>
            <option value="">— None —</option>
            {storageLocations.map((loc:any)=>(
              <option key={loc.id} value={loc.id}>
                {loc.name}{loc.location ? ` • ${loc.location}` : ""}{loc.type ? ` [${loc.type}]` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
        <button onClick={onClose} style={{...s.btn("ghost"),border:"1px solid #e5e7eb"}}>Cancel</button>
        <button onClick={handleSave} disabled={loading} style={s.btn("purple")}>{loading?"Saving...":isEdit?"Save Changes":"Add Item"}</button>
      </div>
    </div></div>
  );
}

// ── Confirm Modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ item, onClose, onSuccess }: { item: any; onClose: ()=>void; onSuccess: ()=>void }) {
  const [loading, setLoading] = useState(false);
  const handleDelete = async () => { setLoading(true); await fetch(`/api/pharmacy/items/${item.id}`,{method:"DELETE"}); onSuccess(); onClose(); };
  return (
    <div style={s.overlay}><div style={{...s.modal,width:420}}>
      <h3 style={{fontSize:15,fontWeight:600,marginBottom:8}}>Deactivate Item</h3>
      <p style={{fontSize:13,color:"#6b7280",marginBottom:20}}>Deactivate <strong>{item.name}</strong>? It will no longer appear in stock operations.</p>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{...s.btn("ghost"),border:"1px solid #e5e7eb"}}>Cancel</button>
        <button onClick={handleDelete} disabled={loading} style={s.btn("red")}>{loading?"Deactivating...":"Deactivate"}</button>
      </div>
    </div></div>
  );
}

// ── Dispense Modal ─────────────────────────────────────────────────────────────
function DispenseModal({ stores, onClose, onSuccess }: { stores: any[]; onClose: ()=>void; onSuccess: ()=>void }) {
  const [form, setForm] = useState({ storeid:"", itemid:"", quantity:"", patientref:"", prescriptionref:"", dispensedby:"", witnessedby:"", notes:"" });
  const [storeItems, setStoreItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  useEffect(() => { if (!form.storeid) return; fetch(`/api/stores/${form.storeid}`).then(r=>r.json()).then(d=>setStoreItems(d.stock??[])); }, [form.storeid]);
  const handleSave = async () => {
    if (!form.storeid||!form.itemid||!form.quantity) { setError("Store, item and quantity are required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/pharmacy/dispense",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,quantity:parseInt(form.quantity),actiontype:"DISPENSE"})});
      if (!res.ok) throw new Error((await res.json()).error);
      onSuccess(); onClose();
    } catch(e:any) { setError(e.message); } finally { setLoading(false); }
  };
  return (
    <div style={s.overlay}><div style={s.modal}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h3 style={{fontSize:16,fontWeight:600}}>Dispense Drug</h3>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer"}}><Icon d={icons.x} size={18} color="#6b7280"/></button>
      </div>
      {error && <div style={{background:"#fee2e2",color:"#991b1b",borderRadius:8,padding:"8px 12px",fontSize:13,marginBottom:12}}>{error}</div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={s.fgroup}><label style={s.label}>Store *</label>
          <select style={s.input} value={form.storeid} onChange={e=>set("storeid",e.target.value)}>
            <option value="">Select store</option>{stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div style={s.fgroup}><label style={s.label}>Item *</label>
          <select style={s.input} value={form.itemid} onChange={e=>set("itemid",e.target.value)}>
            <option value="">Select item</option>{storeItems.map(i=><option key={i.itemid} value={i.itemid}>{i.itemname}</option>)}
          </select>
        </div>
        <div style={s.fgroup}><label style={s.label}>Quantity *</label><input type="number" style={s.input} value={form.quantity} onChange={e=>set("quantity",e.target.value)}/></div>
        <div style={s.fgroup}><label style={s.label}>Patient Ref</label><input style={s.input} value={form.patientref} onChange={e=>set("patientref",e.target.value)}/></div>
        <div style={s.fgroup}><label style={s.label}>Prescription Ref</label><input style={s.input} value={form.prescriptionref} onChange={e=>set("prescriptionref",e.target.value)}/></div>
        <div style={s.fgroup}><label style={s.label}>Dispensed By</label><input style={s.input} value={form.dispensedby} onChange={e=>set("dispensedby",e.target.value)}/></div>
        <div style={{gridColumn:"1/-1",...s.fgroup}}><label style={s.label}>Witness</label><input style={s.input} value={form.witnessedby} onChange={e=>set("witnessedby",e.target.value)}/></div>
        <div style={{gridColumn:"1/-1",...s.fgroup}}><label style={s.label}>Notes</label><input style={s.input} value={form.notes} onChange={e=>set("notes",e.target.value)}/></div>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
        <button onClick={onClose} style={{...s.btn("ghost"),border:"1px solid #e5e7eb"}}>Cancel</button>
        <button onClick={handleSave} disabled={loading} style={s.btn("purple")}>{loading?"Dispensing...":"Dispense"}</button>
      </div>
    </div></div>
  );
}

// ── View Item Modal ────────────────────────────────────────────────────────────
function ViewItemModal({ item, onClose, addToShopList, showToast }: { item: any; onClose: ()=>void; addToShopList: (item: any, qty?: number)=>void; showToast: (msg: string)=>void }) {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch(`/api/pharmacy/items/${item.id}/batches`)
      .then(r=>r.json())
      .then(batchData => {
        setBatches(Array.isArray(batchData)?batchData:[]);
        setLoading(false);
      });
  }, [item.id]);

  // Get unique warehouse locations from batches
  const warehouseLocations = [...new Set(batches.map(b => b.warehouseName).filter(Boolean))];
  
  return (
    <div style={s.overlay}><div style={{...s.modal,width:500}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h3 style={{fontSize:16,fontWeight:600,margin:0}}>Item Details</h3>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer"}}><Icon d={icons.x} size={18} color="#6b7280"/></button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        {[["Name",item.name],["Generic",item.genericName??"—"],["Code",item.itemcode],["Type",item.itemType],["UOM",item.uom],["Stock",item.totalStock],["Purchase Price",item.unitCost?`$${parseFloat(item.unitCost).toFixed(2)}`:"—"],["Selling Price",item.sellingPrice?`$${parseFloat(item.sellingPrice).toFixed(2)}`:"—"],["Supplier",item.supplierName??"—"],["Manufacturer",item.manufacturer??"—"]].map(([label,value])=>(
          <div key={label as string} style={{background:"#f9fafb",borderRadius:8,padding:"8px 12px"}}>
            <div style={{fontSize:11,color:"#6b7280",marginBottom:2}}>{label}</div>
            <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{value}</div>
          </div>
        ))}
        <div style={{gridColumn:"1/-1",background:"#f9fafb",borderRadius:8,padding:"8px 12px"}}>
          <div style={{fontSize:11,color:"#6b7280",marginBottom:4,fontWeight:600}}>Warehouse Locations</div>
          {loading ? (
            <div style={{fontSize:12,color:"#6b7280"}}>Loading...</div>
          ) : warehouseLocations.length > 0 ? (
            <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>
              {warehouseLocations.join(", ")}
            </div>
          ) : (
            <div style={{fontSize:12,color:"#6b7280"}}>No warehouse data</div>
          )}
        </div>
        {item.storageLocationName && (
          <div style={{gridColumn:"1/-1",background:"#f0fdf4",borderRadius:8,padding:"8px 12px"}}>
            <div style={{fontSize:11,color:"#059669",marginBottom:6,fontWeight:600}}>Storage Location / Shelf</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12}}>
              <div>
                <span style={{fontWeight:600,color:"#111827"}}>{item.storageLocationName}</span>
                {item.storageLocation && <span style={{color:"#6b7280",marginLeft:6}}>• {item.storageLocation}</span>}
              </div>
              <span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"#dcfce7",color:"#166534",fontWeight:600}}>
                {item.storageType || "shelf"}
              </span>
            </div>
          </div>
        )}
      </div>
      <div style={{borderTop:"1px solid #f3f4f6",paddingTop:16}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Add to Shop List</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{flex:1}}>
            <label style={s.label}>Quantity</label>
            <input type="number" min={1} defaultValue={1} id="viewItemQty" style={{...s.input,width:100}}/>
          </div>
          <button onClick={()=>{
            const qty = parseInt((document.getElementById("viewItemQty") as HTMLInputElement)?.value)||1;
            addToShopList(item, qty);
            onClose();
            showToast(`${item.name} added to shop list`);
          }} style={{...s.btn("purple"),marginTop:16,display:"flex",alignItems:"center",gap:6}}>
            <Icon d={icons.plus} size={13} color="#fff"/> Add to Cart
          </button>
        </div>
      </div>
    </div></div>
  );
}

// ── Batch Modal ────────────────────────────────────────────────────────────────
function BatchModal({ item, onClose }: { item: any; onClose: ()=>void }) {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`/api/pharmacy/items/${item.id}/batches`).then(r=>r.json()).then(d=>{setBatches(Array.isArray(d)?d:[]);setLoading(false);}); }, [item.id]);
  function batchStatus(b: any) {
    if (!b.expiryDate) return { label:"No Expiry", bg:"#f3f4f6", color:"#374151" };
    const days = Math.ceil((new Date(b.expiryDate).getTime()-Date.now())/86400000);
    if (days<=0) return {label:"Expired",bg:"#fee2e2",color:"#991b1b"};
    if (days<=30) return {label:`${days}d`,bg:"#fee2e2",color:"#991b1b"};
    if (days<=90) return {label:`${days}d`,bg:"#fef3c7",color:"#92400e"};
    return {label:"OK",bg:"#d1fae5",color:"#065f46"};
  }
  return (
    <div style={s.overlay}><div style={{...s.modal,width:780}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h3 style={{fontSize:16,fontWeight:600,margin:0}}>{item.name}</h3>
          <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{item.itemcode} · {item.uom} · Batch Viewer (FEFO order)</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer"}}><Icon d={icons.x} size={18} color="#6b7280"/></button>
      </div>
      {loading ? <div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>Loading batches...</div>
      : batches.length===0 ? <div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>No batches found</div>
      : <>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Batch No","Qty","Purchase Price","Selling Price","Expiry","Warehouse","Status"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>
            {batches.map(b=>{const st=batchStatus(b); return (
              <tr key={b.id}>
                <td style={{...s.td,fontFamily:"monospace",fontWeight:600}}>{b.batchNumber??"—"}</td>
                <td style={{...s.td,fontWeight:700,fontSize:15}}>{b.quantity}</td>
                <td style={s.td}>{b.unitCost?`$${parseFloat(b.unitCost).toFixed(2)}`:"—"}</td>
                <td style={{...s.td,color:"#16a34a",fontWeight:600}}>{b.sellingPrice?`$${parseFloat(b.sellingPrice).toFixed(2)}`:"—"}</td>
                <td style={s.td}>{b.expiryDate?new Date(b.expiryDate).toLocaleDateString():"—"}</td>
                <td style={{...s.td,fontSize:12}}>{b.warehouseName??"—"}</td>
                <td style={s.td}><span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:st.bg,color:st.color}}>{st.label}</span></td>
              </tr>
            );})}
          </tbody>
        </table>
        <div style={{marginTop:16,padding:"12px 16px",background:"#f9fafb",borderRadius:8,display:"flex",gap:24}}>
          <div><span style={{fontSize:11,color:"#6b7280"}}>Total Qty</span><div style={{fontWeight:700,fontSize:16}}>{batches.reduce((s,b)=>s+(b.quantity||0),0)}</div></div>
          <div><span style={{fontSize:11,color:"#6b7280"}}>Batches</span><div style={{fontWeight:700,fontSize:16}}>{batches.length}</div></div>
          <div><span style={{fontSize:11,color:"#6b7280"}}>Expired</span><div style={{fontWeight:700,fontSize:16,color:"#dc2626"}}>{batches.filter(b=>b.expiryDate&&new Date(b.expiryDate)<new Date()).length}</div></div>
          <div><span style={{fontSize:11,color:"#6b7280"}}>Expiring &lt;90d</span><div style={{fontWeight:700,fontSize:16,color:"#d97706"}}>{batches.filter(b=>{if(!b.expiryDate)return false;const d=Math.ceil((new Date(b.expiryDate).getTime()-Date.now())/86400000);return d>0&&d<=90;}).length}</div></div>
        </div>
      </>}
    </div></div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PharmacyPage({ initialStockFilter }: { initialStockFilter?: "all" | "instock" | "lowstock" | "outofstock" } = {}) {
  const params = useParams();
  const workspaceid = params.workspaceid as string;
  
  console.log('[PharmacyInventoryPage] Using workspace ID:', workspaceid);

  type Tab = "items"|"stock"|"history"|"shoplist"|"suppliers"|"manufacturers"|"storage"|"orders"|"uom"|"reports";
  const [tab, setTab] = useState<Tab>("items");
  const [items, setItems] = useState<any[]>([]);
  const [dispenses, setDispenses] = useState<any[]>([]);
  const [controlled, setControlled] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [pharmaWh, setPharmaWh] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "instock" | "lowstock" | "outofstock">(initialStockFilter || "all");
  const [page, setPage] = useState(1);
  
  // Update stock filter when prop changes
  useEffect(() => {
    if (initialStockFilter) {
      setStockFilter(initialStockFilter);
    }
  }, [initialStockFilter]);
  const PAGE_SIZE = 15;
  const [history, setHistory] = useState<any[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTypeFilter, setHistoryTypeFilter] = useState("ALL");
  const HISTORY_SIZE = 15;
  const [showAddItem, setShowAddItem] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [viewItem, setViewItem]       = useState<any>(null);
  const [batchItem, setBatchItem] = useState<any>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddDrug, setShowAddDrug] = useState(false);
  const [drugPrefill, setDrugPrefill] = useState<any>(null);
  const [toast, setToast] = useState("");
  // Shop list
  const [shopList, setShopList] = useState<any[]>([]);
  const [shopQtys, setShopQtys] = useState<Record<string,number>>({});
  const [shopLoading, setShopLoading] = useState(false);
  const [shopSaving, setShopSaving] = useState(false);
  const [shopCreatedBy, setShopCreatedBy] = useState("");
  const [shopSupplierFilter, setShopSupplierFilter] = useState("");
  const [cartItems, setCartItems]       = useState<any[]>([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [cartSupplier, setCartSupplier] = useState("");
  const [shopSearch, setShopSearch] = useState("");
  const [shopSearchResults, setShopSearchResults] = useState<any[]>([]);
  const [shopSearching, setShopSearching] = useState(false);
  const [manualShopItems, setManualShopItems] = useState<any[]>([]);
  // Suppliers
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [manufacturers, setManufacturers]   = useState<any[]>([]);
  const [mfgSearch, setMfgSearch]           = useState("");
  const [mfgModal, setMfgModal]             = useState<"add"|"edit"|null>(null);
  const [mfgRow, setMfgRow]                 = useState<any>(null);
  const [deleteMfg, setDeleteMfg]           = useState<any>(null);
  const [mfgForm, setMfgForm]               = useState({ name:"", code:"", country:"", contactname:"", phone:"", email:"", address:"", website:"", license_number:"", product_types:"", notes:"" });
  const [storageLocations, setStorageLocations] = useState<any[]>([]);
  const [storageModal, setStorageModal]         = useState<"add"|"edit"|null>(null);
  const [storageRow, setStorageRow]             = useState<any>(null);
  const [deleteStorage, setDeleteStorage]       = useState<any>(null);
  const [storageForm, setStorageForm]           = useState({ name:"", location:"", type:"shelf", temperature:"", notes:"" });
  const [storageSearch, setStorageSearch]       = useState("");
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name:"", contactPerson:"", email:"", phone:"", address:"" });
  const [editSupplier, setEditSupplier] = useState<any>(null);
  const [viewSupplier, setViewSupplier] = useState<any>(null);
  const [supplierItems, setSupplierItems] = useState<any[]>([]);
  const [supplierItemsLoading, setSupplierItemsLoading] = useState(false);
  // Expiry alerts
  // Adjustments
  // Quarantine
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveForm, setReceiveForm]           = useState({ itemId:"", batchNumber:"", quantity:"", unitCost:"", sellingPrice:"", expiryDate:"", manufactureDate:"", notes:"" });
  const [receivingLoading, setReceivingLoading] = useState(false);
  const [uomConversions, setUomConversions]     = useState<any[]>([]);
  const [uomModal, setUomModal]                 = useState<"add"|"edit"|null>(null);
  const [uomRow, setUomRow]                     = useState<any>(null);
  const [uomForm, setUomForm]                   = useState({ item_id:"", from_uom:"", to_uom:"", factor:"" });
  const [pharmReports, setPharmReports]         = useState<any[]>([]);
  const [reportType, setReportType]             = useState<"stock"|"consumption">("stock");
  const [reportLoading, setReportLoading]       = useState(false);
  const [orders, setOrders]                   = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading]     = useState(false);
  const [orderStatus, setOrderStatus]         = useState("PENDING");

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(""),3000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes,dRes,cRes,sRes,wRes] = await Promise.all([
        fetch(`/api/pharmacy/items?search=${encodeURIComponent(search)}&workspaceId=${workspaceid}`),
        fetch("/api/pharmacy/dispense"),
        fetch("/api/pharmacy/controlled"),
        fetch("/api/stores"),
        fetch("/api/warehouses"),
      ]);
      const [iData,dData,cData,sData,wData] = await Promise.all([iRes.json(),dRes.json(),cRes.json(),sRes.json(),wRes.json()]);
      setItems(Array.isArray(iData)?iData:[]);
      setDispenses(Array.isArray(dData)?dData:[]);
      setControlled(Array.isArray(cData)?cData:[]);
      setStores(Array.isArray(sData)?sData:[]);
      const allWh = Array.isArray(wData)?wData:(wData.warehouses??[]);
      setPharmaWh(allWh.filter((w:any)=>w.warehousetype==="pharmacy"||w.warehouse_type==="pharmacy"));
    } finally { setLoading(false); }
    if (tab==="history") {
      fetch(`/api/pharmacy/history?page=${historyPage}&limit=${HISTORY_SIZE}`).then(r=>r.json()).then(d=>{setHistory(d.rows??[]);setHistoryTotal(d.total??0);});
    }
  }, [search, tab, historyPage, workspaceid]);

  const fetchShopList = useCallback(async () => {
    setShopLoading(true);
    const res = await fetch("/api/pharmacy/shoplist");
    const data = await res.json();
    const list = Array.isArray(data)?data:[];
    setShopList(list);
    const qtys: Record<string,number> = {};
    list.forEach((i:any)=>{ qtys[i.id]=(i.maxLevel??i.reorderLevel*2)-i.currentStock; });
    setShopQtys(q=>({...qtys,...q}));
    setShopLoading(false);
  }, []);

  const fetchSuppliers = useCallback(async () => {
    const res = await fetch(`/api/pharmacy/suppliers?search=${encodeURIComponent(supplierSearch)}`);
    const data = await res.json();
    setSuppliers(Array.isArray(data)?data:[]);
  }, [supplierSearch]);

  // Load all suppliers on mount for cart modal dropdown
  useEffect(()=>{
    fetch("/api/pharmacy/suppliers?search=").then(r=>r.json()).then(d=>setSuppliers(Array.isArray(d)?d:[]));
  },[]);

  const fetchManufacturers = useCallback(async () => {
    const res = await fetch(`/api/pharmacy/manufacturers?search=${encodeURIComponent(mfgSearch)}`);
    const data = await res.json();
    setManufacturers(Array.isArray(data)?data:[]);
  }, [mfgSearch]);

  const fetchStorage = useCallback(async () => {
    const res = await fetch("/api/pharmacy/storage");
    const data = await res.json();
    setStorageLocations(Array.isArray(data)?data:[]);
  }, []);







  const fetchUom = useCallback(async () => {
    const res = await fetch("/api/uom");
    const data = await res.json();
    setUomConversions(Array.isArray(data)?data:[]);
  }, []);

  const fetchPharmReport = useCallback(async () => {
    setReportLoading(true);
    const res = await fetch(`/api/reports?type=${reportType}&category=pharmacy`);
    const data = await res.json();
    setPharmReports(Array.isArray(data)?data:(data.rows??[]));
    setReportLoading(false);
  }, [reportType]);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    const res = await fetch(`/api/pharmacy/shoporders?status=${orderStatus}`);
    const data = await res.json();
    setOrders(Array.isArray(data)?data:[]);
    setOrdersLoading(false);
  }, [orderStatus]);




  useEffect(()=>{fetchAll();},[fetchAll]);
  useEffect(()=>{fetchSuppliers();},[fetchSuppliers]);
  useEffect(()=>{if(tab==="shoplist")fetchShopList();},[tab,fetchShopList]);
  useEffect(()=>{if(tab==="suppliers")fetchSuppliers();},[tab,supplierSearch,fetchSuppliers]);
  useEffect(()=>{fetchManufacturers();},[fetchManufacturers]);
  useEffect(()=>{if(tab==="manufacturers")fetchManufacturers();},[tab,mfgSearch,fetchManufacturers]);
  useEffect(()=>{if(tab==="orders")fetchOrders();},[tab,orderStatus,fetchOrders]);
  useEffect(()=>{fetchStorage();},[fetchStorage]);
  useEffect(()=>{if(tab==="storage")fetchStorage();},[tab,fetchStorage]);
  useEffect(()=>{if(tab==="uom")fetchUom();},[tab,fetchUom]);
  useEffect(()=>{if(tab==="reports")fetchPharmReport();},[tab,reportType,fetchPharmReport]);

  const searchShopItems = async (q: string) => {
    setShopSearch(q);
    if (!q.trim()) { setShopSearchResults([]); return; }
    setShopSearching(true);
    const res = await fetch(`/api/pharmacy/items?search=${encodeURIComponent(q)}`);
    const data = await res.json();
    setShopSearchResults(Array.isArray(data)?data.slice(0,8):[]);
    setShopSearching(false);
  };

  const addToShopList = (item: any, qty: number = 1) => {
    if (shopList.find(i=>i.id===item.id)||manualShopItems.find(i=>i.id===item.id)) {
      setShopQtys(q=>({...q,[item.id]:(q[item.id]??0)+qty}));
      showToast(`Updated qty for ${item.name}`); return;
    }
    const supplierName = item.supplierName ?? item.supplier ?? "No Supplier";
    setManualShopItems(m=>[...m,{ id:item.id, name:item.name, genericName:item.genericName??item.generic_Name, itemcode:item.itemcode, uom:item.uom, currentStock:item.totalStock, reorderLevel:item.reorderLevel, maxLevel:item.maxLevel, lastUnitCost:item.unitCost, supplierName }]);
    setShopQtys(q=>({...q,[item.id]:qty}));
    setShopSearch(""); setShopSearchResults([]);
  };

  const removeFromShopList = (id: string) => {
    setManualShopItems(m=>m.filter(i=>i.id!==id));
    setShopQtys(q=>{const n={...q};delete n[id];return n;});
  };

  const exportShopListCSV = () => {
    const allItems = [...shopList,...manualShopItems];
    const rows = allItems.filter(i=>(shopQtys[i.id]??0)>0);
    if (!rows.length) { showToast("No items to export"); return; }
    const NL = String.fromCharCode(10);
    const headers = ["Item Name","Generic Name","Item Code","UOM","Current Stock","Order Qty","Unit Cost","Est. Total"].join(",");
    const dataRows = rows.map(i=>[`"${i.name}"`,`"${i.genericName??""}"`,i.itemcode,i.uom,i.currentStock,shopQtys[i.id]??0,i.lastUnitCost??0,((shopQtys[i.id]??0)*parseFloat(i.lastUnitCost??0)).toFixed(2)].join(","));
    const csv = [headers,...dataRows].join(NL);
    const blob = new Blob([csv], {type:"text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pharmacy-order-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    showToast("CSV downloaded!");
  };

  const printShopList = () => {
    const allItems = [...shopList,...manualShopItems];
    const rows = allItems.filter(i=>(shopQtys[i.id]??0)>0);
    if (!rows.length) { showToast("No items to print"); return; }
    const total = rows.reduce((sum,i)=>sum+(shopQtys[i.id]??0)*parseFloat(i.lastUnitCost??0),0);
    const html = `
      <html><head><title>Pharmacy Order — ${new Date().toLocaleDateString()}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
      h2{color:#6366f1}table{width:100%;border-collapse:collapse}
      th{background:#6366f1;color:#fff;padding:8px;text-align:left}
      td{padding:7px 8px;border-bottom:1px solid #e5e7eb}
      .total{font-weight:bold;font-size:14px;text-align:right;margin-top:16px}
      @media print{button{display:none}}</style></head>
      <body>
        <h2>Pharmacy Order Request</h2>
        <p>Date: ${new Date().toLocaleDateString()} · Generated by PharmaDash</p>
        <table>
          <thead><tr><th>#</th><th>Item</th><th>Code</th><th>UOM</th><th>Current Stock</th><th>Order Qty</th><th>Unit Cost</th><th>Total</th></tr></thead>
          <tbody>
            ${rows.map((i,idx)=>`<tr><td>${idx+1}</td><td><b>${i.name}</b>${i.genericName?`<br/><small>${i.genericName}</small>`:""}</td><td>${i.itemcode}</td><td>${i.uom}</td><td>${i.currentStock}</td><td><b>${shopQtys[i.id]??0}</b></td><td>$${parseFloat(i.lastUnitCost??0).toFixed(2)}</td><td>$${((shopQtys[i.id]??0)*parseFloat(i.lastUnitCost??0)).toFixed(2)}</td></tr>`).join("")}
          </tbody>
        </table>
        <div class="total">Total Estimated Cost: $${total.toFixed(2)}</div>
        <br/><p style="color:#9ca3af;font-size:10px">PharmaDash Inventory System · ${window.location.origin}</p>
      </body></html>`;
    const w = window.open("","_blank","width=900,height=700");
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  const emailShopList = () => {
    const allItems = [...shopList,...manualShopItems];
    const rows = allItems.filter(i=>(shopQtys[i.id]??0)>0);
    if (!rows.length) { showToast("No items to email"); return; }
    const total = rows.reduce((sum,i)=>sum+(shopQtys[i.id]??0)*parseFloat(i.lastUnitCost??0),0);
    const NL = String.fromCharCode(10);
    const lines = [
      "Pharmacy Order Request — " + new Date().toLocaleDateString(),
      "",
      ...rows.map((i,idx)=>(idx+1)+". "+i.name+" ("+i.itemcode+") — Qty: "+(shopQtys[i.id]??0)+" "+i.uom+" — $"+((shopQtys[i.id]??0)*parseFloat(i.lastUnitCost??0)).toFixed(2)),
      "",
      "Total Estimated Cost: $"+total.toFixed(2),
      "",
      "Generated by PharmaDash",
    ];
    const body = encodeURIComponent(lines.join(NL));
    const subject = encodeURIComponent("Pharmacy Order — " + new Date().toLocaleDateString());
    window.location.href = "mailto:?subject="+subject+"&body="+body;
    showToast("Email client opened!");
  };

  const saveShopList = async () => {
    setShopSaving(true);
    const allItems = [...shopList,...manualShopItems];
    const items = allItems.filter(i=>(shopQtys[i.id]??0)>0).map(i=>({itemId:i.id,quantity:shopQtys[i.id],unitCost:i.lastUnitCost}));
    if (!items.length) { showToast("No items to save"); setShopSaving(false); return; }
    const res = await fetch("/api/pharmacy/shoplist",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items})});
    const data = await res.json();
    if (data.prNumber) { showToast(`Order saved: ${data.prNumber}`); setManualShopItems([]); }
    setShopSaving(false);
  };

  const saveSupplier = async () => {
    if (!supplierForm.name.trim()) return;
    const res = await fetch("/api/pharmacy/suppliers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(supplierForm)});
    if (res.ok) { setShowAddSupplier(false); setSupplierForm({name:"",contactPerson:"",email:"",phone:"",address:""}); fetchSuppliers(); showToast("Supplier added!"); }
  };

  const updateSupplier = async () => {
    if (!editSupplier) return;
    await fetch("/api/pharmacy/suppliers",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(editSupplier)});
    setEditSupplier(null); fetchSuppliers(); showToast("Supplier updated!");
  };

  const deleteSupplier = async (id: string) => {
    await fetch("/api/pharmacy/suppliers",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    fetchSuppliers(); showToast("Supplier deactivated");
  };

  const loadSupplierItems = async (supplier: any) => {
    setViewSupplier(supplier); setSupplierItemsLoading(true);
    const res = await fetch(`/api/pharmacy/suppliers/${supplier.id}/items`);
    const data = await res.json();
    setSupplierItems(Array.isArray(data)?data:[]); setSupplierItemsLoading(false);
  };

  // Apply type filter
  let filteredItems = items.filter(i=>typeFilter==="all"||i.itemType===typeFilter);
  
  // Apply stock filter
  if (stockFilter === "lowstock") {
    filteredItems = filteredItems.filter(i=>parseInt(i.totalStock)>0&&parseInt(i.totalStock)<=parseInt(i.reorderLevel??0));
  } else if (stockFilter === "outofstock") {
    filteredItems = filteredItems.filter(i=>parseInt(i.totalStock)===0);
  } else if (stockFilter === "instock") {
    filteredItems = filteredItems.filter(i=>parseInt(i.totalStock)>parseInt(i.reorderLevel??0));
  }
  
  const totalItems = items.length;
  const lowStock = items.filter(i=>parseInt(i.totalStock)>0&&parseInt(i.totalStock)<=parseInt(i.reorderLevel??0)).length;
  const outOfStock = items.filter(i=>parseInt(i.totalStock)===0).length;
  const controlledCt = items.filter(i=>i.controlled).length;

  console.log('[PharmacyInventoryPage] Calculated stats:', { totalItems, lowStock, outOfStock, itemsCount: items.length });

  const tabLabels: Record<Tab,string> = {
    items:`Items (${items.length})`,
    stock:"Stock",
    history:"History",
    shoplist:`🛒 Shop List`,
    suppliers:"Suppliers",
    manufacturers:"🏭 Manufacturers",
    storage:"📍 Storage",
    orders:"📋 Orders",
    uom:"🔄 UOM",
    reports:"📊 Reports",
  };

  return (
    <div style={s.page}>
      <style>{`* { box-sizing: border-box; } input, select { color: #111827 !important; } tr:hover td { background: #f9fafb; }`}</style>

      {/* Header */}
      <div style={s.header}>
        <span style={{fontSize:14,fontWeight:700,color:"#111827"}}>Pharmacy Inventory</span>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          <button onClick={fetchAll} style={{...s.btn("ghost"),border:"1px solid #e5e7eb",display:"flex",alignItems:"center",gap:5}}><Icon d={icons.refresh} size={13} color="#374151"/></button>
          <button onClick={()=>{setDrugPrefill(null);setShowAddDrug(true);}} style={{...s.btn("purple"),display:"flex",alignItems:"center",gap:6}}><Icon d={icons.pill} size={13} color="#fff"/> Add Medicine</button>

        </div>
      </div>

      <div style={{...s.content, marginTop:8}}>
        {/* Summary cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
          {[
            {label:"Total Items",value:totalItems,color:"#16a34a",bg:"#dcfce7",filter:"all" as const},
            {label:"Low Stock",value:lowStock,color:"#f59e0b",bg:"#fef3c7",filter:"lowstock" as const},
            {label:"Out of Stock",value:outOfStock,color:"#ef4444",bg:"#fee2e2",filter:"outofstock" as const}
          ].map(m=>(
            <div 
              key={m.label} 
              style={{background:m.bg,borderRadius:10,padding:"14px 18px",cursor:"pointer",border:stockFilter===m.filter?`2px solid ${m.color}`:"2px solid transparent",transition:"all 0.2s"}}
              onClick={()=>setStockFilter(m.filter)}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
              onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}
            >
              <div style={{fontSize:11,fontWeight:600,color:m.color,marginBottom:4}}>{m.label}</div>
              <div style={{fontSize:28,fontWeight:700,color:"#111827"}}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          {(Object.keys(tabLabels) as Tab[]).map(t=>(
            <button key={t} style={s.tab(tab===t)} onClick={()=>setTab(t)}>{tabLabels[t]}</button>
          ))}
        </div>

        {/* ITEMS TAB */}
        {tab==="items" && (
          <div style={s.card}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",gap:12,alignItems:"center",flexWrap:"wrap" as const}}>
              <div style={{position:"relative",display:"flex",alignItems:"center"}}>
                <div style={{position:"absolute",left:10,pointerEvents:"none"}}><Icon d={icons.search} size={13} color="#9ca3af"/></div>
                <input placeholder="Search name, code, generic, supplier..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} style={{...s.input,width:280,paddingLeft:30}}/>
              </div>
              
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <label style={{fontSize:12,fontWeight:600,color:"#6b7280"}}>Item Type:</label>
                <select 
                  value={typeFilter} 
                  onChange={e=>{setTypeFilter(e.target.value);setPage(1);}}
                  style={{...s.input,width:150,paddingRight:30,cursor:"pointer"}}
                >
                  <option value="all">All ({items.length})</option>
                  <option value="drug">Drug</option>
                  <option value="device">Device</option>
                  <option value="cosmetic">Cosmetic</option>
                  <option value="cream">Cream</option>
                  <option value="supplement">Supplement</option>
                  <option value="consumable">Consumable</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <label style={{fontSize:12,fontWeight:600,color:"#6b7280"}}>Stock Status:</label>
                <select 
                  value={stockFilter} 
                  onChange={e=>{setStockFilter(e.target.value as any);setPage(1);}}
                  style={{...s.input,width:150,cursor:"pointer"}}
                >
                  <option value="all">All Stock</option>
                  <option value="instock">In Stock</option>
                  <option value="lowstock">Low Stock</option>
                  <option value="outofstock">Out of Stock</option>
                </select>
              </div>

              <span style={{marginLeft:"auto",fontSize:12,color:"#9ca3af"}}>{filteredItems.length} items</span>
            </div>
            {loading?<div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>Loading...</div>
            :filteredItems.length===0?<div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>No items found.</div>
            :<>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>{["Item","Code","Manufacturer","Packaging","Location","Type","UOM","Stock","Expiry Date","Registered","Purchase Price","Selling Price","Actions"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredItems.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE).map(item=>{
                      const sc=stockColor(parseInt(item.totalStock),parseInt(item.reorderLevel??0));
                      const nearestExpiry = item.nearestExpiry ? new Date(item.nearestExpiry) : null;
                      const isExpired = nearestExpiry && nearestExpiry < new Date();
                      const daysToExpiry = nearestExpiry ? Math.ceil((nearestExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                      return (
                        <tr key={item.id}>
                          <td style={{...s.td,minWidth:160}}>
                            <div style={{fontWeight:600}}>{item.name}</div>
                            {(item.genericName??item.generic_Name)&&<div style={{fontSize:11,color:"#9ca3af"}}>{item.genericName??item.generic_Name}</div>}
                          </td>
                          <td style={{...s.td,fontFamily:"monospace",fontSize:11,color:"#6b7280"}}>{item.itemcode}</td>
                          <td style={{...s.td,fontSize:12,color:"#374151"}}>{item.manufacturer??"—"}</td>
                          <td style={s.td}>
                            {item.packagingType || item.packageSize || item.tabletsPerPack ? (
                              <div>
                                {item.packagingType && <div style={{fontSize:11,fontWeight:600,color:"#374151"}}>{item.packagingType}</div>}
                                {item.packageSize && <div style={{fontSize:11,color:"#6b7280"}}>{item.packageSize}</div>}
                                {item.tabletsPerPack && <div style={{fontSize:10,color:"#9ca3af"}}>{item.tabletsPerPack} units/pack</div>}
                              </div>
                            ) : "—"}
                          </td>
                          <td style={{...s.td,fontSize:11,color:"#6b7280",maxWidth:120}}>
                            {pharmaWh.length > 0 ? (
                              <div style={{fontSize:11}}>
                                {pharmaWh.slice(0, 2).map((wh: any, idx: number) => (
                                  <div key={idx} style={{marginBottom:2}}>
                                    <div style={{fontWeight:600,color:"#374151"}}>{wh.name}</div>
                                  </div>
                                ))}
                                {pharmaWh.length > 2 && <div style={{fontSize:10,color:"#9ca3af"}}>+{pharmaWh.length - 2} more</div>}
                              </div>
                            ) : "—"}
                            {item.storageLocationName && (
                              <div style={{marginTop:6,paddingTop:6,borderTop:"1px solid #e5e7eb"}}>
                                <div style={{fontSize:10,color:"#059669",fontWeight:600}}>📍 {item.storageLocationName}</div>
                                {item.storageLocation && <div style={{fontSize:9,color:"#6b7280",marginTop:2}}>{item.storageLocation}</div>}
                              </div>
                            )}
                          </td>
                          <td style={s.td}><span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:"#f3f4f6",color:"#374151"}}>{item.itemType}</span></td>
                          <td style={s.td}>{item.uom}</td>
                          <td style={s.td}><span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:sc.bg,color:sc.color}}>{item.totalStock}</span></td>
                          <td style={{...s.td,fontSize:11}}>
                            {nearestExpiry ? (
                              <div>
                                <div style={{color: isExpired ? "#dc2626" : daysToExpiry !== null && daysToExpiry <= 90 ? "#f59e0b" : "#374151", fontWeight: isExpired ? 600 : 400}}>
                                  {nearestExpiry.toLocaleDateString()}
                                </div>
                                {daysToExpiry !== null && (
                                  <div style={{fontSize:10,color: isExpired ? "#dc2626" : daysToExpiry <= 30 ? "#dc2626" : daysToExpiry <= 90 ? "#f59e0b" : "#9ca3af"}}>
                                    {isExpired ? "EXPIRED" : `${daysToExpiry}d left`}
                                  </div>
                                )}
                              </div>
                            ) : "—"}
                          </td>
                          <td style={{...s.td,fontSize:11,color:"#6b7280"}}>
                            {item.createdAt ? (
                              <div>
                                <div>{new Date(item.createdAt).toLocaleDateString()}</div>
                                <div style={{fontSize:10,color:"#9ca3af"}}>{new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                              </div>
                            ) : "—"}
                          </td>
                          <td style={s.td}>{item.unitCost?`$${parseFloat(item.unitCost).toFixed(2)}`:"—"}</td>
                          <td style={s.td}>{item.sellingPrice?<span style={{color:"#16a34a",fontWeight:600}}>${parseFloat(item.sellingPrice).toFixed(2)}</span>:"—"}</td>
                          <td style={s.td}>
                            <div style={{display:"flex",gap:5}}>
                              <button onClick={()=>setBatchItem(item)} title="View batches" style={{background:"#f0fdf4",border:"none",borderRadius:6,padding:"5px 8px",cursor:"pointer",display:"flex",alignItems:"center"}}><Icon d={icons.layers} size={12} color="#16a34a"/></button>
                              <button onClick={()=>setViewItem(item)} style={{background:"#eff6ff",border:"none",borderRadius:6,padding:"5px 8px",cursor:"pointer",display:"flex",alignItems:"center"}} title="View Details"><Icon d={icons.eye} size={12} color="#2563eb"/></button>
                              <button onClick={()=>{addToShopList(item);showToast(`${item.name} added to cart`);setTab("shoplist");}} style={{background:"#eef2ff",border:"none",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:11,fontWeight:600,color:"#6366f1",whiteSpace:"nowrap" as const}} title="Add to Cart">🛒</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={filteredItems.length} pageSize={PAGE_SIZE} setPage={setPage}/>
            </>}
          </div>
        )}

        {/* STOCK TAB */}
        {tab==="stock" && (
          <div style={s.card}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,fontWeight:600}}>Stock Overview</span>
              <button onClick={()=>{setReceiveForm({itemId:"",batchNumber:"",quantity:"",unitCost:"",sellingPrice:"",expiryDate:"",manufactureDate:"",notes:""});setShowReceiveModal(true);}} style={{...s.btn("purple"),display:"flex",alignItems:"center",gap:6}}><Icon d={icons.plus} size={13} color="#fff"/> Receive Stock</button>
            </div>
            {items.length===0 ? <div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>No stock data</div> : <>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>{["Item","Code","UOM","Total Stock","Reserved","Available","Batches","Purchase Price","Selling Price","Reorder","Status","Edit"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {items.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE).map(item=>{
                      const avail=parseInt(item.totalStock)-parseInt(item.reservedStock??0);
                      const sc=stockColor(avail,parseInt(item.reorderLevel??0));
                      return (
                        <tr key={item.id}>
                          <td style={{...s.td,fontWeight:600}}>{item.name}</td>
                          <td style={{...s.td,fontFamily:"monospace",fontSize:11,color:"#6b7280"}}>{item.itemcode}</td>
                          <td style={s.td}>{item.uom}</td>
                          <td style={{...s.td,fontWeight:700,fontSize:15}}>{item.totalStock}</td>
                          <td style={{...s.td,color:"#d97706"}}>{item.reservedStock??0}</td>
                          <td style={{...s.td,fontWeight:700,color:sc.color,fontSize:15}}>{avail}</td>
                          <td style={s.td}>{item.batchCount}</td>
                          <td style={s.td}>{item.unitCost?`$${parseFloat(item.unitCost).toFixed(2)}`:"—"}</td>
                          <td style={{...s.td,color:"#16a34a",fontWeight:600}}>{item.sellingPrice?`$${parseFloat(item.sellingPrice).toFixed(2)}`:"—"}</td>
                          <td style={{...s.td,color:"#6b7280"}}>{item.reorderLevel??0}</td>
                          <td style={s.td}><span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:sc.bg,color:sc.color}}>{sc.label}</span></td>
                          <td style={s.td}><button onClick={()=>setEditItem(item)} style={{background:"#eff6ff",border:"none",borderRadius:6,padding:"5px 8px",cursor:"pointer",display:"flex",alignItems:"center"}}><Icon d={icons.edit} size={12} color="#2563eb"/></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={items.length} pageSize={PAGE_SIZE} setPage={setPage}/>
            </>}
          </div>
        )}


        {/* CONTROLLED TAB */}
        {false  && (
          <div style={s.card}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6"}}><span style={{fontSize:13,fontWeight:600}}>Controlled Drug Register</span></div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Item","Action","Qty","Patient","Dispensed By","Witness","Date"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {controlled.length===0&&<tr><td colSpan={7} style={{...s.td,textAlign:"center",padding:40,color:"#9ca3af"}}>No controlled drug records</td></tr>}
                  {controlled.map((c:any)=>{
                    const colors:Record<string,[string,string]>={DISPENSE:["#dbeafe","#1e40af"],RETURN:["#d1fae5","#065f46"],DESTROY:["#fee2e2","#991b1b"],AUDIT:["#fef3c7","#92400e"]};
                    const [bg,color]=colors[c.actiontype]??["#f3f4f6","#374151"];
                    return (
                      <tr key={c.id}>
                        <td style={{...s.td,fontWeight:600}}>{c.itemname??"—"}</td>
                        <td style={s.td}><span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:bg,color}}>{c.actiontype}</span></td>
                        <td style={{...s.td,fontWeight:700}}>{c.quantity}</td>
                        <td style={s.td}>{c.patientref??"—"}</td>
                        <td style={s.td}>{c.dispensedby??"—"}</td>
                        <td style={{...s.td,color:c.witnessedby?"#111827":"#d1d5db"}}>{c.witnessedby??"No witness"}</td>
                        <td style={{...s.td,fontSize:12,color:"#6b7280"}}>{new Date(c.createdat).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {tab==="history" && (
          <div style={s.card}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" as const}}>
              <span style={{fontSize:13,fontWeight:600}}>Transaction History</span>
              <div style={{display:"flex",gap:5,flexWrap:"wrap" as const}}>
                {["ALL","STOCK_IN","STOCK_OUT","WASTAGE","TRANSFER"].map(type=>(
                  <button key={type} onClick={()=>{setHistoryTypeFilter(type);setHistoryPage(1);}}
                    style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",
                      border:`1px solid ${historyTypeFilter===type?"#6366f1":"#e5e7eb"}`,
                      background:historyTypeFilter===type?"#6366f1":"#f9fafb",
                      color:historyTypeFilter===type?"#fff":"#374151"}}>
                    {type}
                  </button>
                ))}
              </div>
              <span style={{fontSize:12,color:"#9ca3af",marginLeft:"auto"}}>{historyTotal} total</span>
            </div>
            {history.filter((tx:any)=>(historyTypeFilter==="ALL"||tx.transactionType===historyTypeFilter)&&tx.transactionType!=="DISPENSE"&&tx.transactionType!=="ADJUSTMENT").length===0
              ?<div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>No {historyTypeFilter==="ALL"?"transactions":historyTypeFilter} records yet</div>
              :<>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>{["Item","Code","Type","Qty","Warehouse","Batch","Patient","Reference","By","Date"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {history.filter((tx:any)=>(historyTypeFilter==="ALL"||tx.transactionType===historyTypeFilter)&&tx.transactionType!=="DISPENSE"&&tx.transactionType!=="ADJUSTMENT").map((tx:any)=>{
                      const tc:Record<string,[string,string]>={STOCK_IN:["#d1fae5","#065f46"],STOCK_OUT:["#fee2e2","#991b1b"],TRANSFER:["#dbeafe","#1e40af"],ADJUSTMENT:["#fef3c7","#92400e"],WASTAGE:["#f3f4f6","#374151"],DISPENSE:["#ede9fe","#5b21b6"]};
                      const [tbg,tcol]=tc[tx.transactionType]??["#f3f4f6","#374151"];
                      return (
                        <tr key={tx.id}>
                          <td style={{...s.td,fontWeight:600}}>{tx.itemName??"—"}</td>
                          <td style={{...s.td,fontFamily:"monospace",fontSize:11,color:"#6b7280"}}>{tx.itemcode??"—"}</td>
                          <td style={s.td}><span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:tbg,color:tcol}}>{tx.transactionType}</span></td>
                          <td style={{...s.td,fontWeight:700,color:tx.transactionType==="STOCK_IN"?"#16a34a":"#dc2626"}}>{tx.transactionType==="STOCK_IN"?"+":"-"}{tx.quantity}</td>
                          <td style={{...s.td,fontSize:12,color:"#6b7280"}}>{tx.warehouseName??"—"}</td>
                          <td style={{...s.td,fontFamily:"monospace",fontSize:11,color:"#6b7280"}}>{tx.batchNumber??"—"}</td>
                          <td style={{...s.td,fontSize:12}}>{tx.patientRef??"—"}</td>
                          <td style={{...s.td,fontSize:12,color:"#6b7280"}}>{tx.referenceId??"—"}</td>
                          <td style={{...s.td,fontSize:12}}>{tx.createdBy??"—"}</td>
                          <td style={{...s.td,fontSize:12,color:"#6b7280"}}>{new Date(tx.createdAt).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{padding:"12px 16px",borderTop:"1px solid #f3f4f6",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:12,color:"#6b7280"}}>Showing {(historyPage-1)*HISTORY_SIZE+1}–{Math.min(historyPage*HISTORY_SIZE,historyTotal)} of {historyTotal}</span>
                <div style={{display:"flex",gap:4}}>
                  <button onClick={()=>setHistoryPage(p=>Math.max(1,p-1))} disabled={historyPage===1} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #e5e7eb",fontSize:12,cursor:historyPage===1?"default":"pointer",color:historyPage===1?"#d1d5db":"#374151",background:"#fff"}}>← Prev</button>
                  <span style={{padding:"5px 12px",fontSize:12,color:"#374151"}}>Page {historyPage} of {Math.ceil(historyTotal/HISTORY_SIZE)||1}</span>
                  <button onClick={()=>setHistoryPage(p=>Math.min(Math.ceil(historyTotal/HISTORY_SIZE),p+1))} disabled={historyPage>=Math.ceil(historyTotal/HISTORY_SIZE)} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #e5e7eb",fontSize:12,cursor:historyPage>=Math.ceil(historyTotal/HISTORY_SIZE)?"default":"pointer",color:historyPage>=Math.ceil(historyTotal/HISTORY_SIZE)?"#d1d5db":"#374151",background:"#fff"}}>Next →</button>
                </div>
              </div>
            </>}
          </div>
        )}

        {/* SHOP LIST TAB */}
        {tab==="shoplist" && (
          <div>
            {/* Cart creation modal */}
            {showCartModal && (
              <div style={s.overlay}><div style={{...s.modal,width:680,maxHeight:"90vh",overflowY:"auto" as const}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <h3 style={{fontSize:16,fontWeight:600,margin:0}}>🛒 Create Order</h3>
                  <button onClick={()=>setShowCartModal(false)} style={{background:"none",border:"none",cursor:"pointer"}}><Icon d={icons.x} size={18} color="#6b7280"/></button>
                </div>

                {/* Order details */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                  <div style={s.fgroup}>
                    <label style={s.label}>Created By *</label>
                    <input style={s.input} value={shopCreatedBy} onChange={e=>setShopCreatedBy(e.target.value)} placeholder="Your name"/>
                  </div>
                  <div style={s.fgroup}>
                    <label style={s.label}>Supplier</label>
                    <select style={s.input} value={cartSupplier} onChange={e=>setCartSupplier(e.target.value)}>
                      <option value="">— Select supplier —</option>
                      {suppliers.map(s=><option key={s.id} value={s.name} data-email={s.email}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Cart items */}
                {cartItems.length === 0 ? (
                  <div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>No items in cart. Add items from the shop list.</div>
                ) : (
                  <>
                    <table style={{width:"100%",borderCollapse:"collapse",marginBottom:12}}>
                      <thead><tr>{["Item","Code","UOM","Stock","Qty","Unit Cost","Total",""].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {cartItems.map((item:any)=>{
                          const qty = shopQtys[item.id]??1;
                          const total = qty * parseFloat(item.lastUnitCost??0);
                          return (
                            <tr key={item.id}>
                              <td style={{...s.td,fontWeight:600}}>{item.name}</td>
                              <td style={{...s.td,fontFamily:"monospace",fontSize:11,color:"#6b7280"}}>{item.itemcode}</td>
                              <td style={s.td}>{item.uom}</td>
                              <td style={{...s.td,color:"#d97706"}}>{item.currentStock}</td>
                              <td style={s.td}><input type="number" min={1} value={qty} onChange={e=>setShopQtys(q=>({...q,[item.id]:parseInt(e.target.value)||1}))} style={{...s.input,width:70,textAlign:"center" as const}}/></td>
                              <td style={s.td}>{item.lastUnitCost?`$${parseFloat(item.lastUnitCost).toFixed(2)}`:"—"}</td>
                              <td style={{...s.td,fontWeight:600,color:"#6366f1"}}>${total.toFixed(2)}</td>
                              <td style={s.td}><button onClick={()=>setCartItems((c:any[])=>c.filter(i=>i.id!==item.id))} style={{background:"#fee2e2",border:"none",borderRadius:4,padding:"3px 8px",cursor:"pointer",fontSize:11,color:"#dc2626"}}>✕</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{background:"#f9fafb"}}>
                          <td colSpan={6} style={{...s.td,fontWeight:700,textAlign:"right" as const}}>Total:</td>
                          <td style={{...s.td,fontWeight:700,color:"#6366f1",fontSize:15}}>${cartItems.reduce((sum:number,i:any)=>sum+(shopQtys[i.id]??1)*parseFloat(i.lastUnitCost??0),0).toFixed(2)}</td>
                          <td style={s.td}></td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* Action buttons */}
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end",flexWrap:"wrap" as const}}>
                      <button onClick={()=>{
                        const NL = String.fromCharCode(10);
                        const total = cartItems.reduce((sum:number,i:any)=>sum+(shopQtys[i.id]??1)*parseFloat(i.lastUnitCost??0),0);
                        const supplierObj = suppliers.find(s=>s.name===cartSupplier);
                        const lines = [
                          `Order — ${cartSupplier||"No Supplier"}`,
                          `Created by: ${shopCreatedBy}`,
                          `Date: ${new Date().toLocaleDateString()}`,
                          "",
                          ...cartItems.map((i:any,idx:number)=>`${idx+1}. ${i.name} (${i.itemcode}) — Qty: ${shopQtys[i.id]??1} ${i.uom} — $${((shopQtys[i.id]??1)*parseFloat(i.lastUnitCost??0)).toFixed(2)}`),
                          "",`Total: $${total.toFixed(2)}`
                        ];
                        const emailTo = supplierObj?.email??"";
                        window.location.href = `mailto:${emailTo}?subject=${encodeURIComponent(`Order — ${cartSupplier} — ${new Date().toLocaleDateString()}`)}&body=${encodeURIComponent(lines.join(NL))}`;
                        showToast("Email client opened!");
                      }} style={{...s.btn("ghost"),border:"1px solid #e5e7eb",fontSize:12}}>✉️ Email</button>
                      <button onClick={()=>{
                        const NL = String.fromCharCode(10);
                        const total = cartItems.reduce((sum:number,i:any)=>sum+(shopQtys[i.id]??1)*parseFloat(i.lastUnitCost??0),0);
                        const headers = ["Item","Code","UOM","Stock","Qty","Unit Cost","Total"].join(",");
                        const rows = cartItems.map((i:any)=>[`"${i.name}"`,i.itemcode,i.uom,i.currentStock,shopQtys[i.id]??1,i.lastUnitCost??0,((shopQtys[i.id]??1)*parseFloat(i.lastUnitCost??0)).toFixed(2)].join(","));
                        const csv = [`Supplier: ${cartSupplier}`,`Created by: ${shopCreatedBy}`,`Date: ${new Date().toLocaleDateString()}`,"",[headers,...rows].join(NL),`,,,,,,Total: $${total.toFixed(2)}`].join(NL);
                        const blob = new Blob([csv],{type:"text/csv"});
                        const a = document.createElement("a"); a.href=URL.createObjectURL(blob);
                        a.download=`order-${(cartSupplier||"order").split(" ").join("-")}-${new Date().toISOString().slice(0,10)}.csv`;
                        a.click(); showToast("CSV downloaded!");
                      }} style={{...s.btn("ghost"),border:"1px solid #e5e7eb",fontSize:12}}>📥 CSV</button>
                      <button onClick={()=>{
                        const total = cartItems.reduce((sum:number,i:any)=>sum+(shopQtys[i.id]??1)*parseFloat(i.lastUnitCost??0),0);
                        const rowsHtml = cartItems.map((i:any,idx:number)=>`<tr><td>${idx+1}</td><td><b>${i.name}</b></td><td>${i.itemcode}</td><td>${i.uom}</td><td>${i.currentStock}</td><td><b>${shopQtys[i.id]??1}</b></td><td>$${parseFloat(i.lastUnitCost??0).toFixed(2)}</td><td>$${((shopQtys[i.id]??1)*parseFloat(i.lastUnitCost??0)).toFixed(2)}</td></tr>`).join("");
                        const w = window.open("","_blank","width=900,height=700");
                        if(w){w.document.write(`<html><head><title>Order</title><style>body{font-family:Arial;padding:20px;font-size:12px}h2{color:#6366f1}table{width:100%;border-collapse:collapse}th{background:#6366f1;color:#fff;padding:8px;text-align:left}td{padding:7px 8px;border-bottom:1px solid #e5e7eb}.total{font-weight:bold;font-size:14px;text-align:right;margin-top:16px}</style></head><body><h2>Order — ${cartSupplier||"No Supplier"}</h2><p>Created by: <b>${shopCreatedBy}</b> · ${new Date().toLocaleDateString()}</p><table><thead><tr><th>#</th><th>Item</th><th>Code</th><th>UOM</th><th>Stock</th><th>Order Qty</th><th>Unit Cost</th><th>Total</th></tr></thead><tbody>${rowsHtml}</tbody></table><div class="total">Total: $${total.toFixed(2)}</div></body></html>`);w.document.close();w.print();}
                      }} style={{...s.btn("ghost"),border:"1px solid #e5e7eb",fontSize:12}}>🖨️ Print</button>
                      <button disabled={shopSaving||!shopCreatedBy.trim()} onClick={async()=>{
                        if (!shopCreatedBy.trim()) { showToast("Please enter your name"); return; }
                        setShopSaving(true);
                        const total = cartItems.reduce((sum:number,i:any)=>sum+(shopQtys[i.id]??1)*parseFloat(i.lastUnitCost??0),0);
                        const orderItems = cartItems.map((i:any)=>({itemId:i.id,itemName:i.name,quantity:shopQtys[i.id]??1,unitCost:i.lastUnitCost,supplierName:cartSupplier||i.supplierName||"No Supplier"}));
                        const res = await fetch("/api/pharmacy/shoporders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({supplier:cartSupplier,createdBy:shopCreatedBy,items:orderItems,totalAmount:total})});
                        if(res.ok){
                          showToast("Order created!");
                          setCartItems([]);
                          setShopList([]);
                          setManualShopItems([]);
                          setShopQtys({});
                          setShowCartModal(false);
                          setCartSupplier("");
                          fetchOrders();
                        } else showToast("Failed to create order");
                        setShopSaving(false);
                      }} style={{...s.btn("purple"),fontSize:12,display:"flex",alignItems:"center",gap:5}}>
                        {shopSaving?"Saving...":<><Icon d={icons.check} size={12} color="#fff"/> Create Order</>}
                      </button>
                    </div>
                  </>
                )}
              </div></div>
            )}

            {/* Shop list header */}
            <div style={{...s.card,marginBottom:12,padding:"12px 16px"}}>
              <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap" as const}}>
                <div style={{flex:1,minWidth:280,position:"relative"}}>
                  <label style={s.label}>Search & Add to Cart</label>
                  <div style={{position:"relative"}}>
                    <div style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><Icon d={icons.search} size={13} color="#9ca3af"/></div>
                    <input placeholder="Search items by name, code, supplier..." value={shopSearch} onChange={e=>searchShopItems(e.target.value)} style={{...s.input,paddingLeft:30}}/>
                  </div>
                  {shopSearchResults.length>0&&(
                    <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1px solid #6366f1",borderRadius:8,boxShadow:"0 8px 24px rgba(99,102,241,0.15)",zIndex:9999,marginTop:4}}>
                      <div style={{padding:"6px 12px",fontSize:11,fontWeight:700,color:"#6b7280",borderBottom:"1px solid #f3f4f6"}}>{shopSearchResults.length} items — click to add to cart</div>
                      {shopSearchResults.map(item=>(
                        <div key={item.id} onClick={()=>{addToShopList(item);setShopSearch("");setShopSearchResults([]);}}
                          style={{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                          onMouseEnter={e=>(e.currentTarget.style.background="#eef2ff")}
                          onMouseLeave={e=>(e.currentTarget.style.background="#fff")}>
                          <div>
                            <div style={{fontWeight:600,fontSize:13}}>{item.name}</div>
                            <div style={{fontSize:11,color:"#6b7280"}}>
                              {item.supplierName&&<span style={{color:"#6366f1",fontWeight:600}}>{item.supplierName} · </span>}
                              {item.itemcode} · {item.uom} · Stock: <strong style={{color:parseInt(item.totalStock)===0?"#dc2626":"#16a34a"}}>{item.totalStock}</strong>
                            </div>
                          </div>
                          <span style={{fontSize:11,fontWeight:700,color:"#fff",background:"#6366f1",padding:"4px 10px",borderRadius:6,whiteSpace:"nowrap" as const}}>+ Cart</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                  <button onClick={fetchShopList} style={{...s.btn("ghost"),border:"1px solid #e5e7eb",display:"flex",alignItems:"center",gap:5}}>
                    <Icon d={icons.refresh} size={13} color="#374151"/> Load Low Stock
                  </button>
                  <button
                    onClick={()=>{
                      const all = [...shopList,...manualShopItems];
                      if(all.length===0){showToast("Cart is empty");return;}
                      setCartItems(all);
                      setShowCartModal(true);
                    }}
                    disabled={shopList.length===0&&manualShopItems.length===0}
                    style={{...s.btn("purple"),display:"flex",alignItems:"center",gap:6,position:"relative" as const}}>
                    🛒 View Cart
                    {(shopList.length+manualShopItems.length)>0&&(
                      <span style={{background:"#fff",color:"#6366f1",borderRadius:20,fontSize:10,fontWeight:700,padding:"1px 6px",marginLeft:2}}>
                        {shopList.length+manualShopItems.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Cart items preview */}
            {(shopList.length>0||manualShopItems.length>0) ? (
              <div style={s.card}>
                {shopList.length>0&&<div style={{padding:"8px 16px",background:"#fef3c7",fontSize:12,color:"#92400e",borderBottom:"1px solid #fde68a"}}>⚠️ {shopList.length} item{shopList.length>1?"s":""} at or below reorder level</div>}
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr>{["Item","Code","Supplier","UOM","Stock","Order Qty","Unit Cost","Est. Cost",""].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {[...shopList,...manualShopItems].map(item=>{
                        const qty = shopQtys[item.id]??1;
                        const cost = qty*parseFloat(item.lastUnitCost??0);
                        return (
                          <tr key={item.id}>
                            <td style={{...s.td,fontWeight:600}}>{item.name}</td>
                            <td style={{...s.td,fontFamily:"monospace",fontSize:11,color:"#6b7280"}}>{item.itemcode}</td>
                            <td style={{...s.td,fontSize:12,color:"#6366f1"}}>{item.supplierName??"—"}</td>
                            <td style={s.td}>{item.uom}</td>
                            <td style={{...s.td,fontWeight:700,color:parseInt(item.currentStock)===0?"#dc2626":"#d97706"}}>{item.currentStock}</td>
                            <td style={s.td}><input type="number" min={0} value={qty} onChange={e=>setShopQtys(q=>({...q,[item.id]:parseInt(e.target.value)||0}))} style={{...s.input,width:75,textAlign:"center" as const}}/></td>
                            <td style={s.td}>{item.lastUnitCost?`$${parseFloat(item.lastUnitCost).toFixed(2)}`:"—"}</td>
                            <td style={{...s.td,fontWeight:600,color:"#6366f1"}}>${cost.toFixed(2)}</td>
                            <td style={s.td}><button onClick={()=>{
                              setShopList((l:any[])=>l.filter(i=>i.id!==item.id));
                              setManualShopItems((m:any[])=>m.filter(i=>i.id!==item.id));
                              setShopQtys(q=>{const n={...q};delete n[item.id];return n;});
                            }} style={{background:"#fee2e2",border:"none",borderRadius:4,padding:"3px 8px",cursor:"pointer",fontSize:11,color:"#dc2626"}}>✕</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{background:"#f9fafb"}}>
                        <td colSpan={7} style={{...s.td,fontWeight:700,textAlign:"right" as const}}>Total Est. Cost:</td>
                        <td style={{...s.td,fontWeight:700,color:"#6366f1"}}>${[...shopList,...manualShopItems].reduce((sum,i)=>sum+(shopQtys[i.id]??0)*parseFloat(i.lastUnitCost??0),0).toFixed(2)}</td>
                        <td style={s.td}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{...s.card,padding:40,textAlign:"center"}}>
                <div style={{fontSize:36,marginBottom:8}}>🛒</div>
                <div style={{fontSize:14,fontWeight:600,color:"#374151"}}>Cart is empty</div>
                <div style={{fontSize:12,color:"#9ca3af",marginTop:4}}>Search for items above or click "Load Low Stock" to auto-fill</div>
              </div>
            )}
          </div>
        )}

        {/* SUPPLIERS TAB */}
        {tab==="suppliers" && (
          <div>
            {viewSupplier&&(
              <div style={s.overlay}><div style={{...s.modal,width:820}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div><h3 style={{fontSize:16,fontWeight:600,margin:0}}>{viewSupplier.name}</h3><div style={{fontSize:12,color:"#6b7280",marginTop:2}}>Supplied Items</div></div>
                  <button onClick={()=>setViewSupplier(null)} style={{background:"none",border:"none",cursor:"pointer"}}><Icon d={icons.x} size={18} color="#6b7280"/></button>
                </div>
                {supplierItemsLoading?<div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>Loading...</div>
                :supplierItems.length===0?<div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>No items linked to this supplier yet</div>
                :<table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>{["Item","Code","Type","UOM","Unit Cost","Selling Price","Last Batch","Last Supplied"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {supplierItems.map(i=>(
                      <tr key={i.id}>
                        <td style={{...s.td,fontWeight:600}}>{i.name}{i.genericName&&<div style={{fontSize:11,color:"#9ca3af"}}>{i.genericName}</div>}</td>
                        <td style={{...s.td,fontFamily:"monospace",fontSize:11,color:"#6b7280"}}>{i.itemcode}</td>
                        <td style={s.td}><span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:"#f3f4f6",color:"#374151"}}>{i.itemType}</span></td>
                        <td style={s.td}>{i.uom}</td>
                        <td style={s.td}>{i.unitCost?`$${parseFloat(i.unitCost).toFixed(2)}`:"—"}</td>
                        <td style={{...s.td,color:"#16a34a",fontWeight:600}}>{i.sellingPrice?`$${parseFloat(i.sellingPrice).toFixed(2)}`:"—"}</td>
                        <td style={{...s.td,fontFamily:"monospace",fontSize:11}}>{i.lastBatch??"—"}</td>
                        <td style={{...s.td,fontSize:12,color:"#6b7280"}}>{i.lastSupplied?new Date(i.lastSupplied).toLocaleDateString():"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>}
              </div></div>
            )}

            {editSupplier&&(
              <div style={s.overlay}><div style={{...s.modal,width:500}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <h3 style={{fontSize:16,fontWeight:600,margin:0}}>Edit Supplier</h3>
                  <button onClick={()=>setEditSupplier(null)} style={{background:"none",border:"none",cursor:"pointer"}}><Icon d={icons.x} size={18} color="#6b7280"/></button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div style={s.fgroup}><label style={s.label}>Name *</label><input style={s.input} value={editSupplier.name} onChange={e=>setEditSupplier((f:any)=>({...f,name:e.target.value}))}/></div>
                  <div style={s.fgroup}><label style={s.label}>Contact Person</label><input style={s.input} value={editSupplier.contactPerson??""} onChange={e=>setEditSupplier((f:any)=>({...f,contactPerson:e.target.value}))}/></div>
                  <div style={s.fgroup}><label style={s.label}>Email</label><input style={s.input} value={editSupplier.email??""} onChange={e=>setEditSupplier((f:any)=>({...f,email:e.target.value}))}/></div>
                  <div style={s.fgroup}><label style={s.label}>Phone</label><input style={s.input} value={editSupplier.phone??""} onChange={e=>setEditSupplier((f:any)=>({...f,phone:e.target.value}))}/></div>
                  <div style={{gridColumn:"1/-1",...s.fgroup}}><label style={s.label}>Address</label><input style={s.input} value={editSupplier.address??""} onChange={e=>setEditSupplier((f:any)=>({...f,address:e.target.value}))}/></div>
                </div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
                  <button onClick={()=>setEditSupplier(null)} style={{...s.btn("ghost"),border:"1px solid #e5e7eb"}}>Cancel</button>
                  <button onClick={updateSupplier} style={s.btn("purple")}>Save Changes</button>
                </div>
              </div></div>
            )}

            <div style={s.card}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",gap:10,alignItems:"center"}}>
                <div style={{position:"relative",display:"flex",alignItems:"center"}}>
                  <div style={{position:"absolute",left:10,pointerEvents:"none"}}><Icon d={icons.search} size={13} color="#9ca3af"/></div>
                  <input placeholder="Search suppliers..." value={supplierSearch} onChange={e=>setSupplierSearch(e.target.value)} style={{...s.input,width:240,paddingLeft:30}}/>
                </div>
                <span style={{fontSize:12,color:"#9ca3af"}}>{suppliers.length} suppliers</span>
                <div style={{marginLeft:"auto"}}>
                  <button onClick={()=>setShowAddSupplier(v=>!v)} style={{...s.btn("purple"),display:"flex",alignItems:"center",gap:6}}><Icon d={icons.plus} size={13} color="#fff"/> Add Supplier</button>
                </div>
              </div>

              {showAddSupplier&&(
                <div style={{padding:16,borderBottom:"1px solid #f3f4f6",background:"#f9fafb"}}>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>New Supplier</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                    <div><label style={s.label}>Name *</label><input style={s.input} value={supplierForm.name} onChange={e=>setSupplierForm(f=>({...f,name:e.target.value}))}/></div>
                    <div><label style={s.label}>Contact Person</label><input style={s.input} value={supplierForm.contactPerson} onChange={e=>setSupplierForm(f=>({...f,contactPerson:e.target.value}))}/></div>
                    <div><label style={s.label}>Email</label><input style={s.input} value={supplierForm.email} onChange={e=>setSupplierForm(f=>({...f,email:e.target.value}))}/></div>
                    <div><label style={s.label}>Phone</label><input style={s.input} value={supplierForm.phone} onChange={e=>setSupplierForm(f=>({...f,phone:e.target.value}))}/></div>
                    <div style={{gridColumn:"1/-1"}}><label style={s.label}>Address</label><input style={s.input} value={supplierForm.address} onChange={e=>setSupplierForm(f=>({...f,address:e.target.value}))}/></div>
                  </div>
                  <div style={{display:"flex",gap:8,marginTop:12}}>
                    <button onClick={saveSupplier} style={s.btn("purple")}>Save Supplier</button>
                    <button onClick={()=>setShowAddSupplier(false)} style={{...s.btn("ghost"),border:"1px solid #e5e7eb"}}>Cancel</button>
                  </div>
                </div>
              )}

              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>{["Supplier","Contact","Email","Phone","Address","Items","Actions"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {suppliers.length===0&&<tr><td colSpan={7} style={{...s.td,textAlign:"center",padding:40,color:"#9ca3af"}}>{supplierSearch?"No suppliers match your search":"No suppliers yet"}</td></tr>}
                    {suppliers.map((v:any)=>(
                      <tr key={v.id}>
                        <td style={{...s.td,fontWeight:600}}>{v.name}</td>
                        <td style={s.td}>{v.contactPerson??"—"}</td>
                        <td style={{...s.td,color:"#6366f1",fontSize:12}}>{v.email??"—"}</td>
                        <td style={s.td}>{v.phone??"—"}</td>
                        <td style={{...s.td,fontSize:12,color:"#6b7280"}}>{v.address??"—"}</td>
                        <td style={s.td}>
                          <button onClick={()=>loadSupplierItems(v)} style={{fontSize:11,fontWeight:600,padding:"2px 10px",borderRadius:20,background:"#eef2ff",color:"#6366f1",border:"none",cursor:"pointer"}}>
                            {v.drugCount??0} items →
                          </button>
                        </td>
                        <td style={s.td}>
                          <div style={{display:"flex",gap:5}}>
                            <button onClick={()=>setEditSupplier({id:v.id,name:v.name,contactPerson:v.contactPerson,email:v.email,phone:v.phone,address:v.address})} style={{background:"#eff6ff",border:"none",borderRadius:6,padding:"5px 8px",cursor:"pointer",display:"flex",alignItems:"center"}}><Icon d={icons.edit} size={12} color="#2563eb"/></button>
                            <button onClick={()=>{if(confirm(`Deactivate ${v.name}?`))deleteSupplier(v.id);}} style={{background:"#fee2e2",border:"none",borderRadius:6,padding:"5px 8px",cursor:"pointer",display:"flex",alignItems:"center"}}><Icon d={icons.trash} size={12} color="#dc2626"/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}




        {/* MANUFACTURERS TAB */}
        {tab==="manufacturers" && (
          <div>
            {/* Add/Edit Modal */}
            {mfgModal && (
              <div style={s.overlay}><div style={{...s.modal,width:600}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <h3 style={{fontSize:16,fontWeight:600,margin:0}}>{mfgModal==="edit"?"Edit Manufacturer":"Add Manufacturer"}</h3>
                  <button onClick={()=>{setMfgModal(null);setMfgRow(null);setMfgForm({name:"",code:"",country:"",contactname:"",phone:"",email:"",address:"",website:"",license_number:"",product_types:"",notes:""}); }} style={{background:"none",border:"none",cursor:"pointer"}}><Icon d={icons.x} size={18} color="#6b7280"/></button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div style={{gridColumn:"1/-1",...s.fgroup}}><label style={s.label}>Manufacturer Name *</label><input style={s.input} value={mfgForm.name} onChange={e=>setMfgForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Pfizer Inc."/></div>
                  <div style={s.fgroup}><label style={s.label}>Code</label><input style={s.input} value={mfgForm.code} onChange={e=>setMfgForm(f=>({...f,code:e.target.value}))} placeholder="e.g. MFG-001"/></div>
                  <div style={s.fgroup}><label style={s.label}>Country</label><input style={s.input} value={mfgForm.country} onChange={e=>setMfgForm(f=>({...f,country:e.target.value}))}/></div>
                  <div style={s.fgroup}><label style={s.label}>Contact Name</label><input style={s.input} value={mfgForm.contactname} onChange={e=>setMfgForm(f=>({...f,contactname:e.target.value}))}/></div>
                  <div style={s.fgroup}><label style={s.label}>Phone</label><input style={s.input} value={mfgForm.phone} onChange={e=>setMfgForm(f=>({...f,phone:e.target.value}))}/></div>
                  <div style={s.fgroup}><label style={s.label}>Email</label><input type="email" style={s.input} value={mfgForm.email} onChange={e=>setMfgForm(f=>({...f,email:e.target.value}))}/></div>
                  <div style={s.fgroup}><label style={s.label}>Website</label><input style={s.input} value={mfgForm.website} onChange={e=>setMfgForm(f=>({...f,website:e.target.value}))} placeholder="https://..."/></div>
                  <div style={s.fgroup}><label style={s.label}>License / Reg. Number</label><input style={s.input} value={mfgForm.license_number} onChange={e=>setMfgForm(f=>({...f,license_number:e.target.value}))}/></div>
                  <div style={{gridColumn:"1/-1",...s.fgroup}}><label style={s.label}>Address</label><input style={s.input} value={mfgForm.address} onChange={e=>setMfgForm(f=>({...f,address:e.target.value}))}/></div>
                  <div style={{gridColumn:"1/-1",...s.fgroup}}><label style={s.label}>Product Types</label><input style={s.input} value={mfgForm.product_types} onChange={e=>setMfgForm(f=>({...f,product_types:e.target.value}))} placeholder="e.g. tablets, injections, creams"/></div>
                  <div style={{gridColumn:"1/-1",...s.fgroup}}><label style={s.label}>Notes</label><input style={s.input} value={mfgForm.notes} onChange={e=>setMfgForm(f=>({...f,notes:e.target.value}))}/></div>
                </div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
                  <button onClick={()=>{setMfgModal(null);setMfgRow(null);}} style={{...s.btn("ghost"),border:"1px solid #e5e7eb"}}>Cancel</button>
                  <button onClick={async()=>{
                    if (!mfgForm.name.trim()) { showToast("Name required"); return; }
                    const url = mfgModal==="edit" ? `/api/pharmacy/manufacturers/${mfgRow.id}` : "/api/pharmacy/manufacturers";
                    const method = mfgModal==="edit" ? "PATCH" : "POST";
                    setMfgModal(null); setMfgRow(null);
                    const res = await fetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(mfgForm)});
                    if (res.ok) { fetchManufacturers(); showToast(mfgModal==="edit"?"Manufacturer updated!":"Manufacturer added!"); }
                    setMfgForm({name:"",code:"",country:"",contactname:"",phone:"",email:"",address:"",website:"",license_number:"",product_types:"",notes:""});
                  }} style={s.btn("purple")}>{mfgModal==="edit"?"Save Changes":"Add Manufacturer"}</button>
                </div>
              </div></div>
            )}

            {/* Delete confirm */}
            {deleteMfg && (
              <div style={s.overlay}><div style={{...s.modal,width:420}}>
                <h3 style={{fontSize:15,fontWeight:600,marginBottom:8}}>Remove Manufacturer</h3>
                <p style={{fontSize:13,color:"#6b7280",marginBottom:20}}>Remove <strong>{deleteMfg.name}</strong> from the list?</p>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={()=>setDeleteMfg(null)} style={{...s.btn("ghost"),border:"1px solid #e5e7eb"}}>Cancel</button>
                  <button onClick={async()=>{
                    await fetch(`/api/pharmacy/manufacturers/${deleteMfg.id}`,{method:"DELETE"});
                    setDeleteMfg(null); fetchManufacturers(); showToast("Manufacturer removed");
                  }} style={s.btn("red")}>Remove</button>
                </div>
              </div></div>
            )}

            <div style={s.card}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",gap:10,alignItems:"center"}}>
                <div style={{position:"relative",display:"flex",alignItems:"center",flex:1,maxWidth:320}}>
                  <div style={{position:"absolute",left:10,pointerEvents:"none"}}><Icon d={icons.search} size={13} color="#9ca3af"/></div>
                  <input placeholder="Search manufacturers..." value={mfgSearch} onChange={e=>setMfgSearch(e.target.value)} style={{...s.input,paddingLeft:30}}/>
                </div>
                <span style={{fontSize:12,color:"#9ca3af"}}>{manufacturers.length} manufacturers</span>
                <div style={{marginLeft:"auto"}}>
                  <button onClick={()=>{setMfgForm({name:"",code:"",country:"",contactname:"",phone:"",email:"",address:"",website:"",license_number:"",product_types:"",notes:""});setMfgRow(null);setMfgModal("add");}} style={{...s.btn("purple"),display:"flex",alignItems:"center",gap:6}}><Icon d={icons.plus} size={13} color="#fff"/> Add Manufacturer</button>
                </div>
              </div>
              {manufacturers.length===0 ? (
                <div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>
                  No manufacturers yet. <button onClick={()=>{setMfgForm({name:"",code:"",country:"",contactname:"",phone:"",email:"",address:"",website:"",license_number:"",product_types:"",notes:""});setMfgModal("add");}} style={{color:"#6366f1",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Add one →</button>
                </div>
              ) : (
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr>{["Manufacturer","Code","Country","Contact","Email","Phone","License No.","Products","Actions"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {manufacturers.map(m=>(
                        <tr key={m.id}>
                          <td style={{...s.td,fontWeight:600}}>
                            {m.name}
                            {m.website&&<div style={{marginTop:2}}><a href={m.website} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#6366f1"}}>{m.website}</a></div>}
                          </td>
                          <td style={{...s.td,fontFamily:"monospace",fontSize:11,color:"#6b7280"}}>{m.code||"—"}</td>
                          <td style={s.td}>{m.country||"—"}</td>
                          <td style={s.td}>{m.contactname||"—"}</td>
                          <td style={{...s.td,color:"#6366f1",fontSize:12}}>{m.email||"—"}</td>
                          <td style={s.td}>{m.phone||"—"}</td>
                          <td style={{...s.td,fontFamily:"monospace",fontSize:11}}>{m.license_number||"—"}</td>
                          <td style={{...s.td,fontSize:12,color:"#6b7280"}}>{m.product_types||"—"}</td>
                          <td style={s.td}>
                            <div style={{display:"flex",gap:5}}>
                              <button onClick={()=>{setMfgForm({name:m.name,code:m.code??"",country:m.country??"",contactname:m.contactname??"",phone:m.phone??"",email:m.email??"",address:m.address??"",website:m.website??"",license_number:m.license_number??"",product_types:m.product_types??"",notes:m.notes??""});setMfgRow(m);setMfgModal("edit");}} style={{background:"#eff6ff",border:"none",borderRadius:6,padding:"5px 8px",cursor:"pointer",display:"flex",alignItems:"center"}}><Icon d={icons.edit} size={12} color="#2563eb"/></button>
                              <button onClick={()=>setDeleteMfg(m)} style={{background:"#fee2e2",border:"none",borderRadius:6,padding:"5px 8px",cursor:"pointer",display:"flex",alignItems:"center"}}><Icon d={icons.trash} size={12} color="#dc2626"/></button>
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
        )}
        {/* RECEIVE STOCK MODAL */}
        {showReceiveModal && (
          <div style={s.overlay}><div style={{...s.modal,width:560}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 style={{fontSize:16,fontWeight:600,margin:0}}>Receive Stock</h3>
              <button onClick={()=>setShowReceiveModal(false)} style={{background:"none",border:"none",cursor:"pointer"}}><Icon d={icons.x} size={18} color="#6b7280"/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{gridColumn:"1/-1",...s.fgroup}}>
                <label style={s.label}>Item *</label>
                <select style={s.input} value={receiveForm.itemId} onChange={e=>setReceiveForm(f=>({...f,itemId:e.target.value}))}>
                  <option value="">Select item</option>
                  {items.map(i=><option key={i.id} value={i.id}>{i.name} ({i.itemcode})</option>)}
                </select>
              </div>
              <div style={s.fgroup}><label style={s.label}>Batch Number</label><input style={s.input} value={receiveForm.batchNumber} onChange={e=>setReceiveForm(f=>({...f,batchNumber:e.target.value}))} placeholder="e.g. LOT-2024-001"/></div>
              <div style={s.fgroup}><label style={s.label}>Quantity *</label><input type="number" style={s.input} value={receiveForm.quantity} onChange={e=>setReceiveForm(f=>({...f,quantity:e.target.value}))}/></div>
              <div style={s.fgroup}><label style={s.label}>Purchase Price (Unit Cost)</label><input type="number" step="0.01" style={s.input} value={receiveForm.unitCost} onChange={e=>setReceiveForm(f=>({...f,unitCost:e.target.value}))}/></div>
              <div style={s.fgroup}><label style={s.label}>Selling Price</label><input type="number" step="0.01" style={s.input} value={receiveForm.sellingPrice} onChange={e=>setReceiveForm(f=>({...f,sellingPrice:e.target.value}))}/></div>
              <div style={s.fgroup}><label style={s.label}>Expiry Date</label><input type="date" style={s.input} value={receiveForm.expiryDate} onChange={e=>setReceiveForm(f=>({...f,expiryDate:e.target.value}))}/></div>
              <div style={s.fgroup}><label style={s.label}>Manufacture Date</label><input type="date" style={s.input} value={receiveForm.manufactureDate} onChange={e=>setReceiveForm(f=>({...f,manufactureDate:e.target.value}))}/></div>
              <div style={{gridColumn:"1/-1",...s.fgroup}}><label style={s.label}>Notes</label><input style={s.input} value={receiveForm.notes} onChange={e=>setReceiveForm(f=>({...f,notes:e.target.value}))} placeholder="Optional notes..."/></div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
              <button onClick={()=>setShowReceiveModal(false)} style={{...s.btn("ghost"),border:"1px solid #e5e7eb"}}>Cancel</button>
              <button disabled={receivingLoading} onClick={async()=>{
                if (!receiveForm.itemId||!receiveForm.quantity) { showToast("Item and quantity required"); return; }
                setReceivingLoading(true);
                const whId = pharmaWh[0]?.id;
                if (!whId) { showToast("No pharmacy warehouse found"); setReceivingLoading(false); return; }
                const res = await fetch("/api/stock/receive",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...receiveForm,warehouseId:whId,quantity:parseInt(receiveForm.quantity),unitCost:parseFloat(receiveForm.unitCost)||null,sellingPrice:parseFloat(receiveForm.sellingPrice)||null})});
                const data = await res.json();
                if (res.ok) { setShowReceiveModal(false); fetchAll(); showToast("Stock received!"); }
                else showToast(data.error??"Failed to receive stock");
                setReceivingLoading(false);
              }} style={s.btn("purple")}>{receivingLoading?"Saving...":"Receive Stock"}</button>
            </div>
          </div></div>
        )}

        {/* STORAGE TAB */}
        {tab==="storage" && (
          <div>
            {storageModal && (
              <div style={s.overlay}><div style={{...s.modal,width:500}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <h3 style={{fontSize:16,fontWeight:600,margin:0}}>{storageModal==="edit"?"Edit Storage Location":"Add Storage Location"}</h3>
                  <button onClick={()=>{setStorageModal(null);setStorageRow(null);setStorageForm({name:"",location:"",type:"shelf",temperature:"",notes:""}); }} style={{background:"none",border:"none",cursor:"pointer"}}><Icon d={icons.x} size={18} color="#6b7280"/></button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div style={{gridColumn:"1/-1",...s.fgroup}}><label style={s.label}>Location Name *</label><input style={s.input} value={storageForm.name} onChange={e=>setStorageForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Shelf A-1, Fridge 2"/></div>
                  <div style={s.fgroup}><label style={s.label}>Physical Location</label><input style={s.input} value={storageForm.location} onChange={e=>setStorageForm(f=>({...f,location:e.target.value}))} placeholder="e.g. Room 3, Pharmacy Main"/></div>
                  <div style={s.fgroup}><label style={s.label}>Type</label>
                    <select style={s.input} value={storageForm.type} onChange={e=>setStorageForm(f=>({...f,type:e.target.value}))}>
                      {["shelf","fridge","freezer","cabinet","room","controlled","drawer"].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div style={{gridColumn:"1/-1",...s.fgroup}}><label style={s.label}>Shelf / Section</label>
                    <ShelfSearch value={storageForm.location??""} existingShelves={storageLocations.map(s=>s.name)} onChange={v=>setStorageForm(f=>({...f,location:v}))}/>
                  </div>
                  <div style={s.fgroup}><label style={s.label}>Temperature</label><input style={s.input} value={storageForm.temperature} onChange={e=>setStorageForm(f=>({...f,temperature:e.target.value}))} placeholder="e.g. 2-8°C, Room temp"/></div>
                  <div style={{gridColumn:"1/-1",...s.fgroup}}><label style={s.label}>Notes</label><input style={s.input} value={storageForm.notes} onChange={e=>setStorageForm(f=>({...f,notes:e.target.value}))}/></div>
                </div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
                  <button onClick={()=>{setStorageModal(null);setStorageRow(null);}} style={{...s.btn("ghost"),border:"1px solid #e5e7eb"}}>Cancel</button>
                  <button onClick={async()=>{
                    if (!storageForm.name.trim()) { showToast("Name required"); return; }
                    const url = storageModal==="edit"?`/api/pharmacy/storage/${storageRow.id}`:"/api/pharmacy/storage";
                    const method = storageModal==="edit"?"PATCH":"POST";
                    setStorageModal(null); setStorageRow(null);
                    const res = await fetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(storageForm)});
                    if (res.ok) { fetchStorage(); showToast(storageModal==="edit"?"Updated!":"Added!"); }
                    setStorageForm({name:"",location:"",type:"shelf",temperature:"",notes:""});
                  }} style={s.btn("purple")}>{storageModal==="edit"?"Save Changes":"Add Location"}</button>
                </div>
              </div></div>
            )}
            {deleteStorage && (
              <div style={s.overlay}><div style={{...s.modal,width:420}}>
                <h3 style={{fontSize:15,fontWeight:600,marginBottom:8}}>Remove Storage Location</h3>
                <p style={{fontSize:13,color:"#6b7280",marginBottom:20}}>Remove <strong>{deleteStorage.name}</strong>?</p>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={()=>setDeleteStorage(null)} style={{...s.btn("ghost"),border:"1px solid #e5e7eb"}}>Cancel</button>
                  <button onClick={async()=>{await fetch(`/api/pharmacy/storage/${deleteStorage.id}`,{method:"DELETE"});setDeleteStorage(null);fetchStorage();showToast("Removed");}} style={s.btn("red")}>Remove</button>
                </div>
              </div></div>
            )}
            <div style={s.card}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap" as const}}>
                <div style={{position:"relative",display:"flex",alignItems:"center",flex:1,maxWidth:320}}>
                  <div style={{position:"absolute",left:10,pointerEvents:"none"}}><Icon d={icons.search} size={13} color="#9ca3af"/></div>
                  <input placeholder="Search storage locations..." value={storageSearch??""} onChange={e=>setStorageSearch(e.target.value)} style={{...s.input,paddingLeft:30}}/>
                </div>
                <span style={{fontSize:12,color:"#9ca3af"}}>{storageLocations.length} locations</span>
                <div style={{marginLeft:"auto"}}>
                  <button onClick={()=>{setStorageForm({name:"",location:"",type:"shelf",temperature:"",notes:""});setStorageRow(null);setStorageModal("add");}} style={{...s.btn("purple"),display:"flex",alignItems:"center",gap:6}}><Icon d={icons.plus} size={13} color="#fff"/> Add Location</button>
                </div>
              </div>
              {storageLocations.length===0?(
                <div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>No storage locations yet. Add one to get started.</div>
              ):(
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr>{["Name","Physical Location","Type","Temperature","Notes","Actions"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {storageLocations.filter((loc:any)=>!storageSearch||(loc.name??"").toLowerCase().includes(storageSearch.toLowerCase())||(loc.location??"").toLowerCase().includes(storageSearch.toLowerCase())).map((loc:any)=>(
                        <tr key={loc.id}>
                          <td style={{...s.td,fontWeight:600}}>📍 {loc.name}</td>
                          <td style={{...s.td,fontSize:12,color:"#6b7280"}}>{loc.location||"—"}</td>
                          <td style={s.td}>
                            <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,
                              background:loc.type==="fridge"?"#dbeafe":loc.type==="freezer"?"#e0f2fe":loc.type==="controlled"?"#fef3c7":loc.type==="cabinet"?"#f3f4f6":"#d1fae5",
                              color:loc.type==="fridge"?"#1d4ed8":loc.type==="freezer"?"#0369a1":loc.type==="controlled"?"#92400e":loc.type==="cabinet"?"#374151":"#065f46"}}>
                              {loc.type}
                            </span>
                          </td>
                          <td style={{...s.td,fontSize:12}}>{loc.temperature||"—"}</td>
                          <td style={{...s.td,fontSize:12,color:"#6b7280"}}>{loc.notes||"—"}</td>
                          <td style={s.td}>
                            <div style={{display:"flex",gap:5}}>
                              <button onClick={()=>{setStorageForm({name:loc.name,location:loc.location??"",type:loc.type??"shelf",temperature:loc.temperature??"",notes:loc.notes??""});setStorageRow(loc);setStorageModal("edit");}} style={{background:"#eff6ff",border:"none",borderRadius:6,padding:"5px 8px",cursor:"pointer",display:"flex",alignItems:"center"}}><Icon d={icons.edit} size={12} color="#2563eb"/></button>
                              <button onClick={()=>setDeleteStorage(loc)} style={{background:"#fee2e2",border:"none",borderRadius:6,padding:"5px 8px",cursor:"pointer",display:"flex",alignItems:"center"}}><Icon d={icons.trash} size={12} color="#dc2626"/></button>
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
        )}

        {/* RECEIVE STOCK MODAL */}
        {showReceiveModal && (
          <div style={s.overlay}><div style={{...s.modal,width:560}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 style={{fontSize:16,fontWeight:600,margin:0}}>Receive Stock</h3>
              <button onClick={()=>setShowReceiveModal(false)} style={{background:"none",border:"none",cursor:"pointer"}}><Icon d={icons.x} size={18} color="#6b7280"/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{gridColumn:"1/-1",...s.fgroup}}>
                <label style={s.label}>Item *</label>
                <select style={s.input} value={receiveForm.itemId} onChange={e=>setReceiveForm(f=>({...f,itemId:e.target.value}))}>
                  <option value="">Select item</option>
                  {items.map(i=><option key={i.id} value={i.id}>{i.name} ({i.itemcode})</option>)}
                </select>
              </div>
              <div style={s.fgroup}><label style={s.label}>Batch Number</label><input style={s.input} value={receiveForm.batchNumber} onChange={e=>setReceiveForm(f=>({...f,batchNumber:e.target.value}))} placeholder="e.g. LOT-2024-001"/></div>
              <div style={s.fgroup}><label style={s.label}>Quantity *</label><input type="number" style={s.input} value={receiveForm.quantity} onChange={e=>setReceiveForm(f=>({...f,quantity:e.target.value}))}/></div>
              <div style={s.fgroup}><label style={s.label}>Purchase Price</label><input type="number" step="0.01" style={s.input} value={receiveForm.unitCost} onChange={e=>setReceiveForm(f=>({...f,unitCost:e.target.value}))}/></div>
              <div style={s.fgroup}><label style={s.label}>Selling Price</label><input type="number" step="0.01" style={s.input} value={receiveForm.sellingPrice} onChange={e=>setReceiveForm(f=>({...f,sellingPrice:e.target.value}))}/></div>
              <div style={s.fgroup}><label style={s.label}>Expiry Date</label><input type="date" style={s.input} value={receiveForm.expiryDate} onChange={e=>setReceiveForm(f=>({...f,expiryDate:e.target.value}))}/></div>
              <div style={s.fgroup}><label style={s.label}>Manufacture Date</label><input type="date" style={s.input} value={receiveForm.manufactureDate} onChange={e=>setReceiveForm(f=>({...f,manufactureDate:e.target.value}))}/></div>
              <div style={{gridColumn:"1/-1",...s.fgroup}}><label style={s.label}>Notes</label><input style={s.input} value={receiveForm.notes} onChange={e=>setReceiveForm(f=>({...f,notes:e.target.value}))} placeholder="Optional notes..."/></div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
              <button onClick={()=>setShowReceiveModal(false)} style={{...s.btn("ghost"),border:"1px solid #e5e7eb"}}>Cancel</button>
              <button disabled={receivingLoading} onClick={async()=>{
                if (!receiveForm.itemId||!receiveForm.quantity) { showToast("Item and quantity required"); return; }
                setReceivingLoading(true);
                const whId = pharmaWh[0]?.id;
                if (!whId) { showToast("No pharmacy warehouse found"); setReceivingLoading(false); return; }
                const res = await fetch("/api/stock/receive",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...receiveForm,warehouseId:whId,quantity:parseInt(receiveForm.quantity),unitCost:parseFloat(receiveForm.unitCost)||null,sellingPrice:parseFloat(receiveForm.sellingPrice)||null})});
                const data = await res.json();
                if (res.ok) { setShowReceiveModal(false); fetchAll(); showToast("Stock received!"); }
                else showToast(data.error??"Failed to receive stock");
                setReceivingLoading(false);
              }} style={s.btn("purple")}>{receivingLoading?"Saving...":"Receive Stock"}</button>
            </div>
          </div></div>
        )}

        {/* UOM TAB */}
        {tab==="uom" && (
          <div>
            {uomModal && (
              <div style={s.overlay}><div style={{...s.modal,width:480}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <h3 style={{fontSize:16,fontWeight:600,margin:0}}>{uomModal==="edit"?"Edit Conversion":"Add UOM Conversion"}</h3>
                  <button onClick={()=>{setUomModal(null);setUomRow(null);setUomForm({item_id:"",from_uom:"",to_uom:"",factor:""}); }} style={{background:"none",border:"none",cursor:"pointer"}}><Icon d={icons.x} size={18} color="#6b7280"/></button>
                </div>
                <div style={s.fgroup}>
                  <label style={s.label}>Item (leave blank for global rule)</label>
                  <select style={s.input} value={uomForm.item_id} onChange={e=>setUomForm(f=>({...f,item_id:e.target.value}))}>
                    <option value="">Global — applies to all items</option>
                    {items.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,alignItems:"end"}}>
                  <div style={s.fgroup}><label style={s.label}>From UOM</label>
                    <select style={s.input} value={uomForm.from_uom} onChange={e=>setUomForm(f=>({...f,from_uom:e.target.value}))}>
                      <option value="">Select</option>
                      {["tablet","capsule","strip","box","bottle","vial","ampoule","ml","mg","g","kg","l","piece","sachet","puff","tube","pack"].map(u=><option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div style={{textAlign:"center" as const,paddingBottom:14,fontSize:20,color:"#9ca3af"}}>→</div>
                  <div style={s.fgroup}><label style={s.label}>To UOM</label>
                    <select style={s.input} value={uomForm.to_uom} onChange={e=>setUomForm(f=>({...f,to_uom:e.target.value}))}>
                      <option value="">Select</option>
                      {["tablet","capsule","strip","box","bottle","vial","ampoule","ml","mg","g","kg","l","piece","sachet","puff","tube","pack"].map(u=><option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div style={s.fgroup}><label style={s.label}>Factor — 1 {uomForm.from_uom||"from"} = how many {uomForm.to_uom||"to"}?</label>
                  <input type="number" step="0.001" style={s.input} value={uomForm.factor} onChange={e=>setUomForm(f=>({...f,factor:e.target.value}))} placeholder="e.g. 10"/>
                </div>
                {uomForm.from_uom&&uomForm.to_uom&&uomForm.factor&&<div style={{padding:"8px 12px",background:"#eef2ff",borderRadius:6,fontSize:13,color:"#4338ca",marginBottom:12}}>1 {uomForm.from_uom} = {uomForm.factor} {uomForm.to_uom}</div>}
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={()=>{setUomModal(null);setUomRow(null);}} style={{...s.btn("ghost"),border:"1px solid #e5e7eb"}}>Cancel</button>
                  <button onClick={async()=>{
                    if (!uomForm.from_uom||!uomForm.to_uom||!uomForm.factor) { showToast("All fields required"); return; }
                    const isEdit = uomModal==="edit";
                    const url = isEdit?`/api/uom/${uomRow.id}`:"/api/uom";
                    const method = isEdit?"PATCH":"POST";
                    setUomModal(null); setUomRow(null);
                    const res = await fetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify({...uomForm,factor:parseFloat(uomForm.factor)})});
                    if (res.ok) { fetchUom(); showToast(isEdit?"Updated!":"Added!"); }
                    setUomForm({item_id:"",from_uom:"",to_uom:"",factor:""});
                  }} style={s.btn("purple")}>Save</button>
                </div>
              </div></div>
            )}
            <div style={s.card}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <span style={{fontSize:13,fontWeight:600}}>UOM Conversions</span>
                  <span style={{fontSize:12,color:"#6b7280",marginLeft:8}}>Define how units convert (e.g. 1 box = 10 strips)</span>
                </div>
                <button onClick={()=>{setUomForm({item_id:"",from_uom:"",to_uom:"",factor:""});setUomRow(null);setUomModal("add");}} style={{...s.btn("purple"),display:"flex",alignItems:"center",gap:6}}><Icon d={icons.plus} size={13} color="#fff"/> Add Conversion</button>
              </div>
              {uomConversions.length===0?<div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>No conversions yet</div>:
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Item","From","Factor","To","Example","Actions"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {uomConversions.map(c=>(
                    <tr key={c.id}>
                      <td style={{...s.td,fontWeight:600}}>{c.itemName||"Global"}</td>
                      <td style={s.td}><span style={{fontSize:13,fontWeight:700,color:"#6366f1"}}>{c.from_uom}</span></td>
                      <td style={{...s.td,fontWeight:700,fontSize:16,textAlign:"center" as const}}>×{c.factor}</td>
                      <td style={s.td}><span style={{fontSize:13,fontWeight:700,color:"#16a34a"}}>{c.to_uom}</span></td>
                      <td style={{...s.td,fontSize:12,color:"#6b7280"}}>1 {c.from_uom} = {c.factor} {c.to_uom}</td>
                      <td style={s.td}><div style={{display:"flex",gap:5}}>
                        <button onClick={()=>{setUomForm({item_id:c.item_id||"",from_uom:c.from_uom,to_uom:c.to_uom,factor:String(c.factor)});setUomRow(c);setUomModal("edit");}} style={{background:"#eff6ff",border:"none",borderRadius:6,padding:"5px 8px",cursor:"pointer"}}><Icon d={icons.edit} size={12} color="#2563eb"/></button>
                        <button onClick={async()=>{await fetch(`/api/uom/${c.id}`,{method:"DELETE"});fetchUom();showToast("Deleted");}} style={{background:"#fee2e2",border:"none",borderRadius:6,padding:"5px 8px",cursor:"pointer"}}><Icon d={icons.trash} size={12} color="#dc2626"/></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>}
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {tab==="reports" && (
          <div>
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap" as const}}>
              {([["stock","📦 Stock on Hand"],["consumption","📈 Consumption"]] as [string,string][]).map(([type,label])=>(
                <button key={type} onClick={()=>setReportType(type as any)}
                  style={{padding:"8px 18px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",
                    border:`1px solid ${reportType===type?"#6366f1":"#e5e7eb"}`,
                    background:reportType===type?"#6366f1":"#fff",
                    color:reportType===type?"#fff":"#374151"}}>
                  {label}
                </button>
              ))}
              <button onClick={()=>{
                if (!pharmReports.length) return;
                const NL = String.fromCharCode(10);
                const headers = Object.keys(pharmReports[0]).join(",");
                const rows = pharmReports.map(r=>Object.values(r).map(v=>String(v??"").split("\n").join(" ")).join(","));

                const csv = [headers,...rows].join(NL);
                const blob = new Blob([csv],{type:"text/csv"});
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `pharmacy-${reportType}-report-${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
              }} style={{...s.btn("ghost"),border:"1px solid #e5e7eb",marginLeft:"auto",display:"flex",alignItems:"center",gap:5}}>📥 Export CSV</button>
            </div>
            <div style={s.card}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,fontWeight:600}}>{reportType==="stock"?"Stock on Hand":"Consumption Log"}</span>
                <span style={{fontSize:12,color:"#9ca3af"}}>{pharmReports.length} records</span>
              </div>
              {reportLoading?<div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>Loading report...</div>
              :pharmReports.length===0?<div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>No data. <button onClick={fetchPharmReport} style={{color:"#6366f1",background:"none",border:"none",cursor:"pointer"}}>Refresh →</button></div>
              :<div style={{overflowX:"auto"}}>
                {reportType==="stock" && (
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr>{["Item","Code","UOM","Total Stock","Reserved","Available","Reorder","Unit Cost","Selling Price","Total Value","Status"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {pharmReports.map((r:any,i:number)=>{
                        const avail=parseInt(r.totalStock||0)-parseInt(r.reservedStock||0);
                        const val=avail*(parseFloat(r.unitCost||0));
                        const sc=avail===0?{bg:"#fee2e2",color:"#991b1b",label:"Out"}:avail<=parseInt(r.reorderLevel||0)?{bg:"#fef3c7",color:"#92400e",label:"Low"}:{bg:"#d1fae5",color:"#065f46",label:"OK"};
                        return (<tr key={i}><td style={{...s.td,fontWeight:600}}>{r.name}</td><td style={{...s.td,fontFamily:"monospace",fontSize:11,color:"#6b7280"}}>{r.itemcode}</td><td style={s.td}>{r.uom}</td><td style={{...s.td,fontWeight:700}}>{r.totalStock||0}</td><td style={{...s.td,color:"#d97706"}}>{r.reservedStock||0}</td><td style={{...s.td,fontWeight:700,color:sc.color}}>{avail}</td><td style={{...s.td,color:"#6b7280"}}>{r.reorderLevel||0}</td><td style={s.td}>{r.unitCost?`$${parseFloat(r.unitCost).toFixed(2)}`:"—"}</td><td style={{...s.td,color:"#16a34a",fontWeight:600}}>{r.sellingPrice?`$${parseFloat(r.sellingPrice).toFixed(2)}`:"—"}</td><td style={{...s.td,fontWeight:600,color:"#6366f1"}}>${val.toFixed(2)}</td><td style={s.td}><span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:sc.bg,color:sc.color}}>{sc.label}</span></td></tr>);
                      })}
                    </tbody>
                    <tfoot><tr style={{background:"#f9fafb"}}><td colSpan={9} style={{...s.td,fontWeight:700,textAlign:"right" as const}}>Total Value:</td><td style={{...s.td,fontWeight:700,color:"#6366f1",fontSize:15}}>${pharmReports.reduce((sum:number,r:any)=>{const a=parseInt(r.totalStock||0)-parseInt(r.reservedStock||0);return sum+a*(parseFloat(r.unitCost||0));},0).toFixed(2)}</td><td style={s.td}></td></tr></tfoot>
                  </table>
                )}
                {reportType==="consumption" && (
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr>{["Item","Code","Type","Total Qty","Transactions","Last Movement"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                    <tbody>{pharmReports.map((r:any,i:number)=>(<tr key={i}><td style={{...s.td,fontWeight:600}}>{r.itemname||r.name}</td><td style={{...s.td,fontFamily:"monospace",fontSize:11,color:"#6b7280"}}>{r.itemcode}</td><td style={s.td}><span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:"#dbeafe",color:"#1d4ed8"}}>{r.transactiontype||r.type}</span></td><td style={{...s.td,fontWeight:700}}>{r.totalqty||r.quantity}</td><td style={s.td}>{r.txcount||"—"}</td><td style={{...s.td,fontSize:12,color:"#6b7280"}}>{r.lastmoved?new Date(r.lastmoved).toLocaleDateString():"—"}</td></tr>))}</tbody>
                  </table>
                )}
              </div>}
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {tab==="orders" && (
          <div style={s.card}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap" as const}}>
              <span style={{fontSize:13,fontWeight:600}}>Shop Orders</span>
              <div style={{display:"flex",gap:6}}>
                {["ALL","PENDING","DONE","CANCELLED","DELAYED"].map(st=>(
                  <button key={st} onClick={()=>setOrderStatus(st)}
                    style={{padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",
                      border:`1px solid ${orderStatus===st?"#6366f1":"#e5e7eb"}`,
                      background:orderStatus===st?"#6366f1":"#f9fafb",
                      color:orderStatus===st?"#fff":"#374151"}}>
                    {st}
                  </button>
                ))}
              </div>
              <button onClick={fetchOrders} style={{...s.btn("ghost"),border:"1px solid #e5e7eb",display:"flex",alignItems:"center",gap:5}}><Icon d={icons.refresh} size={13} color="#374151"/></button>
              <span style={{fontSize:12,color:"#9ca3af",marginLeft:"auto"}}>{orders.length} orders</span>
            </div>
            {ordersLoading?<div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>Loading...</div>
            :orders.length===0?<div style={{padding:40,textAlign:"center",color:"#9ca3af"}}><div style={{fontSize:32,marginBottom:8}}>📋</div><div style={{fontSize:14,fontWeight:600}}>No orders yet</div><div style={{fontSize:12,marginTop:4}}>Create orders from the Shop List tab</div></div>
            :<div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Order","Supplier","Created By","Items","Total","Created","Status","Actions"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {orders.filter((o:any)=>orderStatus==="ALL"||o.status===orderStatus||(orderStatus==="DELAYED"&&Math.floor((Date.now()-new Date(o.createdat).getTime())/86400000)>3&&o.status==="PENDING")).map((order:any)=>{
                    const daysSince = Math.floor((Date.now()-new Date(order.createdat).getTime())/86400000);
                    const isDelayed = order.status==="PENDING" && daysSince > 3;
                    const status = isDelayed ? "DELAYED" : order.status;
                    const statusColors:Record<string,{bg:string,color:string}>={PENDING:{bg:"#fef3c7",color:"#92400e"},DONE:{bg:"#d1fae5",color:"#065f46"},CANCELLED:{bg:"#fee2e2",color:"#991b1b"},DELAYED:{bg:"#fee2e2",color:"#991b1b"}};
                    const sc = statusColors[status]??{bg:"#f3f4f6",color:"#374151"};
                    return (
                      <tr key={order.id}>
                        <td style={{...s.td,fontFamily:"monospace",fontSize:11,color:"#6366f1"}}>{order.ordernumber??order.id?.slice(0,8)}</td>
                        <td style={{...s.td,fontWeight:600}}>{order.supplier??"—"}</td>
                        <td style={s.td}>{order.createdby??"—"}</td>
                        <td style={{...s.td,fontWeight:600}}>{order.itemcount??0} items</td>
                        <td style={{...s.td,color:"#16a34a",fontWeight:600}}>{order.totalamount?`$${parseFloat(order.totalamount).toFixed(2)}`:"—"}</td>
                        <td style={{...s.td,fontSize:12,color:"#6b7280"}}>{new Date(order.createdat).toLocaleDateString()}{isDelayed&&<div style={{fontSize:10,color:"#dc2626",fontWeight:600}}>{daysSince}d ago</div>}</td>
                        <td style={s.td}><span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:sc.bg,color:sc.color}}>{isDelayed?"⏰ DELAYED":status}</span></td>
                        <td style={s.td}>
                          <div style={{display:"flex",gap:5}}>
                            {["PENDING","DONE","CANCELLED"].map(st=>(
                              <button key={st} onClick={async()=>{
                                const res = await fetch(`/api/pharmacy/shoporders/${order.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:st})});
                                if(res.ok){fetchOrders();showToast(`Marked as ${st}`);}
                              }} style={{padding:"3px 8px",borderRadius:6,fontSize:10,fontWeight:600,cursor:"pointer",
                                border:`1px solid ${order.status===st?"transparent":"#e5e7eb"}`,
                                background:order.status===st?(st==="DONE"?"#d1fae5":st==="CANCELLED"?"#fee2e2":"#fef3c7"):"#f9fafb",
                                color:order.status===st?(st==="DONE"?"#065f46":st==="CANCELLED"?"#991b1b":"#92400e"):"#6b7280"}}>
                                {st}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>}
          </div>
        )}

      </div>

      {/* View Item Modal */}
      {viewItem && <ViewItemModal item={viewItem} onClose={()=>setViewItem(null)} addToShopList={addToShopList} showToast={showToast} />}

      {/* Modals */}
      {showAddItem&&<ItemModal warehouses={pharmaWh} manufacturers={manufacturers} onClose={()=>setShowAddItem(false)} onSuccess={()=>{fetchAll();showToast("Item added!");}}/>}
      {editItem&&<ItemModal item={editItem} warehouses={pharmaWh} manufacturers={manufacturers} onClose={()=>setEditItem(null)} onSuccess={()=>{fetchAll();showToast("Item updated!");}}/>}
      {deleteItem&&<ConfirmModal item={deleteItem} onClose={()=>setDeleteItem(null)} onSuccess={()=>{fetchAll();showToast("Item deactivated");}}/>}
      {batchItem&&<BatchModal item={batchItem} onClose={()=>setBatchItem(null)}/>}
      {showAddDrug&&<AddDrugToPharmacyWizard warehouses={pharmaWh} prefill={drugPrefill} onClose={()=>{setShowAddDrug(false);setDrugPrefill(null);}} onSuccess={()=>{fetchAll();showToast("Medicine added!");setShowAddDrug(false);setDrugPrefill(null);}}/>}
      {toast&&<div style={{position:"fixed",bottom:24,right:24,background:"#16a34a",color:"#fff",padding:"11px 18px",borderRadius:10,fontSize:13,fontWeight:600,zIndex:2000}}>✓ {toast}</div>}
    </div>
  );
}
