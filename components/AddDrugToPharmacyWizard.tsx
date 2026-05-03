"use client";
import { useState, useEffect } from "react";

const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const icons = {
  x:      "M18 6L6 18M6 6l12 12",
  check:  "M20 6L9 17l-5-5",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  pill:   "M10.5 6.5L6.5 10.5M9 3l12 12-6 6L3 9l6-6z",
  arrow:  "M5 12h14M12 5l7 7-7 7",
  arrowLeft: "M19 12H5M12 19l-7-7 7-7",
  warning:"M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  import: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
};

const s: Record<string, any> = {
  overlay: { position:"fixed" as const, inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 },
  modal:   { background:"#fff", borderRadius:14, width:720, maxHeight:"92vh", overflowY:"auto" as const, boxShadow:"0 25px 50px rgba(0,0,0,0.2)" },
  input:   { width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid #d1d5db", fontSize:13, color:"#111827", boxSizing:"border-box" as const },
  inputHL: { width:"100%", padding:"8px 10px", borderRadius:8, border:"2px solid #6366f1", fontSize:13, color:"#111827", boxSizing:"border-box" as const, background:"#eef2ff" },
  label:   { fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:4 },
  fgroup:  { marginBottom:12 },
  btn:     (c:string) => ({ padding:"9px 18px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", border:"none", background:c==="purple"?"#6366f1":c==="green"?"#16a34a":c==="blue"?"#2563eb":"#f3f4f6", color:c==="ghost"?"#374151":"#fff" }),
};

const FORM_COLORS: Record<string,string> = { tablet:"#2563eb", capsule:"#16a34a", injection:"#dc2626", syrup:"#7c3aed", inhaler:"#d97706", cream:"#0891b2" };

// ── Dual Search — searches both pharmacy inventory and global DB ────────────────
function DualSearch({ onSelect, onSelectExisting, workspaceid }: { onSelect:(drug:any)=>void; onSelectExisting:(item:any)=>void; workspaceid:string }) {
  const [query, setQuery]           = useState("");
  const [localResults, setLocalResults]   = useState<any[]>([]);
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (query.length < 2 || !workspaceid) { setLocalResults([]); setGlobalResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const [lr, gr] = await Promise.all([
        fetch(`/api/pharmacy/items?search=${encodeURIComponent(query)}&workspaceId=${workspaceid}&source=inventory&_t=${Date.now()}`, {cache: 'no-store'}).then(r=>r.json()),
        fetch(`/api/drugs/global?search=${encodeURIComponent(query)}&_t=${Date.now()}`, {cache: 'no-store'}).then(r=>r.json()),
      ]);
      const items = lr.items || [];
      setLocalResults(Array.isArray(items)?items.slice(0,5):[]);
      setGlobalResults(Array.isArray(gr)?gr.slice(0,8):[]);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, workspaceid]);

  const total = localResults.length + globalResults.length;

  return (
    <div style={{marginBottom:16}}>
      <div style={{position:"relative"}}>
        <div style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}><Icon d={icons.search} size={14} color="#9ca3af"/></div>
        <input style={{...s.input,paddingLeft:32}} value={query} onChange={e=>setQuery(e.target.value)}
          placeholder="Search by name, generic name, ATC code, barcode..."/>
        {loading&&<span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"#9ca3af"}}>...</span>}
      </div>
      {total > 0 && (
        <div style={{border:"1px solid #e5e7eb",borderRadius:8,marginTop:6,overflow:"hidden",maxHeight:280,overflowY:"auto" as const}}>
          {localResults.length > 0 && (
            <>
              <div style={{padding:"6px 12px",background:"#f0fdf4",fontSize:11,fontWeight:700,color:"#065f46"}}>📦 In Pharmacy Inventory ({localResults.length})</div>
              {localResults.map(item=>(
                <div key={item.id} onClick={()=>{onSelectExisting(item);setQuery("");setLocalResults([]);setGlobalResults([]);}}
                  style={{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid #f9fafb",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fff"}}
                  onMouseEnter={e=>(e.currentTarget.style.background="#f0fdf4")}
                  onMouseLeave={e=>(e.currentTarget.style.background="#fff")}>
                  <div>
                    <div style={{fontWeight:600,fontSize:13}}>{item.name}</div>
                    <div style={{fontSize:11,color:"#6b7280"}}>{item.itemcode} · {item.uom} · Stock: {item.totalStock}</div>
                  </div>
                  <span style={{fontSize:11,color:"#16a34a",fontWeight:600}}>Update Stock →</span>
                </div>
              ))}
            </>
          )}
          {globalResults.length > 0 && (
            <>
              <div style={{padding:"6px 12px",background:"#eff6ff",fontSize:11,fontWeight:700,color:"#1d4ed8",borderTop:localResults.length>0?"1px solid #e5e7eb":"none"}}>🌐 Global Database ({globalResults.length})</div>
              {globalResults.map(d=>{
                const fc = FORM_COLORS[d.form??""]??"#6b7280";
                return (
                  <div key={d.drugid} onClick={()=>{onSelect(d);setQuery("");setLocalResults([]);setGlobalResults([]);}}
                    style={{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid #f9fafb",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fff"}}
                    onMouseEnter={e=>(e.currentTarget.style.background="#eff6ff")}
                    onMouseLeave={e=>(e.currentTarget.style.background="#fff")}>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{d.name}</div>
                      <div style={{fontSize:11,color:"#6b7280"}}>{d.genericname} {d.atccode&&`· ${d.atccode}`}</div>
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      {d.form&&<span style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:20,background:`${fc}18`,color:fc}}>{d.form}</span>}
                      <span style={{fontSize:11,color:"#2563eb",fontWeight:600}}>Import →</span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MfgSearch({ value, manufacturers, onChange }: { value:string; manufacturers:any[]; onChange:(v:string)=>void }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen]   = useState(false);
  const filtered = manufacturers.filter(m => !query || m.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <div style={{position:"relative"}}>
      <input style={s.input} value={query} placeholder="Search manufacturer..."
        onChange={e=>{setQuery(e.target.value);onChange(e.target.value);setOpen(true);}}
        onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)}/>
      {open && filtered.length > 0 && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1px solid #e5e7eb",borderRadius:8,boxShadow:"0 4px 12px rgba(0,0,0,0.1)",zIndex:200,maxHeight:180,overflowY:"auto" as const}}>
          {filtered.slice(0,10).map(m=>(
            <div key={m.id} onMouseDown={()=>{setQuery(m.name);onChange(m.name);setOpen(false);}}
              style={{padding:"8px 12px",cursor:"pointer",fontSize:13,borderBottom:"1px solid #f3f4f6"}}
              onMouseEnter={e=>(e.currentTarget.style.background="#f9fafb")}
              onMouseLeave={e=>(e.currentTarget.style.background="#fff")}>
              <strong>{m.name}</strong>{m.country&&<span style={{fontSize:11,color:"#6b7280",marginLeft:6}}>{m.country}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SupplierSearch({ value, suppliers, onChange }: { value:string; suppliers:any[]; onChange:(v:string)=>void }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen]   = useState(false);
  const filtered = suppliers.filter(s => !query || s.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <div style={{position:"relative"}}>
      <input style={s.input} value={query} placeholder="Search supplier..."
        onChange={e=>{setQuery(e.target.value);onChange(e.target.value);setOpen(true);}}
        onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)}/>
      {open && filtered.length > 0 && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1px solid #e5e7eb",borderRadius:8,boxShadow:"0 4px 12px rgba(0,0,0,0.1)",zIndex:200,maxHeight:180,overflowY:"auto" as const}}>
          {filtered.slice(0,10).map(s=>(
            <div key={s.id} onMouseDown={()=>{setQuery(s.name);onChange(s.name);setOpen(false);}}
              style={{padding:"8px 12px",cursor:"pointer",fontSize:13,borderBottom:"1px solid #f3f4f6"}}
              onMouseEnter={e=>(e.currentTarget.style.background="#f9fafb")}
              onMouseLeave={e=>(e.currentTarget.style.background="#fff")}>
              <strong>{s.name}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StorageSearch({ value, storageLocations, onChange }: { value:string; storageLocations:any[]; onChange:(v:string)=>void }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen]   = useState(false);
  const DEFAULT_SHELVES = ["Shelf A-1","Shelf A-2","Shelf B-1","Shelf B-2","Shelf C-1","Shelf C-2","Fridge 1","Fridge 2","Freezer 1","Cabinet 1","Controlled Room","Dispensary Counter"];
  const existingNames    = storageLocations.map(s=>s.name);
  const allOptions       = [...new Set([...DEFAULT_SHELVES,...existingNames])];
  const filtered         = allOptions.filter(s => !query || s.toLowerCase().includes(query.toLowerCase()));
  const showCreate       = query.trim() && !allOptions.find(s=>s.toLowerCase()===query.toLowerCase());
  return (
    <div style={{position:"relative"}}>
      <input style={s.input} value={query} placeholder="Search or type shelf name..."
        onChange={e=>{setQuery(e.target.value);onChange(e.target.value);setOpen(true);}}
        onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)}/>
      {open && (filtered.length>0||showCreate) && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1px solid #6366f1",borderRadius:8,boxShadow:"0 4px 12px rgba(99,102,241,0.15)",zIndex:200,maxHeight:200,overflowY:"auto" as const}}>
          {filtered.slice(0,10).map(s=>(
            <div key={s} onMouseDown={()=>{setQuery(s);onChange(s);setOpen(false);}}
              style={{padding:"8px 12px",cursor:"pointer",fontSize:13,borderBottom:"1px solid #f3f4f6"}}
              onMouseEnter={e=>(e.currentTarget.style.background="#f9fafb")}
              onMouseLeave={e=>(e.currentTarget.style.background="#fff")}>
              📍 {s}
            </div>
          ))}
          {showCreate && (
            <div onMouseDown={()=>{setQuery(query);onChange(query);setOpen(false);}}
              style={{padding:"8px 12px",cursor:"pointer",fontSize:13,color:"#6366f1",fontWeight:600,borderTop:"1px solid #e5e7eb",display:"flex",alignItems:"center",gap:6}}
              onMouseEnter={e=>(e.currentTarget.style.background="#eef2ff")}
              onMouseLeave={e=>(e.currentTarget.style.background="#fff")}>
              ➕ Create new: "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  warehouses: any[];
  workspaceid: string;
  prefill?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddDrugToPharmacyWizard({ warehouses, workspaceid, prefill, onClose, onSuccess }: Props) {
  const [entryType, setEntryType] = useState<"medicine"|"item"|null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [suppliers, setSuppliers]     = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [storageLocations, setStorageLocations] = useState<any[]>([]);
  const [existingItem, setExistingItem] = useState<any>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [existingShelves, setExistingShelves] = useState<string[]>([]);
  const [isUpdate, setIsUpdate]       = useState(prefill?._isUpdate ?? false);

  const [form, setForm] = useState({
    name:         prefill?.name         ?? "",
    genericname:  prefill?.genericname  ?? "",
    atccode:      prefill?.atccode      ?? "",
    form:         prefill?.form         ?? "tablet",
    strength:     prefill?.strength     ?? "",
    unit:         prefill?.unit         ?? "tablet",
    barcode:      prefill?.barcode      ?? "",
    manufacturer: prefill?.manufacturer ?? "",
    supplier:     "",
    storage_location: "",
    storage_type: "",
    expiry_date:  "",
    lot_number:   "",
    price_type:             "fixed",
    insurance_coverage_pct: "0",
    selling_price:          "",
    unit_cost:              "",
    uom:          prefill?.unit ?? "tablet",
    itemcode:     "",
    min_level:    "5",
    max_level:    "100",
    warehouseid:  warehouses[0]?.id ?? "",
    initial_quantity: "0",
  });

  const set = (k:string, v:any) => setForm(f=>({...f,[k]:v}));

  useEffect(() => {
    fetch("/api/pharmacy/suppliers").then(r=>r.json()).then(d=>setSuppliers(Array.isArray(d)?d:[]));
    fetch("/api/pharmacy/manufacturers").then(r=>r.json()).then(d=>setManufacturers(Array.isArray(d)?d:[]));
    fetch("/api/pharmacy/storage").then(r=>r.json()).then(d=>{
      setStorageLocations(Array.isArray(d)?d:[]);
      setExistingShelves(Array.isArray(d)?d.map((s:any)=>s.name):[]);
    });
  }, []);

  // Check pharmacy inventory as user types
  useEffect(() => {
    // Only check for duplicates when adding medicines, not items (to prevent flickering)
    if (!form.name.trim() || isUpdate || entryType !== "medicine") return;
    const t = setTimeout(async () => {
      setCheckingExisting(true);
      const res = await fetch(`/api/pharmacy/items?search=${encodeURIComponent(form.name)}&workspaceId=${workspaceid}&source=inventory&_t=${Date.now()}`, {cache: 'no-store'});
      const data = await res.json();
      const items = data.items || [];
      const exact = Array.isArray(items) ? items.find((i:any) => i.name.toLowerCase() === form.name.toLowerCase()) : null;
      if (exact) {
        setExistingItem(exact);
        setIsUpdate(true);
      } else {
        setExistingItem(null);
        setIsUpdate(false);
      }
      setCheckingExisting(false);
    }, 600);
    return () => clearTimeout(t);
  }, [form.name, entryType, workspaceid]);

  const fillFromGlobal = (drug:any) => {
    setForm(f=>({...f,
      name: drug.name??"",
      genericname: drug.genericname??"",
      atccode: drug.atccode??"",
      form: drug.form??f.form,
      strength: drug.strength??"",
      unit: drug.unit??f.unit,
      uom: drug.unit??f.uom,
      manufacturer: drug.manufacturer??"",
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Drug name is required"); return; }
    if (!form.manufacturer.trim()) { setError("Manufacturer is required"); return; }
    setLoading(true);
    try {
      if (isUpdate && existingItem) {
        const res = await fetch("/api/pharmacy/adjustments", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            itemId: existingItem.id,
            warehouseId: form.warehouseid,
            adjustmentQty: parseInt(form.initial_quantity)||0,
            reason: "Stock update via Add Medicine",
            createdBy: "Pharmacy",
            unitCost: form.unit_cost ? parseFloat(form.unit_cost) : null,
            sellingPrice: form.selling_price ? parseFloat(form.selling_price) : null,
            manufacturer: form.manufacturer || null,
          })
        });
        if (!res.ok) throw new Error("Failed to update stock");
      } else {
        // Add to items table (inventory) instead of global_drugs
        const itemPayload = {
          name: form.name,
          genericname: form.genericname,
          itemcode: form.itemcode || form.barcode || form.name.substring(0, 10).toUpperCase(),
          uom: form.unit || "tablet",
          inventorycategory: entryType === "medicine" ? "pharmacy" : "supplies",
          itemtype: entryType === "medicine" ? "drug" : "supply",
          manufacturer: form.manufacturer,
          barcode: form.barcode,
          form: form.form || undefined,
          strength: form.strength || undefined,
          atccode: form.atccode || undefined,
          storage_location: form.storage_location || undefined,
          storage_type: form.storage_type || undefined,
          minlevel: form.min_level ? parseInt(form.min_level) : undefined,
          maxlevel: form.max_level ? parseInt(form.max_level) : undefined,
          // Add stock if warehouse and quantity provided
          addStock: !!form.warehouseid && !!form.initial_quantity && parseFloat(form.initial_quantity) > 0,
          warehouseid: form.warehouseid,
          batchnumber: form.lot_number || `B${Date.now()}`,
          quantity: form.initial_quantity ? parseFloat(form.initial_quantity) : 0,
          unitcost: form.unit_cost ? parseFloat(form.unit_cost) : undefined,
          sellingprice: form.selling_price ? parseFloat(form.selling_price) : undefined,
          expirydate: form.expiry_date || undefined,
        };
        const res = await fetch(`/api/d/${workspaceid}/items`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify(itemPayload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error??"Failed");
      }
      onSuccess(); onClose();
    } catch(e:any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const sellingPrice = parseFloat(form.selling_price)||0;
  const patientPays  = sellingPrice * (1 - parseFloat(form.insurance_coverage_pct)/100);
  const insurancePays= sellingPrice - patientPays;

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        {/* Back Button Row */}
        {entryType && !isUpdate && (
          <div style={{padding:"12px 24px",borderBottom:"1px solid #f3f4f6"}}>
            <button 
              onClick={() => {
                setEntryType(null);
                setError("");
              }}
              style={{background:"none",border:"none",cursor:"pointer",padding:"6px 6px",display:"flex",alignItems:"center",gap:6,color:"#6b7280",fontSize:13,fontWeight:600,borderRadius:6,transition:"background 0.2s"}}
              title="Back"
              onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
              onMouseLeave={(e) => e.currentTarget.style.background = "none"}
            >
              <Icon d={icons.arrowLeft} size={16} color="#6b7280"/>
              Back to Selection
            </button>
          </div>
        )}
        
        {/* Header */}
        <div style={{padding:"20px 24px",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,background:"#ede9fe",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon d={icons.pill} size={16} color="#6366f1"/></div>
            <div>
              <div style={{fontSize:15,fontWeight:700}}>{isUpdate?"Update Stock":entryType?`Add ${entryType === "medicine" ? "Medicine" : "Item/Supply"}`:"Add Medicine or Item"}</div>
              <div style={{fontSize:12,color:"#6b7280"}}>Fill in the details below</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer"}}><Icon d={icons.x} size={18} color="#6b7280"/></button>
        </div>

        <div style={{padding:"20px 24px"}}>
          {error && <div style={{background:"#fee2e2",color:"#991b1b",borderRadius:8,padding:"8px 12px",fontSize:13,marginBottom:14}}>{error}</div>}

          {/* Existing drug warning */}
          {isUpdate && existingItem && (
            <div style={{padding:"12px 16px",background:"#fef3c7",borderRadius:8,marginBottom:16,fontSize:13,color:"#92400e",display:"flex",alignItems:"center",gap:8}}>
              <Icon d={icons.warning} size={16} color="#d97706"/>
              <div><strong>{existingItem.name}</strong> already in pharmacy (Stock: {existingItem.totalStock} {existingItem.uom}). Only stock quantity will be updated.</div>
            </div>
          )}

          {/* Dual Search - shown before entry type selector */}
          {!isUpdate && (
            <DualSearch
              workspaceid={workspaceid}
              onSelect={(drug)=>{
                setEntryType("medicine");
                fillFromGlobal(drug);
              }}
              onSelectExisting={(item)=>{
                setIsUpdate(true);
                setExistingItem(item);
                setForm(f=>({
                  ...f,
                  name: item.name,
                  genericname: item.genericName ?? f.genericname,
                  form: item.itemType ?? f.form,
                  unit_cost: String(item.unitCost ?? ""),
                  selling_price: String(item.sellingPrice ?? ""),
                  uom: item.uom ?? f.uom,
                }));
              }}
            />
          )}

          {/* Entry type selector */}
          {!entryType && !isUpdate && (
            <div style={{marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:600,color:"#374151",marginBottom:12}}>What are you adding?</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <button onClick={()=>setEntryType("medicine")} style={{padding:"16px",borderRadius:10,border:"2px solid #6366f1",background:"#eef2ff",cursor:"pointer",textAlign:"left" as const}}>
                  <div style={{fontSize:18,marginBottom:4}}>💊</div>
                  <div style={{fontWeight:700,fontSize:14,color:"#6366f1"}}>Medicine / Drug</div>
                  <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>Prescription or OTC drug</div>
                </button>
                <button onClick={()=>setEntryType("item")} style={{padding:"16px",borderRadius:10,border:"2px solid #16a34a",background:"#f0fdf4",cursor:"pointer",textAlign:"left" as const}}>
                  <div style={{fontSize:18,marginBottom:4}}>📦</div>
                  <div style={{fontWeight:700,fontSize:14,color:"#16a34a"}}>Item / Supply</div>
                  <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>Device, cosmetic, supply</div>
                </button>
              </div>
            </div>
          )}
          {checkingExisting && <div style={{fontSize:12,color:"#6b7280",marginBottom:8}}>🔍 Checking pharmacy inventory...</div>}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {/* Item/Medicine name */}
            <div style={{gridColumn:"1/-1",...s.fgroup}}>
              <label style={s.label}>{entryType === "item" ? "Item Name" : "Medicine Name"} *</label>
              <input style={s.input} value={form.name} onChange={e=>set("name",e.target.value)} placeholder={entryType === "item" ? "e.g. Syringe 10ml" : "e.g. Amoxicillin"}/>
            </div>

            {!isUpdate && entryType === "medicine" && <>
              <div style={s.fgroup}><label style={s.label}>Generic Name</label><input style={s.input} value={form.genericname} onChange={e=>set("genericname",e.target.value)}/></div>
              <div style={s.fgroup}><label style={s.label}>ATC Code</label><input style={s.input} value={form.atccode} onChange={e=>set("atccode",e.target.value)} placeholder="e.g. J01CA04"/></div>
              <div style={s.fgroup}><label style={s.label}>Form</label>
                <select style={s.input} value={form.form} onChange={e=>set("form",e.target.value)}>
                  {["tablet","capsule","syrup","injection","inhaler","cream","drops","sachet","ampoule","vial"].map(f=><option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</option>)}
                </select>
              </div>
              <div style={s.fgroup}><label style={s.label}>Strength</label><input style={s.input} value={form.strength} onChange={e=>set("strength",e.target.value)} placeholder="e.g. 500mg"/></div>
              <div style={s.fgroup}><label style={s.label}>Unit</label>
                <select style={s.input} value={form.unit} onChange={e=>{set("unit",e.target.value);set("uom",e.target.value);}}>
                  {["tablet","capsule","ml","mg","g","puff","ampoule","vial","sachet","piece"].map(u=><option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div style={s.fgroup}><label style={s.label}>Barcode</label><input style={s.input} value={form.barcode} onChange={e=>set("barcode",e.target.value)}/></div>
              <div style={s.fgroup}><label style={s.label}>Expiry Date</label><input type="date" style={s.input} value={form.expiry_date} onChange={e=>set("expiry_date",e.target.value)}/></div>
            </>}

            {!isUpdate && entryType === "item" && <>
              <div style={s.fgroup}><label style={s.label}>Item Type</label>
                <select style={s.input} value={form.form} onChange={e=>set("form",e.target.value)}>
                  {["device","consumable","cosmetic","supply","equipment"].map(f=><option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</option>)}
                </select>
              </div>
              <div style={s.fgroup}><label style={s.label}>Description</label><input style={s.input} value={form.genericname} onChange={e=>set("genericname",e.target.value)} placeholder="Brief description"/></div>
              <div style={s.fgroup}><label style={s.label}>Unit of Measure</label>
                <select style={s.input} value={form.unit} onChange={e=>{set("unit",e.target.value);set("uom",e.target.value);}}>
                  {["piece","box","pack","roll","bottle","tube","kit","set","pair"].map(u=><option key={u} value={u}>{u.charAt(0).toUpperCase()+u.slice(1)}</option>)}
                </select>
              </div>
              <div style={s.fgroup}><label style={s.label}>Model/SKU</label><input style={s.input} value={form.strength} onChange={e=>set("strength",e.target.value)} placeholder="Model or SKU number"/></div>
              <div style={s.fgroup}><label style={s.label}>Barcode</label><input style={s.input} value={form.barcode} onChange={e=>set("barcode",e.target.value)}/></div>
              <div style={s.fgroup}><label style={s.label}>Expiry Date (if applicable)</label><input type="date" style={s.input} value={form.expiry_date} onChange={e=>set("expiry_date",e.target.value)}/></div>
            </>}

            {/* Manufacturer */}
            <div style={{...s.fgroup,position:"relative"}}><label style={{...s.label,color:"#dc2626"}}>Manufacturer * {!form.manufacturer&&<span style={{fontSize:10}}>⚡ Required</span>}</label>
              <MfgSearch value={form.manufacturer} manufacturers={manufacturers} onChange={v=>set("manufacturer",v)}/>
            </div>

            {/* Supplier */}
            <div style={{...s.fgroup,position:"relative"}}><label style={s.label}>Supplier</label>
              <SupplierSearch value={form.supplier} suppliers={suppliers} onChange={v=>set("supplier",v)}/>
            </div>

            {/* Storage Location / Shelf — always visible */}
            <div style={{...s.fgroup,position:"relative"}}>
              <label style={s.label}>📍 Storage Location / Shelf</label>
              <StorageSearch value={form.storage_location} storageLocations={storageLocations} onChange={v=>set("storage_location",v)}/>
              {form.storage_location && (
                <div style={{fontSize:11,color:"#16a34a",marginTop:3,fontWeight:600}}>📍 {form.storage_location}</div>
              )}
            </div>
            <div style={s.fgroup}>
              <label style={s.label}>Storage Type</label>
              <select style={s.input} value={form.storage_type??""} onChange={e=>set("storage_type",e.target.value)}>
                <option value="">— Select type —</option>
                {["shelf","fridge","freezer","cabinet","room","controlled","drawer"].map(t=>(
                  <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Pricing */}
            <div style={{gridColumn:"1/-1",borderTop:"1px solid #f3f4f6",paddingTop:12,marginTop:4}}>
              <div style={{fontSize:12,fontWeight:600,color:"#374151",marginBottom:10}}>💰 Pricing</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {entryType==="medicine" && (
                  <div style={{gridColumn:"1/-1",...s.fgroup}}>
                    <label style={s.label}>Price Type</label>
                    <div style={{display:"flex",gap:8}}>
                      {["fixed","insurance"].map(pt=>(
                        <button key={pt} type="button" onClick={()=>set("price_type",pt)}
                          style={{flex:1,padding:"8px 12px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",
                            border:`2px solid ${form.price_type===pt?"#6366f1":"#e5e7eb"}`,
                            background:form.price_type===pt?"#eef2ff":"#fff",
                            color:form.price_type===pt?"#6366f1":"#6b7280"}}>
                          {pt==="fixed"?"💵 Fixed Price":"🏥 Insurance"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div style={s.fgroup}>
                  <label style={{...s.label,color:"#dc2626"}}>Purchase Price *</label>
                  <input type="number" step="0.01" style={{...isUpdate?s.inputHL:s.input,border:!form.unit_cost?"2px solid #fca5a5":"1px solid #d1d5db"}} value={form.unit_cost} onChange={e=>set("unit_cost",e.target.value)} placeholder="0.00"/>
                  {!form.unit_cost&&<div style={{fontSize:11,color:"#dc2626",marginTop:2}}>⚡ Required</div>}
                </div>
                <div style={s.fgroup}>
                  <label style={{...s.label,color:"#dc2626"}}>Selling Price *</label>
                  <input type="number" step="0.01" style={{...isUpdate?s.inputHL:s.input,border:!form.selling_price?"2px solid #fca5a5":"1px solid #d1d5db"}} value={form.selling_price} onChange={e=>set("selling_price",e.target.value)} placeholder="0.00"/>
                  {!form.selling_price&&<div style={{fontSize:11,color:"#dc2626",marginTop:2}}>⚡ Required</div>}
                </div>
                {entryType==="medicine" && form.price_type==="insurance" && (
                  <div style={s.fgroup}>
                    <label style={s.label}>Insurance Coverage %</label>
                    <input type="number" min="0" max="100" style={s.input} value={form.insurance_coverage_pct} onChange={e=>set("insurance_coverage_pct",e.target.value)} placeholder="e.g. 80"/>
                  </div>
                )}
                {sellingPrice > 0 && (
                  <div style={{gridColumn:"1/-1",padding:"8px 12px",background:form.price_type==="insurance"?"#eef2ff":"#f0fdf4",borderRadius:6,fontSize:12}}>
                    {form.price_type==="insurance" && parseFloat(form.insurance_coverage_pct)>0 ? (
                      <span>🏥 Insurance pays: <strong style={{color:"#6366f1"}}>${insurancePays.toFixed(2)}</strong> · 👤 Patient pays: <strong style={{color:"#16a34a"}}>${patientPays.toFixed(2)}</strong></span>
                    ) : (
                      <span style={{color:"#16a34a"}}>👤 Patient pays full price: <strong>{sellingPrice.toFixed(2)} IQD</strong></span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Inventory */}
            <div style={{gridColumn:"1/-1",borderTop:"1px solid #f3f4f6",paddingTop:12,marginTop:4}}>
              <div style={{fontSize:12,fontWeight:600,color:"#374151",marginBottom:10}}>📦 Inventory</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={s.fgroup}><label style={{...s.label,color:"#dc2626"}}>Warehouse * {!form.warehouseid&&<span style={{fontSize:10}}>⚡ Required</span>}</label>
                  <select style={s.input} value={form.warehouseid} onChange={e=>set("warehouseid",e.target.value)}>
                    <option value="">Select warehouse</option>
                    {warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div style={s.fgroup}>
                  <label style={{...s.label,color:isUpdate?"#6366f1":"#374151",fontWeight:isUpdate?700:600}}>
                    {isUpdate?"Quantity to Add":"Initial Quantity"}
                    {isUpdate&&existingItem&&<span style={{marginLeft:8,fontSize:11,color:"#6b7280",fontWeight:400}}>(Current: {existingItem.totalStock})</span>}
                  </label>
                  <input type="number" style={isUpdate?s.inputHL:s.input} value={form.initial_quantity} onChange={e=>set("initial_quantity",e.target.value)}/>
                  {isUpdate&&<div style={{fontSize:11,color:"#6366f1",marginTop:4}}>New total: {(parseInt(existingItem?.totalStock)||0)+(parseInt(form.initial_quantity)||0)}</div>}
                </div>
                <div style={s.fgroup}><label style={s.label}>Lot Number</label><input style={s.input} value={form.lot_number} onChange={e=>set("lot_number",e.target.value)} placeholder="B123456789"/></div>
                <div style={s.fgroup}><label style={s.label}>Expiry Date</label><input type="date" style={s.input} value={form.expiry_date} onChange={e=>set("expiry_date",e.target.value)}/></div>
                {!isUpdate && <>
                  <div style={s.fgroup}><label style={s.label}>Item Code</label><input style={s.input} value={form.itemcode} onChange={e=>set("itemcode",e.target.value)} placeholder="Auto if blank"/></div>
                  <div style={s.fgroup}><label style={s.label}>Unit of Measure</label>
                    <select style={s.input} value={form.uom} onChange={e=>set("uom",e.target.value)}>
                      {["tablet","capsule","ml","mg","g","puff","ampoule","vial","sachet","piece","strip","bottle"].map(u=><option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div style={s.fgroup}><label style={s.label}>Min Level</label><input type="number" style={s.input} value={form.min_level} onChange={e=>set("min_level",e.target.value)}/></div>
                  <div style={s.fgroup}><label style={s.label}>Max Level</label><input type="number" style={s.input} value={form.max_level} onChange={e=>set("max_level",e.target.value)}/></div>
                </>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:"16px 24px",borderTop:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <button onClick={onClose} style={{...s.btn("ghost"),border:"1px solid #e5e7eb"}}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading} style={{...s.btn(isUpdate?"green":"purple"),display:"flex",alignItems:"center",gap:6}}>
            {loading?"Saving...":isUpdate?<><Icon d={icons.check} size={13} color="#fff"/> Update Stock</>:<><Icon d={icons.check} size={13} color="#fff"/> Add {entryType === "item" ? "Item" : "Medicine"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
