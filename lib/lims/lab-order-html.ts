/**
 * Lab Order HTML Generator
 * 
 * Generates a professional, print-ready HTML lab order using the same
 * visual style as the lab results report (lab-report-html.ts).
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

export interface LabOrderData {
  facilityName: string;
  facilityDescription?: string | null;
  patientName?: string | null;
  patientId?: string | null;
  serviceName: string;
  serviceTypeValue?: string | null;
  serviceTypeCode?: string | null;
  testCategory?: string | null;
  targetLab?: string | null;
  urgency?: string | null;
  clinicalIndication?: string | null;
  narrative?: string | null;
  description?: string | null;
  requestingProvider?: string | null;
  receivingProvider?: string | null;
  recordedTime: string;
  requestId?: string | null;
  requestStatus?: string | null;
}

export function generateLabOrderHTML(data: LabOrderData): string {
  const urgencyClass = data.urgency === "urgent" || data.urgency === "stat"
    ? "urgency-urgent" : "urgency-routine";
  const urgencyLabel = data.urgency || "routine";

  // Parse description into key-value pairs if pipe-delimited
  let descriptionRows = "";
  if (data.description) {
    const parts: Record<string, string> = {};
    data.description.split("|").forEach((part) => {
      const trimmed = part.trim();
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx > 0) {
        parts[trimmed.slice(0, colonIdx).trim()] = trimmed.slice(colonIdx + 1).trim();
      }
    });
    const entries = Object.entries(parts);
    if (entries.length > 1) {
      descriptionRows = entries
        .map(([key, val]) => `
          <tr>
            <td class="detail-label">${escapeHtml(key)}</td>
            <td class="detail-value">${escapeHtml(val)}</td>
          </tr>`)
        .join("");
    } else {
      descriptionRows = `
        <tr>
          <td class="detail-label">Details</td>
          <td class="detail-value">${escapeHtml(data.description)}</td>
        </tr>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lab Order - ${escapeHtml(data.serviceName)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @page {
      size: A4;
      margin: 12mm 15mm 15mm 15mm;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #1a1a1a;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .report-container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 10px 20px;
    }

    /* ── Header / Facility ── */
    .facility-header {
      text-align: center;
      border-bottom: 3px double #1a5276;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }

    .facility-name {
      font-size: 20px;
      font-weight: 700;
      color: #1a5276;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .facility-subtitle {
      font-size: 11px;
      color: #555;
      margin-top: 2px;
    }

    .report-title {
      font-size: 14px;
      font-weight: 700;
      color: #fff;
      background: #1a5276;
      text-align: center;
      padding: 6px 0;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    /* ── Info Boxes ── */
    .info-section {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
    }

    .info-box {
      flex: 1;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 8px 10px;
    }

    .info-box-title {
      font-size: 10px;
      font-weight: 700;
      color: #1a5276;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }

    .info-row {
      display: flex;
      margin-bottom: 3px;
    }

    .info-label {
      font-weight: 600;
      color: #555;
      min-width: 120px;
      font-size: 10px;
    }

    .info-value {
      font-weight: 500;
      color: #1a1a1a;
      font-size: 10px;
    }

    /* ── Urgency badges ── */
    .urgency-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .urgency-routine { background: #d4efdf; color: #1e8449; }
    .urgency-urgent { background: #fadbd8; color: #c0392b; }

    /* ── Details Table ── */
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }

    .details-table thead th {
      background: #1a5276;
      color: #fff;
      font-weight: 600;
      font-size: 10px;
      padding: 6px 8px;
      text-align: left;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 1px solid #1a5276;
    }

    .details-table tbody td {
      padding: 5px 8px;
      border: 1px solid #ddd;
      font-size: 11px;
      vertical-align: top;
    }

    .details-table tbody tr:nth-child(even) {
      background: #f8f9fa;
    }

    .detail-label {
      font-weight: 600;
      color: #555;
      width: 180px;
    }

    .detail-value {
      font-weight: 500;
    }

    /* ── Clinical section ── */
    .clinical-section {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 8px 10px;
      margin-bottom: 12px;
      background: #fafafa;
    }

    .clinical-title {
      font-size: 10px;
      font-weight: 700;
      color: #1a5276;
      text-transform: uppercase;
      margin-bottom: 6px;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 4px;
    }

    .clinical-text {
      font-size: 11px;
      color: #333;
      white-space: pre-wrap;
    }

    /* ── Signatures ── */
    .signatures-section {
      display: flex;
      gap: 20px;
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #ccc;
    }

    .signature-block { flex: 1; }

    .signature-label {
      font-size: 9px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .signature-line {
      border-bottom: 1px solid #aaa;
      width: 160px;
      margin-top: 25px;
      margin-bottom: 4px;
    }

    .signature-name {
      font-size: 11px;
      font-weight: 600;
      color: #1a1a1a;
      margin-top: 2px;
    }

    .signature-date {
      font-size: 9px;
      color: #666;
    }

    /* ── Footer ── */
    .report-footer {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 2px solid #1a5276;
      text-align: center;
      font-size: 9px;
      color: #888;
    }

    .report-footer .disclaimer {
      font-style: italic;
      margin-bottom: 4px;
    }

    /* ── Print ── */
    @media print {
      body { background: #fff; }
      .report-container { padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }

    @media screen {
      .print-controls {
        text-align: center;
        padding: 12px;
        margin-bottom: 16px;
        background: #f0f4f8;
        border-radius: 6px;
      }
      .print-btn {
        background: #1a5276;
        color: #fff;
        border: none;
        padding: 10px 28px;
        font-size: 13px;
        font-weight: 600;
        border-radius: 4px;
        cursor: pointer;
        margin: 0 6px;
      }
      .print-btn:hover { background: #154360; }
      .close-btn {
        background: #e74c3c;
        color: #fff;
        border: none;
        padding: 10px 28px;
        font-size: 13px;
        font-weight: 600;
        border-radius: 4px;
        cursor: pointer;
        margin: 0 6px;
      }
      .close-btn:hover { background: #c0392b; }
    }
  </style>
</head>
<body>
  <div class="report-container">

    <!-- Print Controls (screen only) -->
    <div class="print-controls no-print">
      <button class="print-btn" onclick="window.print()">Print Order</button>
      <button class="close-btn" onclick="window.close()">Close</button>
    </div>

    <!-- Facility Header -->
    <div class="facility-header">
      <div class="facility-name">${escapeHtml(data.facilityName)}</div>
      ${data.facilityDescription ? `<div class="facility-subtitle">${escapeHtml(data.facilityDescription)}</div>` : ""}
      <div class="facility-subtitle">Laboratory Information Management System</div>
    </div>

    <div class="report-title">Laboratory Test Order</div>

    <!-- Order & Patient Info -->
    <div class="info-section">
      <div class="info-box">
        <div class="info-box-title">Order Information</div>
        <div class="info-row">
          <span class="info-label">Test Ordered:</span>
          <span class="info-value" style="font-weight:700">${escapeHtml(data.serviceName)}</span>
        </div>
        ${data.testCategory ? `
        <div class="info-row">
          <span class="info-label">Category:</span>
          <span class="info-value">${escapeHtml(data.testCategory)}</span>
        </div>` : ""}
        ${data.targetLab ? `
        <div class="info-row">
          <span class="info-label">Target Laboratory:</span>
          <span class="info-value">${escapeHtml(data.targetLab)}</span>
        </div>` : ""}
        <div class="info-row">
          <span class="info-label">Urgency:</span>
          <span class="info-value"><span class="urgency-badge ${urgencyClass}">${escapeHtml(urgencyLabel)}</span></span>
        </div>
        <div class="info-row">
          <span class="info-label">Date Ordered:</span>
          <span class="info-value">${formatDateTime(data.recordedTime)}</span>
        </div>
        ${data.requestId ? `
        <div class="info-row">
          <span class="info-label">Request ID:</span>
          <span class="info-value" style="font-family:monospace;font-size:9px">${escapeHtml(data.requestId)}</span>
        </div>` : ""}
        ${data.requestStatus ? `
        <div class="info-row">
          <span class="info-label">Status:</span>
          <span class="info-value" style="text-transform:uppercase;font-weight:600">${escapeHtml(data.requestStatus)}</span>
        </div>` : ""}
      </div>

      <div class="info-box">
        <div class="info-box-title">Provider Information</div>
        <div class="info-row">
          <span class="info-label">Requesting Provider:</span>
          <span class="info-value" style="font-weight:700">${escapeHtml(data.requestingProvider || "—")}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Receiving Laboratory:</span>
          <span class="info-value">${escapeHtml(data.receivingProvider || "—")}</span>
        </div>
        ${data.patientName ? `
        <div class="info-row" style="margin-top:8px;padding-top:6px;border-top:1px solid #e0e0e0">
          <span class="info-label">Patient:</span>
          <span class="info-value" style="font-weight:700">${escapeHtml(data.patientName)}</span>
        </div>` : ""}
        ${data.patientId ? `
        <div class="info-row">
          <span class="info-label">Patient ID:</span>
          <span class="info-value" style="font-family:monospace">${escapeHtml(data.patientId.substring(0, 8))}</span>
        </div>` : ""}
      </div>
    </div>

    <!-- Test Details Table (parsed from description) -->
    ${descriptionRows ? `
    <table class="details-table">
      <thead>
        <tr>
          <th style="width:30%">Detail</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        ${descriptionRows}
      </tbody>
    </table>` : ""}

    <!-- Clinical Information -->
    ${data.clinicalIndication || data.narrative ? `
    <div class="clinical-section">
      <div class="clinical-title">Clinical Information</div>
      ${data.clinicalIndication ? `
      <div style="margin-bottom:4px">
        <span style="font-weight:600;color:#555;font-size:10px">Clinical Indication: </span>
        <span class="clinical-text">${escapeHtml(data.clinicalIndication)}</span>
      </div>` : ""}
      ${data.narrative ? `
      <div>
        <span style="font-weight:600;color:#555;font-size:10px">Narrative: </span>
        <span class="clinical-text">${escapeHtml(data.narrative)}</span>
      </div>` : ""}
    </div>` : ""}

    <!-- Signatures -->
    <div class="signatures-section">
      <div class="signature-block">
        <div class="signature-label">Ordering Physician</div>
        <div class="signature-line"></div>
        <div class="signature-name">${escapeHtml(data.requestingProvider || "")}&nbsp;</div>
        <div class="signature-date">${formatDateTime(data.recordedTime)}</div>
      </div>
      <div class="signature-block">
        <div class="signature-label">Received By (Laboratory)</div>
        <div class="signature-line"></div>
        <div class="signature-name">&nbsp;</div>
        <div class="signature-date">&nbsp;</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="report-footer">
      <div class="disclaimer">
        This laboratory order is generated electronically. Please ensure specimen is collected and processed per standard operating procedures.
      </div>
      <div>
        Order generated: ${formatDateTime(new Date().toISOString())} &nbsp;|&nbsp;
        ${escapeHtml(data.serviceName)} &nbsp;|&nbsp;
        ${escapeHtml(data.facilityName)}
      </div>
    </div>

  </div>
</body>
</html>`;
}
