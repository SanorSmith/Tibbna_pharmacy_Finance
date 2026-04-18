"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const icons = {
  back:  "M19 12H5M12 5l-7 7 7 7",
  check: "M20 6L9 17l-5-5",
  post:  "M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16",
};

const s: Record<string, any> = {
  page:    { fontFamily: "Inter,sans-serif", minHeight: "100vh", background: "#f8f9fa" },
  header:  { background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 },
  content: { padding: 24, maxWidth: 1000, margin: "0 auto" },
  card:    { background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", marginBottom: 16, overflow: "hidden" },
  cardHead:{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" },
  th:      { padding: "10px 14px", textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" as const, background: "#f9fafb", borderBottom: "1px solid #e5e7eb" },
  td:      { padding: "12px 14px", borderBottom: "1px solid #f9fafb", fontSize: 13, color: "#111827" },
  btn:     (c: string) => ({ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: c === "blue" ? "#2563eb" : c === "green" ? "#16a34a" : c === "purple" ? "#7c3aed" : "#f3f4f6", color: c === "ghost" ? "#374151" : "#fff" }),
};

const GRN_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:     { bg: "#f3f4f6", color: "#374151" },
  confirmed: { bg: "#fef3c7", color: "#92400e" },
  posted:    { bg: "#d1fae5", color: "#065f46" },
};

export default function GRNDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState("");

  const fetchData = () => {
    setLoading(true);
    fetch(`/api/procurement/grn/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleAction = async (action: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/procurement/grn/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      showToast(action === "confirm" ? "GRN confirmed!" : "✅ Stock updated! Items posted to inventory.");
      fetchData();
    } catch (e: any) { showToast("Error: " + e.message); }
    finally { setActionLoading(false); }
  };

  if (loading) return <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#9ca3af" }}>Loading...</span></div>;
  if (!data?.grn) return <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#9ca3af" }}>Not found</span></div>;

  const { grn, items } = data;
  const sc = GRN_STATUS_COLORS[grn.status] ?? GRN_STATUS_COLORS.draft;
  const totalReceived = items?.reduce((s: number, i: any) => s + (i.receivedqty - (i.rejectedqty ?? 0)), 0) ?? 0;
  const totalRejected = items?.reduce((s: number, i: any) => s + (i.rejectedqty ?? 0), 0) ?? 0;

  return (
    <div style={s.page}>
      <style>{`* { box-sizing: border-box; }`}</style>

      <div style={s.header}>
        <Link href="/procurement" style={{ display: "flex", alignItems: "center", color: "#6b7280", textDecoration: "none" }}>
          <Icon d={icons.back} size={15} />
        </Link>
        <div style={{ width: 1, height: 20, background: "#e5e7eb" }} />
        <span style={{ fontSize: 13, color: "#9ca3af" }}>Procurement</span>
        <span style={{ fontSize: 13, color: "#9ca3af" }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{grn.grnnumber}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {grn.status === "draft" && (
            <button onClick={() => handleAction("confirm")} disabled={actionLoading} style={s.btn("blue")}>
              {actionLoading ? "..." : "Confirm GRN"}
            </button>
          )}
          {grn.status === "confirmed" && (
            <button onClick={() => handleAction("post")} disabled={actionLoading}
              style={{ ...s.btn("green"), display: "flex", alignItems: "center", gap: 6 }}>
              <Icon d={icons.post} size={14} color="#fff" />
              {actionLoading ? "Posting..." : "Post to Stock"}
            </button>
          )}
          {grn.status === "posted" && (
            <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon d={icons.check} size={14} color="#16a34a" /> Posted to Inventory
            </span>
          )}
        </div>
      </div>

      <div style={s.content}>
        {grn.status === "confirmed" && (
          <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#92400e", fontWeight: 500 }}>
            ⚠️ GRN is confirmed. Click "Post to Stock" to update inventory — this will create batches and add quantities to the warehouse.
          </div>
        )}
        {grn.status === "posted" && (
          <div style={{ background: "#d1fae5", border: "1px solid #a7f3d0", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#065f46", fontWeight: 500 }}>
            ✅ Stock has been updated. All received items have been added to inventory with batch and expiry tracking.
          </div>
        )}

        {/* Header */}
        <div style={s.card}>
          <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
            {[
              { label: "GRN Number",    value: grn.grnnumber },
              { label: "Status",        value: <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: sc.bg, color: sc.color }}>{grn.status}</span> },
              { label: "Vendor",        value: grn.vendorname ?? "—" },
              { label: "Warehouse",     value: grn.warehousename ?? "—" },
              { label: "Receipt Date",  value: new Date(grn.receiptdate).toLocaleDateString() },
              { label: "Invoice No",    value: grn.invoicenumber ?? "—" },
              { label: "Received By",   value: grn.receivedby ?? "—" },
              { label: "Total Accepted",value: <span style={{ fontWeight: 700, color: "#16a34a" }}>{totalReceived} units</span> },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase" }}>{f.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary strip */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          {[
            { label: "Items",          value: items?.length ?? 0,  color: "#2563eb", bg: "#eff6ff" },
            { label: "Total Received", value: totalReceived,        color: "#16a34a", bg: "#f0fdf4" },
            { label: "Total Rejected", value: totalRejected,        color: "#dc2626", bg: "#fee2e2" },
          ].map(m => (
            <div key={m.label} style={{ background: m.bg, borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: m.color, marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Items table */}
        <div style={s.card}>
          <div style={s.cardHead}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>RECEIVED ITEMS</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Item", "Code", "UOM", "Received", "Rejected", "Accepted", "Batch No", "Expiry Date", "Unit Price"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items?.map((item: any) => {
                const accepted = item.receivedqty - (item.rejectedqty ?? 0);
                return (
                  <tr key={item.id}>
                    <td style={{ ...s.td, fontWeight: 600 }}>{item.itemname}</td>
                    <td style={{ ...s.td, fontFamily: "monospace", fontSize: 12, color: "#6b7280" }}>{item.itemcode}</td>
                    <td style={s.td}>{item.uom}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{item.receivedqty}</td>
                    <td style={{ ...s.td, color: (item.rejectedqty ?? 0) > 0 ? "#dc2626" : "#9ca3af" }}>{item.rejectedqty ?? 0}</td>
                    <td style={{ ...s.td, fontWeight: 700, color: "#16a34a" }}>{accepted}</td>
                    <td style={{ ...s.td, fontFamily: "monospace", fontSize: 12 }}>{item.batchnumber ?? "—"}</td>
                    <td style={{ ...s.td, fontSize: 12, color: "#6b7280" }}>
                      {item.expirydate ? new Date(item.expirydate).toLocaleDateString() : "—"}
                    </td>
                    <td style={s.td}>{item.unitprice ? `$${parseFloat(item.unitprice).toFixed(2)}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.startsWith("Error") ? "#dc2626" : "#16a34a", color: "#fff", padding: "11px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 2000, maxWidth: 400 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
