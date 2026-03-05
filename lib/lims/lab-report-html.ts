/**
 * Lab Report HTML Generator
 * 
 * Generates a professional, print-ready HTML lab report matching the lab order format.
 * Uses the same Karolinska-style layout as lab orders.
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
  address?: string | null;
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
  address?: string | null;
  phone?: string | null;
}

export interface LabReportData {
  facility: LabReportFacility;
  patient: LabReportPatient | null;
  sample: LabReportSample;
  results: LabReportResult[];
  generatedAt: string;
  requestingProvider?: string | null;
}

function escapeHtml(text: string): string {
  return (text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "-";
  }
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function barcodeSvg(value: string, opts?: { width?: number; height?: number }): string {
  const v = (value || "").trim();
  const width = opts?.width ?? 220;
  const height = opts?.height ?? 40;

  if (!v) {
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-label="barcode"></svg>`;
  }

  const bytes = Array.from(v).map((c) => c.charCodeAt(0));
  const bars: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    bars.push(1 + (b % 3));
    bars.push(1 + ((b >> 2) % 3));
    bars.push(1 + ((b >> 4) % 3));
  }

  const quiet = 10;
  const usable = width - quiet * 2;
  const total = bars.reduce((a, n) => a + n, 0);
  const unit = usable / total;

  let x = quiet;
  let isBlack = true;

  const rects: string[] = [];
  for (const w of bars) {
    const rw = Math.max(0.8, w * unit);
    if (isBlack) {
      rects.push(`<rect x="${x.toFixed(2)}" y="0" width="${rw.toFixed(2)}" height="${height - 12}" fill="#000"/>`);
    }
    x += rw;
    isBlack = !isBlack;
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-label="barcode">
      <rect x="0" y="0" width="${width}" height="${height}" fill="#fff"/>
      ${rects.join("")}
      <text x="${width / 2}" y="${height - 2}" text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif" font-size="9" fill="#000">
        ${escapeHtml(v)}
      </text>
    </svg>`;
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

  const releasedBy = results.find((r) => r.releasedbyname)?.releasedbyname || null;
  const releasedDate = results.find((r) => r.releaseddate)?.releaseddate || null;
  const techValidator = results.find((r) => r.technicalvalidatedbyname)?.technicalvalidatedbyname || null;
  const medValidator = results.find((r) => r.medicalvalidatedbyname)?.medicalvalidatedbyname || null;

  // Build results table rows
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

  // FROM/TO info (matching lab order format)
  const fromName = facility.name || "Laboratory";
  const fromAddress = facility.address || "";
  const fromPhone = facility.phone || "";

  const toName = data.requestingProvider || "Requesting Physician";

  const rid = sample.samplenumber || sample.sampleid;
  const savedDateTime = formatDateTime(generatedAt);
  const collectionDate = formatDate(sample.collectiondate);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lab Report - ${escapeHtml(sample.samplenumber)}</title>

  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; }

    @page { size: A4; margin: 10mm 10mm 12mm 14mm; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.25;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page { position: relative; width: 100%; min-height: 270mm; }

    /* Screen-only controls */
    @media screen {
      .controls { display: flex; gap: 10px; justify-content: center; padding: 12px 0 16px; }
      .btn { border: 1px solid #000; background: #fff; padding: 8px 16px; font-weight: 600; cursor: pointer; }
    }
    @media print {
      .controls { display: none !important; }
    }

    /* Header */
    .header { border: 1px solid #000; border-bottom: none; }

    .header-row {
      display: grid;
      grid-template-columns: 58% 42%;
      border-bottom: 1px solid #000;
      min-height: 58px;
    }

    .cell { padding: 8px 10px; }
    .cell + .cell { border-left: 1px solid #000; }

    .label { font-weight: 700; display: inline-block; width: 48px; }

    .fromto-block .line { display: flex; gap: 8px; margin: 1px 0; }
    .fromto-block .content { flex: 1; }

    .title-block { display: grid; grid-template-columns: 1fr; gap: 4px; align-content: start; }

    .title-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }

    .title { font-size: 16px; font-weight: 700; text-align: center; flex: 1; }
    .page-count { font-size: 11px; white-space: nowrap; }
    .barcode-wrap { display: flex; justify-content: center; }

    /* Row 2 */
    .header-row2 {
      display: grid;
      grid-template-columns: 58% 42%;
      border-bottom: 1px solid #000;
      min-height: 66px;
    }

    .to-grid {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      align-items: start;
    }

    .rid-block {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }

    .rid-label {
      font-size: 10px;
      font-weight: 700;
    }

    .patient-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .patient-line {
      font-weight: 600;
      font-size: 12px;
    }

    .patient-muted {
      font-size: 10px;
      color: #666;
    }

    /* Meta row */
    .meta {
      border: 1px solid #000;
      border-top: none;
      display: grid;
      grid-template-columns: 1fr 1fr;
      padding: 6px 10px;
      font-size: 10px;
    }

    .meta-left, .meta-right {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .meta-k { font-weight: 700; }
    .meta-v { font-weight: 400; }

    /* Body - Results Table */
    .body {
      border: 1px solid #000;
      border-top: none;
      margin-bottom: 12px;
    }

    .body-header {
      display: grid;
      grid-template-columns: 1fr;
      background: #f0f0f0;
      border-bottom: 1px solid #000;
      font-weight: 700;
      font-size: 11px;
      padding: 6px 10px;
    }

    .results-table {
      width: 100%;
      border-collapse: collapse;
    }

    .results-table thead th {
      background: #e8e8e8;
      font-weight: 600;
      font-size: 10px;
      padding: 6px 8px;
      text-align: left;
      border-bottom: 1px solid #000;
    }

    .results-table tbody td {
      padding: 5px 8px;
      border-bottom: 1px solid #ddd;
      font-size: 11px;
    }

    .results-table tbody tr:nth-child(even) {
      background: #f8f9fa;
    }

    .test-name { font-weight: 500; }
    .result-value { font-weight: 600; text-align: center; }
    .flag-cell { text-align: center; font-weight: 700; width: 30px; }
    .unit-cell { color: #666; font-size: 10px; }
    .ref-range { color: #666; font-size: 10px; }

    /* Abnormal highlighting */
    .result-value.abnormal-high, .flag-cell.abnormal-high {
      color: #c0392b;
      font-weight: 700;
    }

    .result-value.abnormal-low, .flag-cell.abnormal-low {
      color: #2874a6;
      font-weight: 700;
    }

    .result-value.abnormal, .flag-cell.abnormal {
      color: #d35400;
      font-weight: 700;
    }

    .result-value.critical, .flag-cell.critical {
      color: #c0392b;
      font-weight: 800;
      background: #fce4e4 !important;
    }

    tr.critical {
      background: #fce4e4 !important;
    }

    /* Signatures */
    .signatures {
      display: flex;
      gap: 20px;
      margin-top: 20px;
      padding: 10px;
      border: 1px solid #ccc;
    }

    .signature-block {
      flex: 1;
    }

    .signature-label {
      font-size: 9px;
      color: #888;
      text-transform: uppercase;
    }

    .signature-line {
      border-bottom: 1px solid #aaa;
      margin-top: 20px;
      margin-bottom: 4px;
    }

    .signature-name {
      font-size: 11px;
      font-weight: 600;
    }

    .signature-date {
      font-size: 9px;
      color: #666;
    }

    /* Footer */
    .footer {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #666;
      padding: 8px 0;
      border-top: 1px solid #ccc;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Screen controls -->
    <div class="controls">
      <button class="btn" onclick="window.print()">Print</button>
      <button class="btn" onclick="window.close()">Close</button>
    </div>

    <!-- Header -->
    <div class="header">
      <!-- Row 1: FROM + Title -->
      <div class="header-row">
        <div class="cell">
          <div class="fromto-block">
            <div class="line">
              <span class="label">FROM</span>
              <div class="content">
                <div><strong>${escapeHtml(fromName)}</strong></div>
                ${fromAddress ? `<div>${escapeHtml(fromAddress)}</div>` : ``}
                ${fromPhone ? `<div>Tel: ${escapeHtml(fromPhone)}</div>` : ``}
              </div>
            </div>
          </div>
        </div>

        <div class="cell title-block">
          <div class="title-top">
            <div style="width:24px;"></div>
            <div class="title">Lab Report</div>
            <div class="page-count">Page 1 (1)</div>
          </div>
        </div>
      </div>

      <!-- Row 2: TO + RID + Patient -->
      <div class="header-row2">
        <div class="cell">
          <div class="to-grid">
            <div class="fromto-block">
              <div class="line">
                <span class="label">TO</span>
                <div class="content">
                  <div><strong>${escapeHtml(toName)}</strong></div>
                </div>
              </div>
            </div>

            <div class="rid-block">
              <div class="rid-label">Sample: ${escapeHtml(rid)}</div>
            </div>
          </div>
        </div>

        <div class="cell">
          <div class="patient-box">
            ${patient?.nationalid ? `<div class="patient-line">NID: ${escapeHtml(patient.nationalid)}</div>` : `<div class="patient-muted">ID no.</div>`}
            <div class="patient-line">${patientName}</div>
            ${patient?.address ? `<div class="patient-muted">${escapeHtml(patient.address)}</div>` : `<div class="patient-muted">Address</div>`}
            ${patient?.phone ? `<div class="patient-muted">Tel: ${escapeHtml(patient.phone)}</div>` : ``}
          </div>
        </div>
      </div>
    </div>

    <!-- Meta row -->
    <div class="meta">
      <div class="meta-left">
        <div><span class="meta-k">Collection Date:</span> <span class="meta-v">${escapeHtml(collectionDate)}</span></div>
        <div><span class="meta-k">Specimen:</span> <span class="meta-v">${escapeHtml(sample.sampletype)} / ${escapeHtml(sample.containertype)}</span></div>
      </div>
      <div class="meta-right">
        <div><span class="meta-k">Status:</span> <span class="meta-v">${escapeHtml(sample.currentstatus)}</span></div>
        ${sample.collectorname ? `<div><span class="meta-k">Collector:</span> <span class="meta-v">${escapeHtml(sample.collectorname)}</span></div>` : ``}
      </div>
    </div>

    <!-- Body - Results -->
    <div class="body">
      <div class="body-header">
        <div>Laboratory Test Results</div>
      </div>

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
              No test results available
            </td>
          </tr>`}
        </tbody>
      </table>
    </div>

    <!-- Signatures -->
    ${techValidator ? `
    <div class="signatures">
      <div class="signature-block">
        <div class="signature-label">Technical Validation</div>
        <div class="signature-line"></div>
        <div class="signature-name">${escapeHtml(techValidator)}</div>
        <div class="signature-date">${formatDateTime(results.find(r => r.technicalvalidateddate)?.technicalvalidateddate)}</div>
      </div>
    </div>` : ``}

    <div class="footer">
      <div>Generated ${escapeHtml(savedDateTime)}</div>
      <div>${escapeHtml(fromName)}</div>
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
