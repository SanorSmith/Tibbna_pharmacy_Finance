"use client";

import { useState } from "react";

export default function CleanupInventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  
  const [duplicateDrugs, setDuplicateDrugs] = useState<any[]>([]);
  const [loadingDrugs, setLoadingDrugs] = useState(false);
  const [deletingDrugs, setDeletingDrugs] = useState(false);
  const [drugMessage, setDrugMessage] = useState("");
  const [workspaceTotal, setWorkspaceTotal] = useState(0);
  const [globalTotal, setGlobalTotal] = useState(0);

  const loadItems = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/cleanup-zero-stock");
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
        setMessage(data.message);
      } else {
        setMessage("Error: " + data.error);
      }
    } catch (error: any) {
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteItems = async () => {
    if (!confirm(`Are you sure you want to delete ${items.length} items with no stock? This cannot be undone!`)) {
      return;
    }

    setDeleting(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/cleanup-zero-stock", {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ ${data.message}`);
        setItems([]);
      } else {
        setMessage("❌ Error: " + data.error);
      }
    } catch (error: any) {
      setMessage("❌ Error: " + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const loadDuplicateDrugs = async () => {
    setLoadingDrugs(true);
    setDrugMessage("");
    try {
      const res = await fetch("/api/admin/cleanup-duplicate-drugs");
      const data = await res.json();
      if (res.ok) {
        setDuplicateDrugs(data.duplicates || []);
        setWorkspaceTotal(data.workspaceTotal || 0);
        setGlobalTotal(data.globalTotal || 0);
        setDrugMessage(data.message);
      } else {
        setDrugMessage("Error: " + data.error);
      }
    } catch (error: any) {
      setDrugMessage("Error: " + error.message);
    } finally {
      setLoadingDrugs(false);
    }
  };

  const deleteDuplicateDrugs = async () => {
    if (!confirm(`Are you sure you want to merge duplicate drugs? This will keep one record per drug name and delete the rest. This cannot be undone!`)) {
      return;
    }

    setDeletingDrugs(true);
    setDrugMessage("");
    try {
      const res = await fetch("/api/admin/cleanup-duplicate-drugs", {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setDrugMessage(`✅ ${data.message}`);
        setDuplicateDrugs([]);
      } else {
        setDrugMessage("❌ Error: " + data.error);
      }
    } catch (error: any) {
      setDrugMessage("❌ Error: " + error.message);
    } finally {
      setDeletingDrugs(false);
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        🧹 Cleanup Zero-Stock Items
      </h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        This tool helps you remove pharmacy items that were created but never had any stock added.
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button
          onClick={loadItems}
          disabled={loading}
          style={{
            padding: "10px 20px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Loading..." : "Preview Items to Delete"}
        </button>

        {items.length > 0 && (
          <button
            onClick={deleteItems}
            disabled={deleting}
            style={{
              padding: "10px 20px",
              background: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: deleting ? "not-allowed" : "pointer",
              opacity: deleting ? 0.6 : 1,
            }}
          >
            {deleting ? "Deleting..." : `Delete ${items.length} Items`}
          </button>
        )}
      </div>

      {message && (
        <div
          style={{
            padding: 12,
            background: message.startsWith("✅") ? "#f0fdf4" : message.startsWith("❌") ? "#fef2f2" : "#eff6ff",
            border: `1px solid ${message.startsWith("✅") ? "#86efac" : message.startsWith("❌") ? "#fca5a5" : "#bfdbfe"}`,
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {message}
        </div>
      )}

      {items.length > 0 && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: 12, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Name</th>
                <th style={{ padding: 12, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Item Code</th>
                <th style={{ padding: 12, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Type</th>
                <th style={{ padding: 12, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: 12, fontSize: 13 }}>{item.name}</td>
                  <td style={{ padding: 12, fontSize: 13, color: "#6b7280" }}>{item.itemcode}</td>
                  <td style={{ padding: 12, fontSize: 13, color: "#6b7280" }}>{item.item_type}</td>
                  <td style={{ padding: 12, fontSize: 13, color: "#6b7280" }}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <hr style={{ margin: "40px 0", border: "none", borderTop: "1px solid #e5e7eb" }} />

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        🔄 Cleanup Duplicate Drugs
      </h2>
      <p style={{ color: "#6b7280", marginBottom: 8 }}>
        This tool finds and merges duplicate drug records (same name, strength, and form).
      </p>
      
      {(workspaceTotal > 0 || globalTotal > 0) && (
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          <div style={{ padding: "12px 16px", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Workspace Drugs</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#92400e" }}>{workspaceTotal.toLocaleString()}</div>
          </div>
          <div style={{ padding: "12px 16px", background: "#dbeafe", border: "1px solid #93c5fd", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Global Drugs</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1e40af" }}>{globalTotal.toLocaleString()}</div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button
          onClick={loadDuplicateDrugs}
          disabled={loadingDrugs}
          style={{
            padding: "10px 20px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: loadingDrugs ? "not-allowed" : "pointer",
            opacity: loadingDrugs ? 0.6 : 1,
          }}
        >
          {loadingDrugs ? "Loading..." : "Find Duplicate Drugs"}
        </button>

        {duplicateDrugs.length > 0 && (
          <button
            onClick={deleteDuplicateDrugs}
            disabled={deletingDrugs}
            style={{
              padding: "10px 20px",
              background: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: deletingDrugs ? "not-allowed" : "pointer",
              opacity: deletingDrugs ? 0.6 : 1,
            }}
          >
            {deletingDrugs ? "Merging..." : `Merge ${duplicateDrugs.length} Duplicate Groups`}
          </button>
        )}
      </div>

      {drugMessage && (
        <div
          style={{
            padding: 12,
            background: drugMessage.startsWith("✅") ? "#f0fdf4" : drugMessage.startsWith("❌") ? "#fef2f2" : "#eff6ff",
            border: `1px solid ${drugMessage.startsWith("✅") ? "#86efac" : drugMessage.startsWith("❌") ? "#fca5a5" : "#bfdbfe"}`,
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {drugMessage}
        </div>
      )}

      {duplicateDrugs.length > 0 && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: 12, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Source</th>
                <th style={{ padding: 12, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Drug Name</th>
                <th style={{ padding: 12, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Strength</th>
                <th style={{ padding: 12, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Form</th>
                <th style={{ padding: 12, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Duplicates</th>
                <th style={{ padding: 12, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Drug IDs</th>
              </tr>
            </thead>
            <tbody>
              {duplicateDrugs.map((drug: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: 12, fontSize: 11 }}>
                    <span style={{ 
                      padding: "2px 6px", 
                      borderRadius: 4, 
                      background: drug.source === 'global' ? '#dbeafe' : '#fef3c7',
                      color: drug.source === 'global' ? '#1e40af' : '#92400e',
                      fontWeight: 600
                    }}>
                      {drug.source === 'global' ? 'GLOBAL' : 'WORKSPACE'}
                    </span>
                  </td>
                  <td style={{ padding: 12, fontSize: 13 }}>{drug.name}</td>
                  <td style={{ padding: 12, fontSize: 13, color: "#6b7280" }}>{drug.strength || "-"}</td>
                  <td style={{ padding: 12, fontSize: 13, color: "#6b7280" }}>{drug.form || "-"}</td>
                  <td style={{ padding: 12, fontSize: 13, color: "#dc2626", fontWeight: 600 }}>{drug.duplicate_count}</td>
                  <td style={{ padding: 12, fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>
                    {drug.drugids?.map((id: string, i: number) => (
                      <div key={i} style={{ marginBottom: 2 }}>{id.substring(0, 8)}...</div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
