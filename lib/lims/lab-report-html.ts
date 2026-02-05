/**
 * Lab Report HTML Generator
 * 
 * Generates a professional, print-ready HTML lab report that can be used
 * from both LIMS (lab tech) and EHR (doctor/patient) sides.
 * 
 * Features:
 * - Professional medical laboratory report layout
 * - Abnormal/critical result highlighting
 * - Reference range display
 * - Validation signatures
 * - Print-optimized CSS with @media print
 * - A4 page sizing
 */

export interface LabReportPatient {
  patientid: string;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  dateofbirth?: string | null;
  gender?: string | null;
  age?: number | null;
  nationalid?: string | null;
  phone?: string | null;
  bloodgroup?: string | null;
}

export interface LabReportSample {
  sampleid: string;
  samplenumber: string;
  accessionnumber?: string | null;
  sampletype: string;
  containertype: string;
  collectiondate: string;
  collectorname?: string | null;
  currentstatus: string;
  barcode: string;
  labcategory?: string | null;
  accessionedat?: string;
}

export interface LabReportResult {
  resultid: string;
  testcode: string;
  testname: string;
  resultvalue: string | null;
  unit: string | null;
  referencemin: string | number | null;
  referencemax: string | number | null;
  referencerange: string | null;
  flag: string;
  isabormal: boolean;
  iscritical: boolean;
  interpretation?: string | null;
  status: string;
  comment?: string | null;
  analyzeddate?: string;
  releaseddate?: string | null;
  releasedbyname?: string | null;
  technicalvalidatedbyname?: string | null;
  technicalvalidateddate?: string | null;
  medicalvalidatedbyname?: string | null;
  medicalvalidateddate?: string | null;
}

export interface LabReportFacility {
  name: string;
  type?: string;
  description?: string | null;
}

export interface LabReportData {
  facility: LabReportFacility;
  patient: LabReportPatient | null;
  sample: LabReportSample;
  results: LabReportResult[];
  generatedAt: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "-";
  }
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

function getResultClass(result: LabReportResult): string {
  if (result.iscritical) return "critical";
  if (result.isabormal) return "abnormal";

  const value = parseFloat(String(result.resultvalue));
  if (!isNaN(value)) {
    const min = result.referencemin !== null ? parseFloat(String(result.referencemin)) : null;
    const max = result.referencemax !== null ? parseFloat(String(result.referencemax)) : null;
    if (min !== null && !isNaN(min) && value < min) return "abnormal-low";
    if (max !== null && !isNaN(max) && value > max) return "abnormal-high";
  }

  // Check descriptive results
  if (result.resultvalue) {
    const val = result.resultvalue.toLowerCase();
    const abnormalTerms = ["positive", "detected", "present", "abnormal", "growth", "reactive"];
    if (abnormalTerms.some((t) => val.includes(t))) return "abnormal";
  }

  return "normal";
}

function getFlagSymbol(result: LabReportResult): string {
  const cls = getResultClass(result);
  switch (cls) {
    case "critical":
      return "!!";
    case "abnormal-high":
      return "H";
    case "abnormal-low":
      return "L";
    case "abnormal":
      return "*";
    default:
      return "";
  }
}

