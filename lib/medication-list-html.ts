/**
 * Medication List HTML Generator
 * 
 * Generates a professional, print-ready HTML medication list using the same
 * visual style as prescription orders and lab reports (Karolinska-style).
 */

export interface MedicationListData {
  facility: {
    name: string;
    address?: string | null;
    phone?: string | null;
  };
  patient: {
    patientid: string;
    firstname: string;
    middlename?: string | null;
    lastname: string;
    dateofbirth?: string | null;
    gender?: string | null;
    age?: number | null;
    nationalid?: string | null;
  } | null;
  generatedBy?: string | null;
  generatedAt: string;
  medications: Array<{
    medication_item: string;
    route?: string | null;
    timing_directions?: string | null;
    comment?: string | null;
    time: string;
    validUntil?: string | null;
  }>;
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
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }) + " " + d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function extractDosing(timingDirections: string | null): string {
  if (!timingDirections) return "1 st";
  
  const frequencyMatch = timingDirections.match(/(once|twice|three times|four times|1|2|3|4)\s*(daily|a day)/i);
  
  if (frequencyMatch) {
    let freq = frequencyMatch[1].toLowerCase();
    
    if (freq === 'once' || freq === '1') return '1 st';
    if (freq === 'twice' || freq === '2') return '1 + 1 st';
    if (freq === 'three times' || freq === '3') return '1 + 1 + 1 st';
    if (freq === 'four times' || freq === '4') return '1 + 1 + 1 + 1 st';
  }
  
  return '1 st';
}

function extractInstructions(timingDirections: string | null): string {
  if (!timingDirections) return "-";
  
  // Remove dosage amounts and route from timing directions
  const parts = timingDirections.split(',').map(p => p.trim());
  const relevantParts = parts.filter(p => 
    !p.match(/^\d+\s*(mg|g|mcg|ml|U|TU|MU|mmol)/i) && 
    !['Oral', 'Intravenous', 'Subcutaneous', 'Intramuscular', 'Topical', 'Rectal', 'Sublingual', 'Inhalation'].includes(p)
  );
  
  return relevantParts.join(', ') || timingDirections;
}

