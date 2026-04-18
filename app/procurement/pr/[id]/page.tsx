"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const icons = {
  back:   "M19 12H5M12 5l-7 7 7 7",
  check:  "M20 6L9 17l-5-5",
  x:      "M18 6L6 18M6 6l12 12",
  arrow:  "M5 12h14M12 5l7 7-7 7",
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:     { bg: "#f3f4f6", color: "#374151" },
  pending:   { bg: "#fef3c7", color: "#92400e" },
  approved:  { bg: "#d1fae5", color: "#065f46" },
  rejected:  { bg: "#fee2e2", color: "#991b1b" },
  converted: { bg: "#dbeafe", color: "#1e40af" },
};

const s: Record<string, any> = {
  page:    { fontFamily: "Inter,sans-serif", minHeight: "100vh", background: "#f8f9fa" },
  header:  { background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 },
  content: { padding: 24, maxWidth: 1000, margin: "0 auto" },
  card:    { background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", marginBottom: 16, overflow: "hidden" },
  cardHead:{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" },
  th:      { padding: "10px 14px", textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" as const, background: "#f9fafb", borderBottom: "1px solid #e5e7eb" },
  td:      { padding: "12px 14px", borderBottom: "1px solid #f9fafb", fontSize: 13, color: "#111827" },
  btn:     (c: string) => ({ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: c === "blue" ? "#2563eb" : c === "green" ? "#16a34a" : c === "red" ? "#dc2626" : "#f3f4f6", color: c === "ghost" ? "#374151" : "#fff" }),
  input:   { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, color: "#111827", boxSizing: "border-box" as const },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modal:   { background: "#fff", borderRadius: 12, padding: 28, width: 520, maxHeight: "90vh", overflowY: "auto" as const },
};

export default function PRDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<any[]>([]);
  const [showApprove, setShowApprove] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [approvedby, setApprovedby]   = useState("");
  const [approvedQtys, setApprovedQtys] = useState<Record<string, number>>({});
  const [vendorid, setVendorid]   = useState("");
  const [expecteddate, setExpecteddate] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState("");

  const fetchData = () => {
    setLoading(true);
    fetch(`/api/procurement/pr/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); fetch("/api/vendors").then(r => r.json()).then(d => setVendors(Array.isArray(d) ? d : [])); }, [id]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleAction = async (action: string, extra: any = {}) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/procurement/pr/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      showToast(action === "approve" ? "PR approved!" : action === "reject" ? "PR rejected" : "Converted to PO!");
      setShowApprove(false); setShowConvert(false);
      if (action === "convert_to_po" && result.po) {
        router.push(`/procurement/po/${result.po.id}`);
      } else {
        fetchData();
      }
    } catch (e: any) { showToast("Error: " + e.message); }
    finally { setActionLoading(false); }
  };

  if (loading) return <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#9ca3af" }}>Loading...</span></div>;
  if (!data?.pr) return <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#9ca3af" }}>Not found</span></div>;

  const { pr, items } = data;
  const sc = STATUS_COLORS[pr.status] ?? STATUS_COLORS.draft;

  return (
    <div style={s.page}>
      <style>{`* { box-sizing: border-box; } input, select { color: #111827 !important; }`}</style>

      <div style={s.header}>
        <Link href="/procurement" style={{ display: "flex", alignItems: "center", color: "#6b7280", textDecoration: "none" }}>
          <Icon d={icons.back} size={15} />
        </Link>
        <div style={{ width: 1, height: 20, background: "#e5e7eb" }} />
        <span style={{ fontSize: 13, color: "#9ca3af" }}>Procurement</span>
        <span style={{ fontSize: 13, color: "#9ca3af" }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{pr.prnumber}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {pr.status === "pending" && (
            <>
              <button onClick={() => handleAction("reject", { approvedby: "Admin" })} style={s.btn("red")}>Reject</button>
              <button onClick={() => setShowApprove(true)} style={s.btn("green")}>Approve</button>
            </>
          )}
          {pr.status === "approved" && (
            <button onClick={() => setShowConvert(true)} style={{ ...s.btn("blue"), display: "flex", alignItems: "center", gap: 6 }}>
              Convert to PO <Icon d={icons.arrow} size={13} color="#fff" />
            </button>
          )}
        </div>
      </div>

      <div style={s.content}>
        {/* Header card */}
        <div style={s.card}>
          <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
            {[
              { label: "PR Number",    value: pr.prnumber },
              { label: "Status",       value: <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: sc.bg, color: sc.color }}>{pr.status}</span> },
              { label: "Priority",     value: pr.priority },
              { label: "Warehouse",    value: pr.warehousename ?? "—" },
              { label: "Requested By", value: pr.requestedby ?? "—" },
              { label: "Approved By",  value: pr.approvedby ?? "—" },
              { label: "Required Date",value: pr.requireddate ? new Date(pr.requireddate).toLocaleDateString() : "—" },
              { label: "Created",      value: new Date(pr.createdat).toLocaleDateString() },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase" }}>{f.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{f.value}</div>
              </div>
            ))}
          </div>
          {pr.notes && <div style={{ padding: "0 20px 16px", fontSize: 13, color: "#6b7280" }}>Notes: {pr.notes}</div>}
        </div>

        {/* Items table */}
        <div style={s.card}>
          <div style={s.cardHead}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>REQUESTED ITEMS</span>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{items?.length} items</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Item", "Code", "UOM", "Requested Qty", "Approved Qty", "Est. Price", "Total"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items?.map((item: any) => (
                <tr key={item.id}>
                  <td style={{ ...s.td, fontWeight: 600 }}>{item.itemname}</td>
                  <td style={{ ...s.td, fontFamily: "monospace", fontSize: 12, color: "#6b7280" }}>{item.itemcode}</td>
                  <td style={s.td}>{item.uom}</td>
                  <td style={{ ...s.td, fontWeight: 600 }}>{item.requestedqty}</td>
                  <td style={s.td}>{item.approvedqty ?? <span style={{ color: "#d1d5db" }}>—</span>}</td>
                  <td style={s.td}>{item.estimatedprice ? `$${parseFloat(item.estimatedprice).toFixed(2)}` : "—"}</td>
                  <td style={{ ...s.td, fontWeight: 600 }}>
                    {item.estimatedprice && item.requestedqty
                      ? `$${(parseFloat(item.estimatedprice) * item.requestedqty).toFixed(2)}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve Modal */}
      {showApprove && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Approve PR</h3>
              <button onClick={() => setShowApprove(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon d={icons.x} size={18} color="#6b7280" /></button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Approved By *</label>
              <input style={s.input} value={approvedby} onChange={e => setApprovedby(e.target.value)} placeholder="Your name" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 8 }}>Approved Quantities</label>
              {items?.map((item: any) => (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 13 }}>{item.itemname}</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>Req: {item.requestedqty}</span>
                  <input style={{ ...s.input, width: 80 }} type="number"
                    defaultValue={item.requestedqty}
                    onChange={e => setApprovedQtys(q => ({ ...q, [item.id]: parseInt(e.target.value) }))}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowApprove(false)} style={{ ...s.btn("ghost"), border: "1px solid #e5e7eb" }}>Cancel</button>
              <button disabled={actionLoading || !approvedby} onClick={() => handleAction("approve", {
                approvedby,
                approvedItems: items?.map((item: any) => ({ id: item.id, approvedqty: approvedQtys[item.id] ?? item.requestedqty })),
              })} style={s.btn("green")}>{actionLoading ? "Approving..." : "Approve"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to PO Modal */}
      {showConvert && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Convert to Purchase Order</h3>
              <button onClick={() => setShowConvert(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon d={icons.x} size={18} color="#6b7280" /></button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Vendor</label>
              <select style={s.input} value={vendorid} onChange={e => setVendorid(e.target.value)}>
                <option value="">Select vendor (optional)</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Expected Delivery Date</label>
              <input type="date" style={s.input} value={expecteddate} onChange={e => setExpecteddate(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowConvert(false)} style={{ ...s.btn("ghost"), border: "1px solid #e5e7eb" }}>Cancel</button>
              <button disabled={actionLoading} onClick={() => handleAction("convert_to_po", { vendorid: vendorid || null, expecteddate: expecteddate || null })}
                style={{ ...s.btn("blue"), display: "flex", alignItems: "center", gap: 6 }}>
                {actionLoading ? "Converting..." : <><span>Create PO</span><Icon d={icons.arrow} size={13} color="#fff" /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.startsWith("Error") ? "#dc2626" : "#16a34a", color: "#fff", padding: "11px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 2000 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
