"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const icons = {
  back:  "M19 12H5M12 5l-7 7 7 7",
  x:     "M18 6L6 18M6 6l12 12",
  plus:  "M12 5v14M5 12h14",
  check: "M20 6L9 17l-5-5",
  send:  "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:     { bg: "#f3f4f6", color: "#374151" },
  approved:  { bg: "#d1fae5", color: "#065f46" },
  sent:      { bg: "#dbeafe", color: "#1e40af" },
  partial:   { bg: "#fef3c7", color: "#92400e" },
  complete:  { bg: "#d1fae5", color: "#065f46" },
  cancelled: { bg: "#fee2e2", color: "#991b1b" },
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
  input:   { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, color: "#111827", boxSizing: "border-box" as const },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modal:   { background: "#fff", borderRadius: 12, padding: 28, width: 580, maxHeight: "90vh", overflowY: "auto" as const },
  label:   { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 },
  fgroup:  { marginBottom: 14 },
};

export default function PODetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showGRN, setShowGRN] = useState(false);
  const [grnForm, setGrnForm] = useState({ receivedby: "", invoicenumber: "" });
  const [grnItems, setGrnItems] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState("");

  const fetchData = () => {
    setLoading(true);
    fetch(`/api/procurement/po/${id}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        if (d.items) {
          setGrnItems(d.items.map((i: any) => ({
            itemid:      i.itemid,
            poitemid:    i.id,
            itemname:    i.itemname,
            uom:         i.uom,
            orderedqty:  i.orderedqty,
            receivedqty: i.orderedqty - (i.receivedqty ?? 0),
            rejectedqty: 0,
            unitprice:   i.unitprice,
            batchnumber: "",
            expirydate:  "",
          })));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleAction = async (action: string, extra: any = {}) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/procurement/po/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      showToast(action === "approve" ? "PO approved!" : action === "send" ? "PO sent to vendor!" : "GRN created!");
      setShowGRN(false);
      if (action === "create_grn" && result.grn) {
        router.push(`/procurement/grn/${result.grn.id}`);
      } else {
        fetchData();
      }
    } catch (e: any) { showToast("Error: " + e.message); }
    finally { setActionLoading(false); }
  };

  if (loading) return <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#9ca3af" }}>Loading...</span></div>;
  if (!data?.po) return <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#9ca3af" }}>Not found</span></div>;

  const { po, items, grns } = data;
  const sc = STATUS_COLORS[po.status] ?? STATUS_COLORS.draft;

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
        <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{po.ponumber}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {po.status === "draft" && (
            <button onClick={() => handleAction("approve", { approvedby: "Admin" })} style={s.btn("green")}>Approve</button>
          )}
          {po.status === "approved" && (
            <button onClick={() => handleAction("send", { sentby: "Admin" })} style={{ ...s.btn("blue"), display: "flex", alignItems: "center", gap: 6 }}>
              <Icon d={icons.send} size={13} color="#fff" /> Send to Vendor
            </button>
          )}
          {["sent", "partial"].includes(po.status) && (
            <button onClick={() => setShowGRN(true)} style={{ ...s.btn("purple"), display: "flex", alignItems: "center", gap: 6 }}>
              <Icon d={icons.plus} size={13} color="#fff" /> Create GRN
            </button>
          )}
        </div>
      </div>

      <div style={s.content}>
        {/* Header */}
        <div style={s.card}>
          <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
            {[
              { label: "PO Number",   value: po.ponumber },
              { label: "Status",      value: <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: sc.bg, color: sc.color }}>{po.status}</span> },
              { label: "Vendor",      value: po.vendorname ?? "—" },
              { label: "Warehouse",   value: po.warehousename ?? "—" },
              { label: "Order Date",  value: new Date(po.orderdate).toLocaleDateString() },
              { label: "Expected",    value: po.expecteddate ? new Date(po.expecteddate).toLocaleDateString() : "—" },
              { label: "Total",       value: `${po.currency} ${parseFloat(po.totalamount ?? "0").toLocaleString()}` },
              { label: "Pay Terms",   value: po.paymentterms ? `${po.paymentterms} days` : "—" },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase" }}>{f.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        <div style={s.card}>
          <div style={s.cardHead}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>ORDER ITEMS</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Item", "Code", "UOM", "Ordered", "Received", "Pending", "Unit Price", "Total"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items?.map((item: any) => {
                const pending = item.orderedqty - (item.receivedqty ?? 0);
                return (
                  <tr key={item.id}>
                    <td style={{ ...s.td, fontWeight: 600 }}>{item.itemname}</td>
                    <td style={{ ...s.td, fontFamily: "monospace", fontSize: 12, color: "#6b7280" }}>{item.itemcode}</td>
                    <td style={s.td}>{item.uom}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{item.orderedqty}</td>
                    <td style={{ ...s.td, color: "#16a34a", fontWeight: 600 }}>{item.receivedqty ?? 0}</td>
                    <td style={{ ...s.td, color: pending > 0 ? "#d97706" : "#16a34a", fontWeight: 600 }}>{pending}</td>
                    <td style={s.td}>${parseFloat(item.unitprice ?? "0").toFixed(2)}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>${parseFloat(item.totalamount ?? "0").toFixed(2)}</td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={7} style={{ ...s.td, textAlign: "right", fontWeight: 700, background: "#f9fafb" }}>Total</td>
                <td style={{ ...s.td, fontWeight: 700, fontSize: 15, background: "#f9fafb" }}>{po.currency} {parseFloat(po.totalamount ?? "0").toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* GRNs */}
        {grns?.length > 0 && (
          <div style={s.card}>
            <div style={s.cardHead}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>GOODS RECEIPTS</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["GRN Number", "Status", "Date", "Invoice", "Received By", ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {grns.map((grn: any) => {
                  const gsc = { draft: { bg: "#f3f4f6", color: "#374151" }, confirmed: { bg: "#fef3c7", color: "#92400e" }, posted: { bg: "#d1fae5", color: "#065f46" } }[grn.status as string] ?? { bg: "#f3f4f6", color: "#374151" };
                  return (
                    <tr key={grn.id}>
                      <td style={{ ...s.td, fontFamily: "monospace", fontWeight: 600 }}>{grn.grnnumber}</td>
                      <td style={s.td}><span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: gsc.bg, color: gsc.color }}>{grn.status}</span></td>
                      <td style={{ ...s.td, fontSize: 12, color: "#6b7280" }}>{new Date(grn.createdat).toLocaleDateString()}</td>
                      <td style={s.td}>{grn.invoicenumber ?? "—"}</td>
                      <td style={s.td}>{grn.receivedby ?? "—"}</td>
                      <td style={s.td}>
                        <Link href={`/procurement/grn/${grn.id}`} style={{ fontSize: 12, color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>View →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create GRN Modal */}
      {showGRN && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, width: 680 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Create Goods Receipt Note</h3>
              <button onClick={() => setShowGRN(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon d={icons.x} size={18} color="#6b7280" /></button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={s.fgroup}>
                <label style={s.label}>Received By</label>
                <input style={s.input} value={grnForm.receivedby} onChange={e => setGrnForm(f => ({ ...f, receivedby: e.target.value }))} />
              </div>
              <div style={s.fgroup}>
                <label style={s.label}>Invoice Number</label>
                <input style={s.input} value={grnForm.invoicenumber} onChange={e => setGrnForm(f => ({ ...f, invoicenumber: e.target.value }))} />
              </div>
            </div>

            <label style={{ ...s.label, marginBottom: 8 }}>Items Received</label>
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>{["Item", "Ordered", "Received Qty", "Rejected", "Batch No", "Expiry Date"].map(h => <th key={h} style={{ ...s.th, fontSize: 10 }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {grnItems.map((gi, i) => (
                    <tr key={i}>
                      <td style={{ ...s.td, fontSize: 12 }}>{gi.itemname}</td>
                      <td style={{ ...s.td, fontSize: 12 }}>{gi.orderedqty} {gi.uom}</td>
                      <td style={s.td}>
                        <input type="number" style={{ ...s.input, width: 70 }} value={gi.receivedqty}
                          onChange={e => setGrnItems(items => items.map((it, idx) => idx === i ? { ...it, receivedqty: parseInt(e.target.value) || 0 } : it))} />
                      </td>
                      <td style={s.td}>
                        <input type="number" style={{ ...s.input, width: 60 }} value={gi.rejectedqty}
                          onChange={e => setGrnItems(items => items.map((it, idx) => idx === i ? { ...it, rejectedqty: parseInt(e.target.value) || 0 } : it))} />
                      </td>
                      <td style={s.td}>
                        <input style={{ ...s.input, width: 110 }} placeholder="Batch #" value={gi.batchnumber}
                          onChange={e => setGrnItems(items => items.map((it, idx) => idx === i ? { ...it, batchnumber: e.target.value } : it))} />
                      </td>
                      <td style={s.td}>
                        <input type="date" style={{ ...s.input, width: 130 }} value={gi.expirydate}
                          onChange={e => setGrnItems(items => items.map((it, idx) => idx === i ? { ...it, expirydate: e.target.value } : it))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowGRN(false)} style={{ ...s.btn("ghost"), border: "1px solid #e5e7eb" }}>Cancel</button>
              <button disabled={actionLoading} onClick={() => handleAction("create_grn", { ...grnForm, grnItemsData: grnItems })}
                style={s.btn("purple")}>{actionLoading ? "Creating..." : "Create GRN"}</button>
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
