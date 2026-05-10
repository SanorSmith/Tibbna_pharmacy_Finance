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
  check:   "M20 6L9 17l-5-5",
  edit:    "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  eye:     "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  arrow:   "M5 12h14M12 5l7 7-7 7",
};

const s: Record<string,any> = {
  page:    { fontFamily:"Inter,sans-serif", minHeight:"100vh", background:"#f8f9fa", color:"#111827" },
  header:  { background:"#fff", borderBottom:"1px solid #e5e7eb", padding:"0 24px", height:56, display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:10 },
  content: { padding:24, maxWidth:1400, margin:"0 auto" },
  card:    { background:"#fff", borderRadius:10, border:"1px solid #e5e7eb", overflow:"hidden", marginBottom:16 },
  th:      { padding:"10px 14px", textAlign:"left" as const, fontSize:11, fontWeight:700, color:"#6b7280", textTransform:"uppercase" as const, background:"#f9fafb", borderBottom:"1px solid #e5e7eb", whiteSpace:"nowrap" as const },
  td:      { padding:"11px 14px", borderBottom:"1px solid #f9fafb", fontSize:13, color:"#111827" },
  btn:     (c:string) => ({ padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", border:"none", background:c==="purple"?"#6366f1":c==="green"?"#16a34a":c==="red"?"#dc2626":c==="blue"?"#2563eb":"#f3f4f6", color:c==="ghost"?"#374151":"#fff" }),
  input:   { width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid #d1d5db", fontSize:13, color:"#111827", boxSizing:"border-box" as const },
  label:   { fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:4 },
  overlay: { position:"fixed" as const, inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 },
  modal:   { background:"#fff", borderRadius:12, padding:28, width:700, maxHeight:"90vh", overflowY:"auto" as const },
  fgroup:  { marginBottom:12 },
  tab:     (a:boolean) => ({ padding:"10px 20px", fontSize:13, fontWeight:500, border:"none", background:"none", cursor:"pointer", borderBottom:a?"2px solid #6366f1":"2px solid transparent", color:a?"#6366f1":"#6b7280" }),
  badge:   (c:string) => {
    const m:Record<string,{bg:string,color:string}> = {
      PENDING:{bg:"#fef3c7",color:"#92400e"}, APPROVED:{bg:"#d1fae5",color:"#065f46"},
      REJECTED:{bg:"#fee2e2",color:"#991b1b"}, ORDERED:{bg:"#dbeafe",color:"#1d4ed8"},
      DRAFT:{bg:"#f3f4f6",color:"#374151"}, SENT:{bg:"#dbeafe",color:"#1d4ed8"},
      RECEIVED:{bg:"#d1fae5",color:"#065f46"}, CANCELLED:{bg:"#fee2e2",color:"#991b1b"},
      PARTIAL:{bg:"#fef3c7",color:"#92400e"}, COMPLETED:{bg:"#d1fae5",color:"#065f46"},
    };
    return m[c] ?? {bg:"#f3f4f6",color:"#374151"};
  },
};

type Tab = "pr"|"po"|"grn";

export default function ProcurementPage() {
  const [tab, setTab]         = useState<Tab>("pr");
  const [prs, setPrs]         = useState<any[]>([]);
  const [pos, setPos]         = useState<any[]>([]);
  const [grns, setGrns]       = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [docItems, setDocItems]       = useState<any[]>([]);
  const [docLoading, setDocLoading]   = useState(false);
  const [toast, setToast]             = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const showToast = (msg:string) => { setToast(msg); setTimeout(()=>setToast(""),3000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [prRes, poRes, grnRes, vRes, wRes] = await Promise.all([
      fetch("/api/procurement/pr"),
      fetch("/api/procurement/po"),
      fetch("/api/procurement/grn"),
      fetch("/api/vendors"),
      fetch("/api/warehouses"),
    ]);
    const [prData, poData, grnData, vData, wData] = await Promise.all([
      prRes.json(), poRes.json(), grnRes.json(), vRes.json(), wRes.json()
    ]);
    setPrs(Array.isArray(prData)?prData:[]);
    setPos(Array.isArray(poData)?poData:[]);
    setGrns(Array.isArray(grnData)?grnData:[]);
    setVendors(Array.isArray(vData)?vData:(vData.vendors??[]));
    const allWh = Array.isArray(wData)?wData:(wData.warehouses??[]);
    setWarehouses(allWh);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const viewDoc = async (doc: any, type: Tab) => {
    setSelectedDoc({...doc, docType: type});
    setDocLoading(true);
    const url = type==="pr" ? `/api/procurement/pr/${doc.id}/items`
               : type==="po" ? `/api/procurement/po/${doc.id}/items`
               : `/api/procurement/grn/${doc.id}/items`;
    const res = await fetch(url);
    const data = await res.json();
    setDocItems(Array.isArray(data)?data:[]);
    setDocLoading(false);
  };

  const updateStatus = async (id: string, type: Tab, status: string) => {
    const url = type==="pr" ? `/api/procurement/pr/${id}`
               : type==="po" ? `/api/procurement/po/${id}`
               : `/api/procurement/grn/${id}`;
    await fetch(url, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status}) });
    fetchAll();
    if (selectedDoc?.id === id) setSelectedDoc((d:any) => d ? {...d, status} : d);
    showToast(`Status updated to ${status}`);
  };

  const createPOFromPR = async (pr: any) => {
   const vendorId = vendors[0]?.id ?? null;
    if (!vendorId) { showToast("No vendors found — add a vendor first"); return; }
    const res = await fetch("/api/procurement/po", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ prid: pr.id, warehouseid: pr.warehouseid, vendorid: vendorId, notes: `From PR ${pr.prnumber}` })
    });
    if (res.ok) { fetchAll(); showToast("Purchase Order created!"); setTab("po"); }
  };

  const filteredPRs = prs.filter(r => statusFilter==="ALL" || r.status===statusFilter);
  const filteredPOs = pos.filter(r => statusFilter==="ALL" || r.status===statusFilter);
  const filteredGRNs = grns.filter(r => statusFilter==="ALL" || r.status===statusFilter);

  const PR_STATUSES = ["ALL","PENDING","APPROVED","REJECTED","ORDERED"];
  const PO_STATUSES = ["ALL","DRAFT","SENT","RECEIVED","CANCELLED"];
  const GRN_STATUSES = ["ALL","DRAFT","PARTIAL","COMPLETED","posted","confirmed"];

  const currentStatuses = tab==="pr" ? PR_STATUSES : tab==="po" ? PO_STATUSES : GRN_STATUSES;

  return (
    <div style={s.page}>
      <style>{`* { box-sizing:border-box; } input,select { color:#111827 !important; } tr:hover td { background:#f9fafb; }`}</style>

      {/* Detail Modal */}
      {selectedDoc && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div>
                <h3 style={{ fontSize:16, fontWeight:600, margin:0 }}>
                  {selectedDoc.docType==="pr" ? `PR: ${selectedDoc.prnumber}`
                  : selectedDoc.docType==="po" ? `PO: ${selectedDoc.ponumber}`
                  : `GRN: ${selectedDoc.grnnumber}`}
                </h3>
                <div style={{ fontSize:12, color:"#6b7280", marginTop:4, display:"flex", gap:12 }}>
                  <span>Status: <strong>{selectedDoc.status}</strong></span>
                  {selectedDoc.warehouseName && <span>Warehouse: {selectedDoc.warehouseName}</span>}
                  {selectedDoc.vendorName && <span>Vendor: {selectedDoc.vendorName}</span>}
                  {selectedDoc.requestedby && <span>Requested by: {selectedDoc.requestedby}</span>}
                  {selectedDoc.receiptdate && <span>Receipt: {new Date(selectedDoc.receiptdate).toLocaleDateString()}</span>}
                </div>
                {selectedDoc.notes && <div style={{ fontSize:12, color:"#374151", marginTop:4, fontStyle:"italic" }}>"{selectedDoc.notes}"</div>}
              </div>
              <button onClick={()=>{setSelectedDoc(null);setDocItems([]);}} style={{ background:"none", border:"none", cursor:"pointer" }}>
                <Icon d={icons.x} size={18} color="#6b7280"/>
              </button>
            </div>

            {/* Status actions */}
            <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" as const }}>
              {selectedDoc.docType==="pr" && selectedDoc.status==="PENDING" && <>
                <button onClick={()=>updateStatus(selectedDoc.id,"pr","APPROVED")} style={{...s.btn("green"),fontSize:11}}>✓ Approve</button>
                <button onClick={()=>updateStatus(selectedDoc.id,"pr","REJECTED")} style={{...s.btn("red"),fontSize:11}}>✕ Reject</button>
              </>}
              {selectedDoc.docType==="pr" && selectedDoc.status==="APPROVED" && (
                <button onClick={()=>createPOFromPR(selectedDoc)} style={{...s.btn("blue"),fontSize:11,display:"flex",alignItems:"center",gap:4}}>
                  <Icon d={icons.arrow} size={12} color="#fff"/> Create PO from this PR
                </button>
              )}
              {selectedDoc.docType==="po" && selectedDoc.status==="DRAFT" && (
                <button onClick={()=>updateStatus(selectedDoc.id,"po","SENT")} style={{...s.btn("blue"),fontSize:11}}>Mark as Sent to Vendor</button>
              )}
              {selectedDoc.docType==="po" && selectedDoc.status==="SENT" && (
                <button onClick={()=>updateStatus(selectedDoc.id,"po","RECEIVED")} style={{...s.btn("green"),fontSize:11}}>Mark as Received</button>
              )}
            {selectedDoc.docType==="grn" && !["COMPLETED","completed"].includes(selectedDoc.status) && (
  <button onClick={()=>updateStatus(selectedDoc.id,"grn","COMPLETED")} style={{...s.btn("green"),fontSize:11}}>Complete GRN (receives stock)</button>
)}
            </div>

            {docLoading ? <div style={{ padding:40, textAlign:"center", color:"#9ca3af" }}>Loading items...</div>
            : docItems.length===0 ? <div style={{ padding:40, textAlign:"center", color:"#9ca3af" }}>No items in this document</div>
            : <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>
                    {selectedDoc.docType==="pr" && ["Item","Requested Qty","Approved Qty","Est. Price","Notes"].map(h=><th key={h} style={s.th}>{h}</th>)}
                    {selectedDoc.docType==="po" && ["Item","Ordered Qty","Received Qty","Unit Price","Total"].map(h=><th key={h} style={s.th}>{h}</th>)}
                    {selectedDoc.docType==="grn" && ["Item","Ordered","Received","Rejected","Batch","Expiry","Unit Price"].map(h=><th key={h} style={s.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {docItems.map((item:any,i:number) => (
                    <tr key={i}>
                      <td style={{...s.td,fontWeight:600}}>{item.itemName||item.itemid||"—"}</td>
                      {selectedDoc.docType==="pr" && <>
                        <td style={{...s.td,fontWeight:700}}>{item.requestedqty}</td>
                        <td style={s.td}>{item.approvedqty??<span style={{color:"#9ca3af"}}>Pending</span>}</td>
                        <td style={s.td}>{item.estimatedprice?`$${parseFloat(item.estimatedprice).toFixed(2)}`:"—"}</td>
                        <td style={{...s.td,fontSize:12,color:"#6b7280"}}>{item.notes||"—"}</td>
                      </>}
                      {selectedDoc.docType==="po" && <>
                        <td style={{...s.td,fontWeight:700}}>{item.orderedqty}</td>
                        <td style={s.td}>{item.receivedqty||0}</td>
                        <td style={s.td}>{item.unitprice?`$${parseFloat(item.unitprice).toFixed(2)}`:"—"}</td>
                        <td style={{...s.td,fontWeight:600,color:"#6366f1"}}>{item.totalamount?`$${parseFloat(item.totalamount).toFixed(2)}`:"—"}</td>
                      </>}
                      {selectedDoc.docType==="grn" && <>
                        <td style={s.td}>{item.orderedqty}</td>
                        <td style={{...s.td,fontWeight:700,color:"#16a34a"}}>{item.receivedqty}</td>
                        <td style={{...s.td,color:"#dc2626"}}>{item.rejectedqty||0}</td>
                        <td style={{...s.td,fontFamily:"monospace",fontSize:11}}>{item.batchnumber||"—"}</td>
                        <td style={s.td}>{item.expirydate?new Date(item.expirydate).toLocaleDateString():"—"}</td>
                        <td style={s.td}>{item.unitprice?`$${parseFloat(item.unitprice).toFixed(2)}`:"—"}</td>
                      </>}
                    </tr>
                  ))}
                </tbody>
                {selectedDoc.docType==="po" && (
                  <tfoot>
                    <tr style={{background:"#f9fafb"}}>
                      <td colSpan={4} style={{...s.td,fontWeight:700,textAlign:"right" as const}}>Total Order Value:</td>
                      <td style={{...s.td,fontWeight:700,color:"#6366f1",fontSize:15}}>
                        ${docItems.reduce((sum:number,i:any)=>sum+(i.totalamount?parseFloat(i.totalamount):0),0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>}
          </div>
        </div>
      )}

      <div style={s.header}>
        <Link href="/" style={{ display:"flex", alignItems:"center", color:"#6b7280", textDecoration:"none" }}><Icon d={icons.back} size={15}/></Link>
        <div style={{ width:1, height:20, background:"#e5e7eb" }}/>
        <span style={{ fontSize:14, fontWeight:700 }}>Procurement</span>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <button onClick={fetchAll} style={{ ...s.btn("ghost"), border:"1px solid #e5e7eb", display:"flex", alignItems:"center", gap:5 }}><Icon d={icons.refresh} size={13} color="#374151"/></button>
        </div>
      </div>

      <div style={s.content}>
        {/* Summary cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
          <div style={{ background:"#fef3c7", borderRadius:10, padding:"14px 18px", cursor:"pointer", border:tab==="pr"?"2px solid #d97706":"1px solid transparent" }} onClick={()=>{setTab("pr");setStatusFilter("ALL");}}>
            <div style={{ fontSize:11, fontWeight:600, color:"#92400e", marginBottom:4 }}>Purchase Requisitions</div>
            <div style={{ fontSize:26, fontWeight:700 }}>{prs.length}</div>
            <div style={{ fontSize:12, color:"#92400e", marginTop:4 }}>Pending: {prs.filter(p=>p.status==="PENDING").length}</div>
          </div>
          <div style={{ background:"#dbeafe", borderRadius:10, padding:"14px 18px", cursor:"pointer", border:tab==="po"?"2px solid #2563eb":"1px solid transparent" }} onClick={()=>{setTab("po");setStatusFilter("ALL");}}>
            <div style={{ fontSize:11, fontWeight:600, color:"#1d4ed8", marginBottom:4 }}>Purchase Orders</div>
            <div style={{ fontSize:26, fontWeight:700 }}>{pos.length}</div>
            <div style={{ fontSize:12, color:"#1d4ed8", marginTop:4 }}>Sent: {pos.filter(p=>p.status==="SENT").length}</div>
          </div>
          <div style={{ background:"#d1fae5", borderRadius:10, padding:"14px 18px", cursor:"pointer", border:tab==="grn"?"2px solid #16a34a":"1px solid transparent" }} onClick={()=>{setTab("grn");setStatusFilter("ALL");}}>
            <div style={{ fontSize:11, fontWeight:600, color:"#065f46", marginBottom:4 }}>Goods Receipts (GRN)</div>
            <div style={{ fontSize:26, fontWeight:700 }}>{grns.length}</div>
            <div style={{ fontSize:12, color:"#065f46", marginTop:4 }}>Completed: {grns.filter(g=>g.status==="COMPLETED").length}</div>
          </div>
        </div>

        {/* Workflow explanation */}
        <div style={{ padding:"12px 16px", background:"#eef2ff", borderRadius:8, marginBottom:16, fontSize:12, color:"#4338ca", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" as const }}>
          <span style={{ fontWeight:600 }}>Workflow:</span>
          <span>Shop List</span><span>→</span>
          <span style={{ background:"#fef3c7", padding:"2px 8px", borderRadius:10, color:"#92400e", fontWeight:600 }}>PR (PENDING)</span><span>→</span>
          <span style={{ background:"#d1fae5", padding:"2px 8px", borderRadius:10, color:"#065f46", fontWeight:600 }}>PR APPROVED</span><span>→</span>
          <span style={{ background:"#dbeafe", padding:"2px 8px", borderRadius:10, color:"#1d4ed8", fontWeight:600 }}>PO SENT</span><span>→</span>
          <span style={{ background:"#d1fae5", padding:"2px 8px", borderRadius:10, color:"#065f46", fontWeight:600 }}>GRN COMPLETED</span><span>→</span>
          <span style={{ fontWeight:600 }}>Stock Increases ✓</span>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:2, marginBottom:0, borderBottom:"1px solid #e5e7eb", background:"#fff", borderRadius:"10px 10px 0 0", padding:"0 8px" }}>
          {(["pr","po","grn"] as Tab[]).map(t=>(
            <button key={t} onClick={()=>{setTab(t);setStatusFilter("ALL");}} style={s.tab(tab===t)}>
              {t==="pr"?`PRs (${prs.length})`:t==="po"?`POs (${pos.length})`:`GRNs (${grns.length})`}
            </button>
          ))}
        </div>

        <div style={s.card}>
          {/* Status filter */}
          <div style={{ padding:"12px 16px", borderBottom:"1px solid #f3f4f6", display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" as const }}>
            {currentStatuses.map(st=>(
              <button key={st} onClick={()=>setStatusFilter(st)}
                style={{ padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer",
                  border:`1px solid ${statusFilter===st?"#6366f1":"#e5e7eb"}`,
                  background:statusFilter===st?"#6366f1":"#f9fafb",
                  color:statusFilter===st?"#fff":"#374151" }}>
                {st}
              </button>
            ))}
            <span style={{ marginLeft:"auto", fontSize:12, color:"#9ca3af" }}>
              {tab==="pr"?filteredPRs.length:tab==="po"?filteredPOs.length:filteredGRNs.length} records
            </span>
          </div>

          {loading ? <div style={{ padding:40, textAlign:"center", color:"#9ca3af" }}>Loading...</div> : <>

            {/* PR TABLE */}
            {tab==="pr" && (
              filteredPRs.length===0 ? <div style={{ padding:40, textAlign:"center", color:"#9ca3af" }}>No purchase requisitions found.<br/><span style={{ fontSize:12 }}>Create one from the Shop List in Pharmacy or Lab.</span></div>
              : <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead><tr>{["PR Number","Requested By","Warehouse","Priority","Items","Status","Created","Actions"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredPRs.map(pr=>{
                      const bd = s.badge(pr.status);
                      return (
                        <tr key={pr.id}>
                          <td style={{...s.td,fontFamily:"monospace",fontWeight:600,color:"#6366f1"}}>{pr.prnumber}</td>
                          <td style={s.td}>{pr.requestedby||"—"}</td>
                          <td style={{...s.td,fontSize:12,color:"#6b7280"}}>{pr.warehouseName||"—"}</td>
                          <td style={s.td}>
                            <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, background:pr.priority==="urgent"?"#fee2e2":"#f3f4f6", color:pr.priority==="urgent"?"#991b1b":"#374151" }}>
                              {pr.priority||"routine"}
                            </span>
                          </td>
                          <td style={{...s.td,fontWeight:600}}>{pr.itemCount||0} items</td>
                          <td style={s.td}><span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, background:bd.bg, color:bd.color }}>{pr.status}</span></td>
                          <td style={{...s.td,fontSize:12,color:"#6b7280"}}>{new Date(pr.createdat).toLocaleDateString()}</td>
                          <td style={s.td}>
                            <div style={{ display:"flex", gap:5 }}>
                              <button onClick={()=>viewDoc(pr,"pr")} style={{ background:"#eef2ff", border:"none", borderRadius:6, padding:"5px 8px", cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:600, color:"#6366f1" }}>
                                <Icon d={icons.eye} size={12} color="#6366f1"/> View
                              </button>
                              {["PENDING","pending","draft","DRAFT"].includes(pr.status) && <>
                                <button onClick={()=>updateStatus(pr.id,"pr","APPROVED")} style={{ background:"#d1fae5", border:"none", borderRadius:6, padding:"5px 8px", cursor:"pointer", fontSize:11, fontWeight:600, color:"#065f46" }}>✓ Approve</button>
                                <button onClick={()=>updateStatus(pr.id,"pr","REJECTED")} style={{ background:"#fee2e2", border:"none", borderRadius:6, padding:"5px 8px", cursor:"pointer", fontSize:11, fontWeight:600, color:"#991b1b" }}>✕ Reject</button>
                              </>}
                              {pr.status==="APPROVED" && (
                                <button onClick={()=>createPOFromPR(pr)} style={{ background:"#dbeafe", border:"none", borderRadius:6, padding:"5px 8px", cursor:"pointer", fontSize:11, fontWeight:600, color:"#1d4ed8", display:"flex", alignItems:"center", gap:3 }}>
                                  <Icon d={icons.arrow} size={11} color="#1d4ed8"/> Create PO
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* PO TABLE */}
            {tab==="po" && (
              filteredPOs.length===0 ? <div style={{ padding:40, textAlign:"center", color:"#9ca3af" }}>No purchase orders found.<br/><span style={{ fontSize:12 }}>Approve a PR and click "Create PO" to generate one.</span></div>
              : <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead><tr>{["PO Number","Vendor","Warehouse","Total Amount","Order Date","Expected","Status","Actions"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredPOs.map(po=>{
                      const bd = s.badge(po.status);
                      return (
                        <tr key={po.id}>
                          <td style={{...s.td,fontFamily:"monospace",fontWeight:600,color:"#6366f1"}}>{po.ponumber}</td>
                          <td style={s.td}>{po.vendorName||"—"}</td>
                          <td style={{...s.td,fontSize:12,color:"#6b7280"}}>{po.warehouseName||"—"}</td>
                          <td style={{...s.td,fontWeight:600,color:"#6366f1"}}>{po.totalamount?`$${parseFloat(po.totalamount).toFixed(2)}`:"—"}</td>
                          <td style={{...s.td,fontSize:12,color:"#6b7280"}}>{po.orderdate?new Date(po.orderdate).toLocaleDateString():"—"}</td>
                          <td style={{...s.td,fontSize:12,color:"#6b7280"}}>{po.expecteddate?new Date(po.expecteddate).toLocaleDateString():"—"}</td>
                          <td style={s.td}><span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, background:bd.bg, color:bd.color }}>{po.status}</span></td>
                          <td style={s.td}>
                            <div style={{ display:"flex", gap:5 }}>
                              <button onClick={()=>viewDoc(po,"po")} style={{ background:"#eef2ff", border:"none", borderRadius:6, padding:"5px 8px", cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:600, color:"#6366f1" }}>
                                <Icon d={icons.eye} size={12} color="#6366f1"/> View
                              </button>
                          {["DRAFT","draft","confirmed"].includes(po.status) && <button onClick={()=>updateStatus(po.id,"po","SENT")} style={{ background:"#dbeafe", border:"none", borderRadius:6, padding:"5px 8px", cursor:"pointer", fontSize:11, fontWeight:600, color:"#1d4ed8" }}>Send to Vendor</button>}
                              {["SENT","sent","posted"].includes(po.status) && <button onClick={()=>updateStatus(po.id,"po","RECEIVED")} style={{ background:"#d1fae5", border:"none", borderRadius:6, padding:"5px 8px", cursor:"pointer", fontSize:11, fontWeight:600, color:"#065f46" }}>Mark Received</button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* GRN TABLE */}
            {tab==="grn" && (
              filteredGRNs.length===0 ? <div style={{ padding:40, textAlign:"center", color:"#9ca3af" }}>No goods receipts found.<br/><span style={{ fontSize:12 }}>GRNs are created when goods arrive against a Purchase Order.</span></div>
              : <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead><tr>{["GRN Number","Vendor","Warehouse","Invoice","Received By","Receipt Date","Status","Actions"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredGRNs.map(grn=>{
                      const bd = s.badge(grn.status);
                      return (
                        <tr key={grn.id}>
                          <td style={{...s.td,fontFamily:"monospace",fontWeight:600,color:"#6366f1"}}>{grn.grnnumber}</td>
                          <td style={s.td}>{grn.vendorName||"—"}</td>
                          <td style={{...s.td,fontSize:12,color:"#6b7280"}}>{grn.warehouseName||"—"}</td>
                          <td style={{...s.td,fontFamily:"monospace",fontSize:12}}>{grn.invoicenumber||"—"}</td>
                          <td style={s.td}>{grn.receivedby||"—"}</td>
                          <td style={{...s.td,fontSize:12,color:"#6b7280"}}>{grn.receiptdate?new Date(grn.receiptdate).toLocaleDateString():"—"}</td>
                          <td style={s.td}><span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, background:bd.bg, color:bd.color }}>{grn.status}</span></td>
                          <td style={s.td}>
                            <button onClick={()=>viewDoc(grn,"grn")} style={{ background:"#eef2ff", border:"none", borderRadius:6, padding:"5px 8px", cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:600, color:"#6366f1" }}>
                              <Icon d={icons.eye} size={12} color="#6366f1"/> View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>}
        </div>
      </div>

      {toast && <div style={{ position:"fixed", bottom:24, right:24, background:"#16a34a", color:"#fff", padding:"11px 18px", borderRadius:10, fontSize:13, fontWeight:600, zIndex:2000 }}>✓ {toast}</div>}
    </div>
  );
}
