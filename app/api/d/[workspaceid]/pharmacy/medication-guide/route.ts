import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pharmacyOrders, pharmacyOrderItems, drugs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// PDF generation libraries
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";

export async function POST(request: NextRequest) {
  try {
    const { orderId, patientId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Get order details with medication information
    const order = await db
      .select({
        orderid: pharmacyOrders.orderid,
        patientid: pharmacyOrders.patientid,
        createdat: pharmacyOrders.createdat,
        status: pharmacyOrders.status,
        items: {
          drugname: pharmacyOrderItems.drugname,
          quantity: pharmacyOrderItems.quantity,
          dosage: pharmacyOrderItems.dosage,
          drugid: pharmacyOrderItems.drugid,
          genericname: drugs.genericname,
          form: drugs.form,
          strength: drugs.strength,
        },
      })
      .from(pharmacyOrders)
      .leftJoin(pharmacyOrderItems, eq(pharmacyOrders.orderid, pharmacyOrderItems.orderid))
      .leftJoin(drugs, eq(pharmacyOrderItems.drugid, drugs.drugid))
      .where(eq(pharmacyOrders.orderid, orderId));

    if (!order || order.length === 0) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Group items by drug
    const medications = order
      .filter(item => item.items.drugname)
      .map(item => item.items);

    // Generate PDF
    const pdf = generateMedicationGuidePDF(medications, order[0]);

    // Return PDF as base64 for download
    const pdfBase64 = Buffer.from(pdf).toString('base64');

    return NextResponse.json({
      success: true,
      pdfData: pdfBase64,
      filename: `medication-guide-${orderId.slice(0, 8)}.pdf`
    });

  } catch (error) {
    console.error("[Medication Guide PDF]", error);
    return NextResponse.json(
      { error: "Failed to generate medication guide PDF" },
      { status: 500 }
    );
  }
}

function generateMedicationGuidePDF(medications: any[], order: any) {
  // Create PDF with custom dimensions: 15cm x 4cm
  // Convert to points (1cm = 28.35pt)
  const width = 15 * 28.35; // 425.25pt
  const height = 4 * 28.35; // 113.4pt
  
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [width, height]
  });

  // Set font sizes for small format
  const titleFontSize = 12;
  const contentFontSize = 8;
  const smallFontSize = 7;

  // Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, width, height, 'F');

  // Border
  doc.setDrawColor(200, 200, 200);
  doc.rect(2, 2, width - 4, height - 4);

  let currentY = 15;

  medications.forEach((med, index) => {
    if (index > 0) {
      // Add separator between medications
      doc.setDrawColor(230, 230, 230);
      doc.line(10, currentY - 5, width - 10, currentY - 5);
      currentY += 5;
    }

    // Drug name (bold)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(titleFontSize);
    const drugName = med.drugname.length > 40 
      ? med.drugname.substring(0, 40) + "..." 
      : med.drugname;
    doc.text(drugName, 10, currentY, { align: 'left' });

    currentY += 12;

    // Quantity
    doc.setFont("helvetica", "normal");
    doc.setFontSize(contentFontSize);
    doc.text(`Quantity: ${med.quantity}`, 10, currentY);
    currentY += 10;

    // Form and Strength
    if (med.form || med.strength) {
      const formStrength = `${med.form || ''} ${med.strength || ''}`.trim();
      doc.text(formStrength, 10, currentY);
      currentY += 10;
    }

    // Parse dosage information
    const dosageInfo = parseDosage(med.dosage);
    
    // Dose
    if (dosageInfo.dose) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(smallFontSize);
      doc.text("Dose:", 10, currentY);
      doc.setFont("helvetica", "normal");
      doc.text(dosageInfo.dose, 35, currentY);
      currentY += 8;
    }

    // Route
    if (dosageInfo.route) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(smallFontSize);
      doc.text("Route:", 10, currentY);
      doc.setFont("helvetica", "normal");
      doc.text(dosageInfo.route, 35, currentY);
      currentY += 8;
    }

    // Timing
    if (dosageInfo.timing) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(smallFontSize);
      doc.text("Timing:", 10, currentY);
      doc.setFont("helvetica", "normal");
      doc.text(dosageInfo.timing, 35, currentY);
      currentY += 8;
    }

    // Duration
    if (dosageInfo.duration) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(smallFontSize);
      doc.text("Duration:", 10, currentY);
      doc.setFont("helvetica", "normal");
      doc.text(dosageInfo.duration, 45, currentY);
      currentY += 8;
    }

    currentY += 5; // Space between medications

    // Check if we need a new page (unlikely for 4cm height but just in case)
    if (currentY > height - 20) {
      doc.addPage([width, height]);
      currentY = 15;
    }
  });

  // Add footer with order info
  doc.setFont("helvetica", "italic");
  doc.setFontSize(smallFontSize);
  doc.setTextColor(128, 128, 128);
  const orderDate = new Date(order.createdat).toLocaleDateString();
  doc.text(`Order: ${order.orderid.slice(0, 8)}... | ${orderDate}`, 10, height - 10);

  return Buffer.from(doc.output('arraybuffer'));
}

function parseDosage(dosage: string) {
  const parsed = {
    dose: '',
    route: '',
    timing: '',
    duration: ''
  };

  if (!dosage) return parsed;

  // Parse dosage string (example: "250 mg, Oral, Once daily, for 5 days")
  const parts = dosage.split(',').map(part => part.trim());

  parts.forEach(part => {
    // Dose (contains mg or number)
    if (part.match(/\d+\s*mg|^\d+$/)) {
      parsed.dose = part;
    }
    // Route (Oral, IV, IM, etc.)
    else if (part.match(/Oral|IV|IM|Subcutaneous|Topical|Inhaled|Implant/i)) {
      parsed.route = part;
    }
    // Duration (contains "for" and "days" or "weeks")
    else if (part.match(/for\s+\d+\s+(days|weeks|months)/i)) {
      parsed.duration = part;
    }
    // Timing (Once daily, Twice daily, Every 6 hours, etc.)
    else if (part.match(/Once|Twice|Three|Every|daily|weekly|hourly/i)) {
      parsed.timing = part;
    }
  });

  return parsed;
}
