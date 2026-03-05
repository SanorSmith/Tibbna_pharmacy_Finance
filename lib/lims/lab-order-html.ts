/**
 * Lab Order HTML Generator
 * 
 * Generates a professional, print-ready HTML lab order using the same
 * visual style as the lab results report (lab-report-html.ts).
 */
/**
 * Lab Order HTML Generator (Karolinska-style)
 * Matches the layout of “Multidisciplinär beställning” form.
 */

/**
 * Lab Order HTML Generator (Karolinska-form layout, English labels)
 * Print-ready A4 with two header blocks, barcode area, meta row, and
 * Material/Tests two-column body (same style as the photo).
 */

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

/**
 * Simple “barcode-like” SVG (visual only; not a true Code128/39 encoder).
 * No deps, prints in a similar style.
 */
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
    </svg>
  `;
}

export interface LabOrderData {
  facilityName: string;
  facilityDescription?: string | null;

  // Hospital / "FROM" info
  hospitalName?: string | null;
  hospitalAddress?: string | null;
  hospitalPhone?: string | null;

  // Lab / "TO" info
  labName?: string | null;
  labAddress?: string | null;
  labPhone?: string | null;

  // Patient info
  patientName?: string | null;
  patientId?: string | null;
  patientNationalId?: string | null;
  patientAddress?: string | null;
  patientPhone?: string | null;

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

  // Specimen / container info
  sampleType?: string | null;
  containerType?: string | null;
  volume?: string | null;
  volumeUnit?: string | null;

  tests?: Array<{
    testCode?: string;
    testName?: string;
    specimenType?: string;
    sampleType?: string;
    containerType?: string;
  }>;
}

export function generateLabOrderHTML(data: LabOrderData): string {
  // Parse description into key-value pairs
  const descParts: Record<string, string> = {};
  if (data.description) {
    data.description.split("|").forEach((part) => {
      const trimmed = part.trim();
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx > 0) {
        descParts[trimmed.slice(0, colonIdx).trim()] = trimmed.slice(colonIdx + 1).trim();
      }
    });
  }

  const status = descParts["Status"] || data.requestStatus || "Not sent";
  const laboratory =
    descParts["Laboratory"] ||
    data.targetLab ||
    data.receivingProvider ||
    data.facilityName ||
    "—";

  // Parse grouped tests from description: "GroupName[test1, test2]; GroupName2[test3]"
  const groupedTestsRaw = descParts["Grouped Tests"] || "";
  const groupedMap: Record<string, string[]> = {};
  if (groupedTestsRaw) {
    const groupRegex = /([^[\];]+)\[([^\]]*)\]/g;
    let m;
    while ((m = groupRegex.exec(groupedTestsRaw)) !== null) {
      const gName = m[1].trim();
      const gTests = m[2].split(",").map((s: string) => s.trim()).filter(Boolean);
      if (gName && gTests.length > 0) groupedMap[gName] = gTests;
    }
  }

  // Parse per-group specimen info: "GroupName{sampleType / containerType}; GroupName2{...}"
  const groupSpecimensRaw = descParts["Group Specimens"] || "";
  const groupSpecimenMap: Record<string, string> = {};
  if (groupSpecimensRaw) {
    const specRegex = /([^{};]+)\{([^}]*)\}/g;
    let sm;
    while ((sm = specRegex.exec(groupSpecimensRaw)) !== null) {
      const gName = sm[1].trim();
      const spec = sm[2].trim();
      if (gName && spec) groupSpecimenMap[gName] = spec;
    }
  }

  // Fallback: flat test list from description
  // Key may be "Selected Tests (N)" so find by prefix
  const selectedTestsKey = Object.keys(descParts).find(k => k.toLowerCase().startsWith("selected tests"));
  const selectedTestsRaw = selectedTestsKey ? descParts[selectedTestsKey] : "";
  const flatTestNames = selectedTestsRaw ? selectedTestsRaw.split(",").map((t: string) => t.trim()).filter(Boolean) : [];

  // Build specimen / material info (from props or description)
  const specimenParts: string[] = [];
  if (data.sampleType) specimenParts.push(data.sampleType);
  if (data.containerType) specimenParts.push(data.containerType);
  if (data.volume && data.volumeUnit) specimenParts.push(`${data.volume} ${data.volumeUnit}`);
  else if (data.volume) specimenParts.push(data.volume);
  let specimenStr = specimenParts.length > 0 ? specimenParts.join(" / ") : "";
  // Fallback: parse from description's Specimen field
  if (!specimenStr && descParts["Specimen"]) {
    specimenStr = descParts["Specimen"].trim();
  }

  // Build rows: Material left / Tests right
  type Row = { material: string; tests: string[] };
  const rows: Row[] = [];

  if (data.tests && data.tests.length > 0) {
    const groups: Record<string, { material: string; tests: string[] }> = {};
    for (const t of data.tests) {
      const specimen = t.specimenType || t.sampleType || "—";
      const container = t.containerType ? ` / ${t.containerType}` : "";
      const material = `${specimen}${container}`.trim();
      const key = material || "—";
      if (!groups[key]) groups[key] = { material: key, tests: [] };
      groups[key].tests.push(t.testName || t.testCode || "—");
    }
    Object.values(groups).forEach((g) => rows.push({ material: g.material, tests: g.tests }));
  } else if (Object.keys(groupedMap).length > 0) {
    // Use grouped tests: each group becomes a row with specimen info from catalog
    Object.entries(groupedMap).forEach(([group, tests]) => {
      const material = groupSpecimenMap[group] || specimenStr || "—";
      rows.push({ material, tests: [`[${group}]`, ...tests] });
    });
  } else if (flatTestNames.length > 0) {
    rows.push({ material: specimenStr || "—", tests: flatTestNames });
  } else {
    rows.push({ material: specimenStr || "—", tests: [data.serviceName || "—"] });
  }

  // FROM / TO info
  const doctorName = data.requestingProvider || "—";
  const fromHospital = data.hospitalName || data.facilityName || "";
  const fromAddress = data.hospitalAddress || "";
  const fromPhone = data.hospitalPhone || "";

  const toName = data.labName || laboratory;
  const toAddress = data.labAddress || "";
  const toPhone = data.labPhone || "";

  const plannedDate = formatDate(data.recordedTime);
  const savedDateTime = formatDateTime(new Date().toISOString());

  const rid = (data.requestId || data.patientId || "").trim();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Multidisciplinary Order</title>

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

    /* Left vertical lab text like the paper form */
    .vertical-lab {
      position: absolute;
      left: -48px;
      top: 165px;
      transform: rotate(-90deg);
      transform-origin: left top;
      font-weight: 700;
      letter-spacing: 0.8px;
      font-size: 20px;
      white-space: nowrap;
    }

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

    .to-grid { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: start; }

    .rid-block { text-align: right; min-width: 160px; }
    .rid-label { font-weight: 700; font-size: 11px; }

    .patient-box {
      border: 1px solid #000;
      padding: 10px;
      min-height: 66px;
    }
    .patient-line { font-size: 12px; font-weight: 700; margin: 2px 0; }
    .patient-muted { font-weight: 400; font-size: 11px; }

    /* Meta row */
    .meta {
      border: 1px solid #000;
      border-top: none;
      padding: 6px 10px;
      display: grid;
      grid-template-columns: 55% 45%;
      gap: 10px;
      min-height: 28px;
      align-items: center;
    }
    .meta-left, .meta-right {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: baseline;
      flex-wrap: wrap;
    }
    .meta-k { font-weight: 700; }
    .meta-v { font-weight: 400; }

    /* Body */
    .body {
      border-left: 1px solid #000;
      border-right: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 10px 0 0;
    }

    .body-header {
      display: grid;
      grid-template-columns: 35% 65%;
      padding: 0 10px 6px;
      font-weight: 700;
    }

    .rows {
      display: grid;
      grid-template-columns: 35% 65%;
      row-gap: 14px;
      padding: 0 10px 12px;
    }

    .material { white-space: pre-wrap; }
    .tests { white-space: pre-wrap; }
    .tests div { margin: 1px 0; }

    /* Notes */
    .notes {
      border-left: 1px solid #000;
      border-right: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 10px;
      min-height: 58px;
      font-size: 10px;
    }
    .notes-title { font-weight: 700; margin-bottom: 6px; }
    .notes ul { margin: 0; padding-left: 16px; }
    .notes li { margin: 2px 0; }

    .footer { display: flex; justify-content: space-between; padding: 8px 10px 0; font-size: 10px; }
  </style>
</head>

<body>
  <div class="page">
    <div class="vertical-lab">${escapeHtml(fromHospital || "LABORATORY")}</div>

    <div class="controls">
      <button class="btn" onclick="window.print()">Print</button>
      <button class="btn" onclick="window.close()">Close</button>
    </div>

    <div class="header">
      <!-- Row 1: FROM + Title/barcode/page -->
      <div class="header-row">
        <div class="cell fromto-block">
          <div class="line">
            <span class="label">FROM</span>
            <div class="content">
              ${fromHospital ? `<div><strong>${escapeHtml(fromHospital)}</strong></div>` : ``}
              ${fromAddress ? `<div>${escapeHtml(fromAddress)}</div>` : ``}
              ${fromPhone ? `<div>Tel: ${escapeHtml(fromPhone)}</div>` : ``}
              <div style="margin-top:4px;">Ordering Physician: <strong>${escapeHtml(doctorName)}</strong></div>
            </div>
          </div>
        </div>

        <div class="cell title-block">
          <div class="title-top">
            <div style="width:24px;"></div>
            <div class="title">Multidisciplinary Order</div>
            <div class="page-count">Page 1 (1)</div>
          </div>
          <div class="barcode-wrap">
            ${barcodeSvg(rid || data.serviceTypeCode || data.serviceName, { width: 260, height: 44 })}
          </div>
        </div>
      </div>

      <!-- Row 2: TO + RID + patient -->
      <div class="header-row2">
        <div class="cell">
          <div class="to-grid">
            <div class="fromto-block">
              <div class="line">
                <span class="label">TO</span>
                <div class="content">
                  <div><strong>${escapeHtml(toName)}</strong></div>
                  ${toAddress ? `<div>${escapeHtml(toAddress)}</div>` : ``}
                  ${toPhone ? `<div>Tel: ${escapeHtml(toPhone)}</div>` : ``}
                </div>
              </div>
            </div>

            <div class="rid-block">
              <div class="rid-label">RID: ${escapeHtml(rid || "—")}</div>
              ${barcodeSvg(rid, { width: 200, height: 40 })}
            </div>
          </div>
        </div>

        <div class="cell">
          <div class="patient-box">
            ${data.patientNationalId ? `<div class="patient-line">NID: ${escapeHtml(data.patientNationalId)}</div>` : `<div class="patient-muted">ID no.</div>`}
            <div class="patient-line">${escapeHtml(data.patientName || "Name")}</div>
            ${data.patientAddress ? `<div class="patient-muted">${escapeHtml(data.patientAddress)}</div>` : `<div class="patient-muted">Address</div>`}
            ${data.patientPhone ? `<div class="patient-muted">Tel: ${escapeHtml(data.patientPhone)}</div>` : ``}
          </div>
        </div>
      </div>
    </div>

    <!-- Meta row -->
    <div class="meta">
      <div class="meta-left">
        <div><span class="meta-k">Planned time</span> <span class="meta-v">${escapeHtml(plannedDate)}</span></div>
      </div>
      <div class="meta-right">
        <div><span class="meta-k">Status:</span> <span class="meta-v">${escapeHtml(status)}</span></div>
        <div><span class="meta-k">Urgency:</span> <span class="meta-v">${escapeHtml(data.urgency || "routine")}</span></div>
      </div>
    </div>

    <!-- Body -->
    <div class="body">
      <div class="body-header">
        <div>Material / Specimen</div>
        <div>Tests</div>
      </div>

      <div class="rows">
        ${rows
          .map(
            (r) => `
              <div class="material">${escapeHtml(r.material)}</div>
              <div class="tests">
                ${r.tests.map((t) => `<div>${escapeHtml(t)}</div>`).join("")}
              </div>
            `
          )
          .join("")}
      </div>
    </div>

    <!-- Notes -->
    <div class="notes">
      <div class="notes-title">Additional information (order level)</div>
      ${data.narrative ? `<div style="margin-top:8px;"><strong>Comment:</strong> ${escapeHtml(data.narrative)}</div>` : ``}
    </div>

    <div class="footer">
      <div>Saved ${escapeHtml(savedDateTime)}</div>
      </div>
  </div>
</body>
</html>`;
}
