"use client";

import { useState } from "react";

export default function ManageWorkspaceDrugsPage() {
  const [drugs, setDrugs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedDrugIds, setSelectedDrugIds] = useState<Set<string>>(new Set());
  const [editingDrug, setEditingDrug] = useState<any>(null);
  const [totalDrugs, setTotalDrugs] = useState(0);
  const [uniqueNames, setUniqueNames] = useState(0);
  const [workspaceCount, setWorkspaceCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [workspaceBreakdown, setWorkspaceBreakdown] = useState<any[]>([]);

  const loadDrugs = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/manage-workspace-drugs");
      const data = await res.json();
      if (res.ok) {
        setDrugs(data.drugs || []);
        setTotalDrugs(data.total || 0);
        setUniqueNames(data.uniqueNames || 0);
        setWorkspaceCount(data.workspaceCount || 0);
        setDuplicateCount(data.duplicateCount || 0);
        setWorkspaceBreakdown(data.workspaceBreakdown || []);
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

  const deleteSelected = async () => {
    if (selectedDrugIds.size === 0) {
      alert("Please select drugs to delete");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedDrugIds.size} workspace drug records? This cannot be undone!`)) {
      return;
    }

    try {
      const res = await fetch("/api/admin/manage-workspace-drugs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drugids: Array.from(selectedDrugIds) }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ ${data.message}`);
        setSelectedDrugIds(new Set());
        loadDrugs();
      } else {
        setMessage("❌ Error: " + data.error);
      }
    } catch (error: any) {
      setMessage("❌ Error: " + error.message);
    }
  };

  const updateDrug = async () => {
    if (!editingDrug) return;

    try {
      const res = await fetch("/api/admin/manage-workspace-drugs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drugid: editingDrug.drugid,
          name: editingDrug.name,
          strength: editingDrug.strength,
          form: editingDrug.form,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ ${data.message}`);
        setEditingDrug(null);
        loadDrugs();
      } else {
        setMessage("❌ Error: " + data.error);
      }
    } catch (error: any) {
      setMessage("❌ Error: " + error.message);
    }
  };

  const toggleSelection = (drugid: string) => {
    const newSet = new Set(selectedDrugIds);
    if (newSet.has(drugid)) {
      newSet.delete(drugid);
    } else {
      newSet.add(drugid);
    }
    setSelectedDrugIds(newSet);
  };

  const selectDuplicates = () => {
    const duplicates = drugs.filter(d => d.duplicate_count > 1);
    const newSet = new Set(duplicates.map(d => d.drugid));
    setSelectedDrugIds(newSet);
  };

  return (
    <div style={{ padding: 40, maxWidth: 1400, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        🏢 Manage Workspace Drugs
      </h1>
      <p style={{ color: "#6b7280", marginBottom: 8 }}>
        View, rename, and delete drugs from your workspace drugs database.
      </p>
      
      {totalDrugs > 0 && (
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ padding: "12px 16px", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Total Records</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#92400e" }}>{totalDrugs.toLocaleString()}</div>
          </div>
          <div style={{ padding: "12px 16px", background: "#dbeafe", border: "1px solid #93c5fd", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Unique Names</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1e40af" }}>{uniqueNames.toLocaleString()}</div>
          </div>
          <div style={{ padding: "12px 16px", background: "#e0e7ff", border: "1px solid #c7d2fe", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Workspaces</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#4338ca" }}>{workspaceCount.toLocaleString()}</div>
          </div>
          <div style={{ padding: "12px 16px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>With Duplicates</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#991b1b" }}>{duplicateCount.toLocaleString()}</div>
          </div>
        </div>
      )}

      {workspaceBreakdown.length > 0 && (
        <div style={{ marginBottom: 24, border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Breakdown by Workspace</h3>
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, background: "#f9fafb" }}>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Workspace ID</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Total Drugs</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Unique Names</th>
                </tr>
              </thead>
              <tbody>
                {workspaceBreakdown.map((ws: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 12px", fontSize: 12, fontFamily: "monospace", color: "#6b7280" }}>
                      {ws.workspaceid.substring(0, 8)}...
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontSize: 13, fontWeight: 600 }}>
                      {parseInt(ws.drug_count).toLocaleString()}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontSize: 13, color: "#6b7280" }}>
                      {parseInt(ws.unique_names).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button
          onClick={loadDrugs}
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
          {loading ? "Loading..." : "Load Workspace Drugs"}
        </button>

        {drugs.length > 0 && (
          <>
            <button
              onClick={selectDuplicates}
              style={{
                padding: "10px 20px",
                background: "#f59e0b",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Select All Duplicates
            </button>

            <button
              onClick={deleteSelected}
              disabled={selectedDrugIds.size === 0}
              style={{
                padding: "10px 20px",
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: selectedDrugIds.size === 0 ? "not-allowed" : "pointer",
                opacity: selectedDrugIds.size === 0 ? 0.6 : 1,
              }}
            >
              Delete Selected ({selectedDrugIds.size})
            </button>
          </>
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

      {drugs.length > 0 && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, background: "#f9fafb", zIndex: 1 }}>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 12, fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDrugIds(new Set(drugs.map(d => d.drugid)));
                        } else {
                          setSelectedDrugIds(new Set());
                        }
                      }}
                      checked={selectedDrugIds.size === drugs.length && drugs.length > 0}
                    />
                  </th>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Drug Name</th>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Strength</th>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Form</th>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 12, fontWeight: 600 }}>ATC Code</th>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Duplicates</th>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Drug ID</th>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 12, fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drugs.map((drug: any) => (
                  <tr 
                    key={drug.drugid} 
                    style={{ 
                      borderBottom: "1px solid #f3f4f6",
                      background: drug.duplicate_count > 1 ? "#fef3c7" : "#fff"
                    }}
                  >
                    <td style={{ padding: 12 }}>
                      <input
                        type="checkbox"
                        checked={selectedDrugIds.has(drug.drugid)}
                        onChange={() => toggleSelection(drug.drugid)}
                      />
                    </td>
                    <td style={{ padding: 12, fontSize: 13 }}>{drug.name}</td>
                    <td style={{ padding: 12, fontSize: 13, color: "#6b7280" }}>{drug.strength || "-"}</td>
                    <td style={{ padding: 12, fontSize: 13, color: "#6b7280" }}>{drug.form || "-"}</td>
                    <td style={{ padding: 12, fontSize: 13, color: "#6b7280" }}>{drug.atccode || "-"}</td>
                    <td style={{ padding: 12, fontSize: 13 }}>
                      {drug.duplicate_count > 1 && (
                        <span style={{ 
                          padding: "2px 6px", 
                          borderRadius: 4, 
                          background: "#dc2626",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 600
                        }}>
                          {drug.duplicate_count}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 12, fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>
                      {drug.drugid.substring(0, 8)}...
                    </td>
                    <td style={{ padding: 12 }}>
                      <button
                        onClick={() => setEditingDrug(drug)}
                        style={{
                          padding: "4px 8px",
                          background: "#6366f1",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        Rename
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingDrug && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 500 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Rename Drug</h3>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                Drug Name
              </label>
              <input
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13 }}
                value={editingDrug.name}
                onChange={(e) => setEditingDrug({ ...editingDrug, name: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                Strength
              </label>
              <input
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13 }}
                value={editingDrug.strength || ""}
                onChange={(e) => setEditingDrug({ ...editingDrug, strength: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                Form
              </label>
              <input
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13 }}
                value={editingDrug.form || ""}
                onChange={(e) => setEditingDrug({ ...editingDrug, form: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setEditingDrug(null)}
                style={{ padding: "8px 16px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={updateDrug}
                style={{ padding: "8px 16px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