export function generateMedicationListHTML(data: MedicationListData): string {
  const { facility, patient, generatedBy, generatedAt, medications } = data;

  const patientName = patient
    ? escapeHtml(
        [patient.firstname, patient.middlename, patient.lastname]
          .filter(Boolean)
          .join(" ")
      )
    : "[Patient Name Not Available]";

  const patientDOB = patient?.dateofbirth ? formatDate(patient.dateofbirth) : "[Not Available]";
  const patientGender = patient?.gender || "[Not Available]";
  const patientID = patient?.nationalid || patient?.patientid || "[Not Available]";
  const patientAge = patient?.age ? `${patient.age} years` : "[Not Available]";

  const fromName = facility.name || "Healthcare Facility";
  const fromAddress = facility.address || "";
  const fromPhone = facility.phone || "";

  const generatedDateTime = formatDateTime(generatedAt);
  const generatedByName = generatedBy || "Healthcare Provider";

  // Build medications table rows
  const medicationsRowsHTML = medications
    .map((med, index) => {
      const dosing = extractDosing(med.timing_directions);
      const instructions = extractInstructions(med.timing_directions);
      
      return `
        <tr class="med-row">
          <td class="med-number">${index + 1}</td>
          <td class="med-date">${formatDate(med.time)}</td>
          <td class="med-date">${med.validUntil ? formatDate(med.validUntil) : '-'}</td>
          <td class="med-name">
            <div class="med-name-text">${escapeHtml(med.medication_item)}</div>
            ${med.route ? `<div class="med-route">${escapeHtml(med.route)}</div>` : ''}
          </td>
          <td class="med-reason">${escapeHtml(med.comment || '-')}</td>
          <td class="med-dosing">${escapeHtml(dosing)}</td>
          <td class="med-instructions">${escapeHtml(instructions)}</td>
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Medication List - ${escapeHtml(patientName)}</title>

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
    .date-info { font-size: 11px; white-space: nowrap; }

    /* Row 2 */
    .header-row2 {
      display: grid;
      grid-template-columns: 58% 42%;
      border-bottom: 1px solid #000;
      min-height: 66px;
    }

    .patient-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .patient-box .line { display: flex; gap: 8px; }
    .patient-box .label { font-weight: 700; width: 80px; }
    .patient-box .value { flex: 1; }

    .generated-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    /* Medications Table */
    .content-section {
      border: 1px solid #000;
      border-top: none;
      padding: 12px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 8px;
      text-align: center;
      text-decoration: underline;
    }

    .meds-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }

    .meds-table th {
      background: #f0f0f0;
      border: 1px solid #000;
      padding: 6px 8px;
      text-align: left;
      font-weight: 700;
      font-size: 10px;
    }

    .meds-table td {
      border: 1px solid #000;
      padding: 6px 8px;
      font-size: 10px;
      vertical-align: top;
    }

    .med-row {
      background: #fff;
    }

    .med-row:nth-child(even) {
      background: #f9f9f9;
    }

    .med-number {
      width: 30px;
      text-align: center;
      font-weight: 700;
    }

    .med-date {
      min-width: 70px;
    }

    .med-name {
      min-width: 120px;
    }

    .med-name-text {
      font-weight: 600;
    }

    .med-route {
      font-size: 9px;
      color: #666;
      margin-top: 2px;
    }

    .med-reason {
      min-width: 100px;
    }

    .med-dosing {
      min-width: 70px;
      text-align: center;
    }

    .med-instructions {
      min-width: 120px;
    }

    /* Footer */
    .footer {
      border: 1px solid #000;
      border-top: none;
      padding: 12px;
      margin-top: 0;
    }

    .footer-row {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      padding-top: 8px;
      border-top: 1px solid #ccc;
    }

    .signature-box {
      text-align: center;
    }

    .signature-line {
      border-top: 1px solid #000;
      width: 200px;
      margin: 40px auto 4px;
    }

    .signature-label {
      font-size: 10px;
      font-weight: 700;
    }

    .signature-name {
      font-size: 10px;
      margin-top: 2px;
    }

    .footer-note {
      font-size: 9px;
      font-style: italic;
      color: #666;
      margin-top: 12px;
      text-align: center;
    }
  </style>
</head>
<body>

<div class="controls">
  <button class="btn" onclick="window.print()">Print</button>
  <button class="btn" onclick="window.close()">Close</button>
</div>

<div class="page">
  <!-- Header Row 1 -->
  <div class="header">
    <div class="header-row">
      <div class="cell fromto-block">
        <div class="line">
          <span class="label">FROM:</span>
          <div class="content">
            <div style="font-weight:700;">${escapeHtml(fromName)}</div>
            ${fromAddress ? `<div>${escapeHtml(fromAddress)}</div>` : ''}
            ${fromPhone ? `<div>Tel: ${escapeHtml(fromPhone)}</div>` : ''}
          </div>
        </div>
      </div>
      <div class="cell title-block">
        <div class="title-top">
          <div class="title">MEDICATION LIST</div>
        </div>
        <div class="date-info" style="text-align:center;">
          Generated: ${escapeHtml(generatedDateTime)}
        </div>
      </div>
    </div>

    <!-- Header Row 2 -->
    <div class="header-row2">
      <div class="cell patient-box">
        <div class="line">
          <span class="label">Patient Name:</span>
          <span class="value" style="font-weight:700;">${patientName}</span>
        </div>
        <div class="line">
          <span class="label">ID:</span>
          <span class="value">${escapeHtml(patientID)}</span>
        </div>
        <div class="line">
          <span class="label">Date of Birth:</span>
          <span class="value">${escapeHtml(patientDOB)}</span>
        </div>
        <div class="line">
          <span class="label">Gender:</span>
          <span class="value">${escapeHtml(patientGender)}</span>
        </div>
        <div class="line">
          <span class="label">Age:</span>
          <span class="value">${escapeHtml(patientAge)}</span>
        </div>
      </div>
      <div class="cell generated-box">
        <div class="line">
          <span class="label">Generated By:</span>
        </div>
        <div style="font-weight:700; margin-top:4px;">${escapeHtml(generatedByName)}</div>
        <div style="margin-top:8px; font-size:10px;">
          Total Medications: <strong>${medications.length}</strong>
        </div>
      </div>
    </div>
  </div>

  <!-- Medications Section -->
  <div class="content-section">
    <div class="section-title">REGULAR MEDICATIONS</div>
    
    <table class="meds-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Valid From</th>
          <th>Valid Until</th>
          <th>Medication</th>
          <th>Treatment Reason</th>
          <th>Dosing</th>
          <th>Dosing Instructions</th>
        </tr>
      </thead>
      <tbody>
        ${medicationsRowsHTML}
      </tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-row">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Healthcare Provider</div>
        <div class="signature-name">${escapeHtml(generatedByName)}</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Date</div>
        <div class="signature-name">${formatDate(generatedAt)}</div>
      </div>
    </div>
    <div class="footer-note">
      This medication list is a summary of current medications. 
      Please consult with your healthcare provider before making any changes.
    </div>
  </div>
</div>

</body>
</html>`;
}

export function printMedicationList(data: MedicationListData): void {
  const html = generateMedicationListHTML(data);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}