export function generateLabReportHTML(data: LabReportData): string {
  const { facility, patient, sample, results, generatedAt } = data;

  const patientName = patient
    ? escapeHtml(
        [patient.firstname, patient.middlename, patient.lastname]
          .filter(Boolean)
          .join(" ")
      )
    : "Unknown Patient";

  // Group results by category/test for panel grouping
  const releasedBy = results.find((r) => r.releasedbyname)?.releasedbyname || null;
  const releasedDate = results.find((r) => r.releaseddate)?.releaseddate || null;
  const techValidator = results.find((r) => r.technicalvalidatedbyname)?.technicalvalidatedbyname || null;
  const techValidDate = results.find((r) => r.technicalvalidateddate)?.technicalvalidateddate || null;
  const medValidator = results.find((r) => r.medicalvalidatedbyname)?.medicalvalidatedbyname || null;
  const medValidDate = results.find((r) => r.medicalvalidateddate)?.medicalvalidateddate || null;

  const resultsRowsHTML = results
    .map((r) => {
      const cls = getResultClass(r);
      const flag = getFlagSymbol(r);
      const refDisplay =
        r.referencemin !== null && r.referencemax !== null
          ? `${r.referencemin} - ${r.referencemax}`
          : r.referencerange || "-";
      const unitDisplay = r.unit && r.unit !== "N/A" ? escapeHtml(r.unit) : "";

      return `
        <tr class="result-row ${cls}">
          <td class="test-name">${escapeHtml(r.testname)}</td>
          <td class="result-value ${cls}">${escapeHtml(r.resultvalue || "-")}</td>
          <td class="flag-cell ${cls}">${flag}</td>
          <td class="unit-cell">${unitDisplay}</td>
          <td class="ref-range">${escapeHtml(refDisplay)}</td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lab Report - ${escapeHtml(sample.samplenumber)}</title>
  <style>
    /* Reset */
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

    /* ── Patient & Sample Info ── */
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
      min-width: 100px;
      font-size: 10px;
    }

    .info-value {
      font-weight: 500;
      color: #1a1a1a;
      font-size: 10px;
    }

    /* ── Results Table ── */
    .results-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }

    .results-table thead th {
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

    .results-table tbody td {
      padding: 5px 8px;
      border: 1px solid #ddd;
      font-size: 11px;
      vertical-align: middle;
    }

    .results-table tbody tr:nth-child(even) {
      background: #f8f9fa;
    }

    .results-table tbody tr:hover {
      background: #eef2f7;
    }

    .test-name {
      font-weight: 500;
    }

    .result-value {
      font-weight: 600;
      text-align: center;
    }

    .flag-cell {
      text-align: center;
      font-weight: 700;
      width: 30px;
    }

    .unit-cell {
      color: #666;
      font-size: 10px;
    }

    .ref-range {
      color: #666;
      font-size: 10px;
    }

    /* Abnormal highlighting */
    .result-value.abnormal-high,
    .flag-cell.abnormal-high {
      color: #c0392b;
      font-weight: 700;
    }

    .result-value.abnormal-low,
    .flag-cell.abnormal-low {
      color: #2874a6;
      font-weight: 700;
    }

    .result-value.abnormal,
    .flag-cell.abnormal {
      color: #d35400;
      font-weight: 700;
    }

    .result-value.critical,
    .flag-cell.critical {
      color: #c0392b;
      font-weight: 800;
      background: #fce4e4 !important;
    }

    tr.critical {
      background: #fce4e4 !important;
    }

    /* ── Legend ── */
    .legend {
      display: flex;
      gap: 16px;
      font-size: 9px;
      color: #666;
      margin-bottom: 12px;
      padding: 4px 0;
      border-top: 1px solid #e0e0e0;
      border-bottom: 1px solid #e0e0e0;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .legend-symbol {
      font-weight: 700;
      font-size: 11px;
    }

    .legend-symbol.high { color: #c0392b; }
    .legend-symbol.low { color: #2874a6; }
    .legend-symbol.abn { color: #d35400; }
    .legend-symbol.crit { color: #c0392b; }

    /* ── Signatures ── */
    .signatures-section {
      display: flex;
      gap: 20px;
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #ccc;
    }

    .signature-block {
      flex: 1;
    }

    .signature-label {
      font-size: 9px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
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

    .signature-line {
      border-bottom: 1px solid #aaa;
      width: 160px;
      margin-top: 25px;
      margin-bottom: 4px;
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

    /* ── Comments ── */
    .comments-section {
      margin-bottom: 12px;
      padding: 8px 10px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      background: #fafafa;
    }

    .comments-title {
      font-size: 10px;
      font-weight: 700;
      color: #1a5276;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .comment-text {
      font-size: 10px;
      color: #333;
    }

    /* ── Print Specifics ── */
    @media print {
      body { background: #fff; }
      .report-container { padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }

    /* ── Screen: print button ── */
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

      .print-btn:hover {
        background: #154360;
      }

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

      .close-btn:hover {
        background: #c0392b;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">

    <!-- Print Controls (screen only) -->
    <div class="print-controls no-print">
      <button class="print-btn" onclick="window.print()">Print Report</button>
      <button class="close-btn" onclick="window.close()">Close</button>
    </div>

    <!-- Facility Header -->
    <div class="facility-header">
      <div class="facility-name">${escapeHtml(facility.name)}</div>
      ${facility.description ? `<div class="facility-subtitle">${escapeHtml(facility.description)}</div>` : ""}
      <div class="facility-subtitle">Laboratory Information Management System</div>
    </div>

    <div class="report-title">Laboratory Test Report</div>

    <!-- Patient & Sample Info Side by Side -->
    <div class="info-section">
      <div class="info-box">
        <div class="info-box-title">Patient Information</div>
        <div class="info-row">
          <span class="info-label">Name:</span>
          <span class="info-value">${patientName}</span>
        </div>
        ${patient?.dateofbirth ? `
        <div class="info-row">
          <span class="info-label">Date of Birth:</span>
          <span class="info-value">${formatDate(patient.dateofbirth)}</span>
        </div>` : ""}
        ${patient?.age !== null && patient?.age !== undefined ? `
        <div class="info-row">
          <span class="info-label">Age:</span>
          <span class="info-value">${patient.age} years</span>
        </div>` : ""}
        ${patient?.gender ? `
        <div class="info-row">
          <span class="info-label">Gender:</span>
          <span class="info-value" style="text-transform:capitalize">${escapeHtml(patient.gender)}</span>
        </div>` : ""}
        ${patient?.nationalid ? `
        <div class="info-row">
          <span class="info-label">National ID:</span>
          <span class="info-value">${escapeHtml(patient.nationalid)}</span>
        </div>` : ""}
        ${patient?.patientid ? `
        <div class="info-row">
          <span class="info-label">Patient ID:</span>
          <span class="info-value" style="font-family:monospace">${escapeHtml(patient.patientid.substring(0, 8))}</span>
        </div>` : ""}
      </div>

      <div class="info-box">
        <div class="info-box-title">Specimen Information</div>
        <div class="info-row">
          <span class="info-label">Sample No:</span>
          <span class="info-value" style="font-family:monospace;font-weight:700">${escapeHtml(sample.samplenumber)}</span>
        </div>
        ${sample.accessionnumber ? `
        <div class="info-row">
          <span class="info-label">Accession No:</span>
          <span class="info-value" style="font-family:monospace">${escapeHtml(sample.accessionnumber)}</span>
        </div>` : ""}
        <div class="info-row">
          <span class="info-label">Specimen Type:</span>
          <span class="info-value" style="text-transform:capitalize">${escapeHtml(sample.sampletype)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Container:</span>
          <span class="info-value">${escapeHtml(sample.containertype)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Collected:</span>
          <span class="info-value">${formatDateTime(sample.collectiondate)}</span>
        </div>
        ${sample.collectorname ? `
        <div class="info-row">
          <span class="info-label">Collector:</span>
          <span class="info-value">${escapeHtml(sample.collectorname)}</span>
        </div>` : ""}
        ${sample.labcategory ? `
        <div class="info-row">
          <span class="info-label">Department:</span>
          <span class="info-value">${escapeHtml(sample.labcategory)}</span>
        </div>` : ""}
        <div class="info-row">
          <span class="info-label">Barcode:</span>
          <span class="info-value" style="font-family:monospace;font-size:9px">${escapeHtml(sample.barcode)}</span>
        </div>
      </div>
    </div>

    <!-- Results Table -->
    <table class="results-table">
      <thead>
        <tr>
          <th style="width:35%">Test Name</th>
          <th style="width:15%;text-align:center">Result</th>
          <th style="width:5%;text-align:center">Flag</th>
          <th style="width:15%">Unit</th>
          <th style="width:30%">Reference Interval</th>
        </tr>
      </thead>
      <tbody>
        ${resultsRowsHTML || `
        <tr>
          <td colspan="5" style="text-align:center;padding:20px;color:#888">
            No test results available for this sample
          </td>
        </tr>`}
      </tbody>
    </table>

    <!-- Legend -->
    <div class="legend">
      <div class="legend-item">
        <span class="legend-symbol high">H</span> <span>High</span>
      </div>
      <div class="legend-item">
        <span class="legend-symbol low">L</span> <span>Low</span>
      </div>
      <div class="legend-item">
        <span class="legend-symbol abn">*</span> <span>Abnormal</span>
      </div>
      <div class="legend-item">
        <span class="legend-symbol crit">!!</span> <span>Critical</span>
      </div>
    </div>

    <!-- Comments (if any result has comments/interpretation) -->
    ${results.some((r) => r.comment || r.interpretation)
      ? `
    <div class="comments-section">
      <div class="comments-title">Comments</div>
      ${results
        .filter((r) => r.comment || r.interpretation)
        .map(
          (r) =>
            `<div class="comment-text"><strong>${escapeHtml(r.testname)}:</strong> ${escapeHtml(r.interpretation || r.comment || "")}</div>`
        )
        .join("")}
    </div>`
      : ""}

    <!-- Signatures -->
    <div class="signatures-section">
      ${techValidator
        ? `
      <div class="signature-block">
        <div class="signature-label">Technical Validation</div>
        <div class="signature-line"></div>
        <div class="signature-name">${escapeHtml(techValidator)}</div>
        <div class="signature-date">${formatDateTime(techValidDate)}</div>
      </div>`
        : ""}
      ${medValidator
        ? `
      <div class="signature-block">
        <div class="signature-label">Medical Validation</div>
        <div class="signature-line"></div>
        <div class="signature-name">${escapeHtml(medValidator)}</div>
        <div class="signature-date">${formatDateTime(medValidDate)}</div>
      </div>`
        : ""}
      ${releasedBy
        ? `
      <div class="signature-block">
        <div class="signature-label">Authorized &amp; Released By</div>
        <div class="signature-line"></div>
        <div class="signature-name">${escapeHtml(releasedBy)}</div>
        <div class="signature-date">${formatDateTime(releasedDate)}</div>
      </div>`
        : `
      <div class="signature-block">
        <div class="signature-label">Authorized By</div>
        <div class="signature-line"></div>
        <div class="signature-name">&nbsp;</div>
        <div class="signature-date">&nbsp;</div>
      </div>`}
    </div>

    <!-- Footer -->
    <div class="report-footer">
      <div class="disclaimer">
        This report is intended for the requesting physician. Results should be interpreted in conjunction with clinical findings.
      </div>
      <div>
        Report generated: ${formatDateTime(generatedAt)} &nbsp;|&nbsp;
        Sample: ${escapeHtml(sample.samplenumber)} &nbsp;|&nbsp;
        ${escapeHtml(facility.name)}
      </div>
    </div>

  </div>
</body>
</html>`;
}

/**
 * Opens a print window with the lab report.
 * Call this from a client component.
 */
export function printLabReport(data: LabReportData): void {
  const html = generateLabReportHTML(data);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}
