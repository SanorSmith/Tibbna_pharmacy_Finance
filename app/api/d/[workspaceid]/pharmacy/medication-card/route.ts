/**
 * Individual Medication Card PDF Generation API
 * 
 * POST - Generate a printable PDF for a single medication card
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/user";
import { pharmacyOrders, pharmacyOrderItems, patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import jsPDF from "jspdf";

interface MedicationCardRequest {
  orderId: string;
  patientId?: string;
  itemName?: string;
  dosage?: string;
  quantity?: number;
  doseAmount?: string;
  doseUnit?: string;
  route?: string;
  timingDirections?: string;
  directionDuration?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body: MedicationCardRequest = await request.json();
    
    // Validate required fields
    if (!body.orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Fetch order and patient details
    const [order] = await db
      .select({
        order: pharmacyOrders,
        patient: patients,
      })
      .from(pharmacyOrders)
      .leftJoin(patients, eq(pharmacyOrders.patientid, patients.patientid))
      .where(eq(pharmacyOrders.orderid, body.orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Create PDF with small size for medication packages (15cm x 4cm)
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "cm",
      format: [15, 4] // width: 15cm, height: 4cm - perfect for medication packages
    });

    // Set font
    pdf.setFont("helvetica");

    // Header with patient info (small card size)
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    if (order.patient) {
      const patientName = `${order.patient.firstname} ${order.patient.lastname}`;
      const patientId = order.patient.nationalid || "N/A";
      pdf.text(`Patient: ${patientName} (${patientId})`, 0.5, 0.6);
    } else {
      pdf.text("Patient: Unknown", 0.5, 0.6);
    }

    // Order info
    const orderDate = new Date(order.order.createdat).toLocaleDateString();
    const orderIdShort = order.order.orderid.slice(0, 8);
    pdf.text(`Order: ${orderIdShort}... | ${orderDate}`, 0.5, 1.0);

    // Medication name (bold/larger)
    pdf.setFontSize(10);
    pdf.setTextColor(0);
    pdf.setFont("helvetica", "bold");
    const medicationName = body.itemName || "Medication";
    
    // Split long medication names
    const maxNameWidth = 12; // cm (card width is 15cm)
    const nameLines = pdf.splitTextToSize(medicationName, maxNameWidth);
    pdf.text(nameLines, 0.5, 1.5);

    // Reset to normal font
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);

    // Parse the labeled, pipe-separated dosage string, e.g.
    // "Dose: 500mg | Route: Oral | Timing: Twice daily | Duration: 5 days | Instructions: Take with food"
    const dosageDetails: Record<string, string> = {};
    if (body.dosage) {
      body.dosage.split("|").forEach((segment) => {
        const part = segment.trim();
        const colonIdx = part.indexOf(":");
        if (colonIdx === -1) return;
        const key = part.slice(0, colonIdx).trim().toLowerCase();
        const val = part.slice(colonIdx + 1).trim();
        if (val) dosageDetails[key] = val;
      });
    }

    let currentY = 2.0;

    // Quantity
    if (body.quantity) {
      pdf.text(`Qty: ${body.quantity}`, 0.5, currentY);
      currentY += 0.3;
    }

    // Dosage information — prefer discrete fields, fall back to the parsed dosage string
    const doseText = body.doseAmount && body.doseUnit
      ? `${body.doseAmount} ${body.doseUnit}`
      : dosageDetails.dose;
    if (doseText) {
      pdf.text(`Dose: ${doseText}`, 0.5, currentY);
      currentY += 0.3;
    }

    // Route
    const routeText = body.route || dosageDetails.route;
    if (routeText) {
      pdf.text(`Route: ${routeText}`, 0.5, currentY);
      currentY += 0.3;
    }

    // Timing
    const timingText = body.timingDirections || dosageDetails.timing;
    if (timingText) {
      pdf.text(`Timing: ${timingText}`, 0.5, currentY);
      currentY += 0.3;
    }

    // Duration
    const durationText = body.directionDuration || dosageDetails.duration;
    if (durationText) {
      pdf.text(`Duration: ${durationText}`, 0.5, currentY);
      currentY += 0.3;
    }

    // Additional instructions — pull just the "Instructions:" segment out of the
    // labeled dosage string (Dose/Route/Timing/Duration are rendered separately
    // above), and wrap long text to fit the card width.
    let instructionsText = dosageDetails.instructions;
    if (!instructionsText && body.dosage && !body.dosage.includes(":")) {
      // Raw, unlabeled dosage string — show it as-is
      instructionsText = body.dosage.trim();
    }
    if (instructionsText) {
      const maxWidth = 14; // cm (card width is 15cm, leave margin)
      const lines = pdf.splitTextToSize(`Instructions: ${instructionsText}`, maxWidth);
      pdf.text(lines, 0.5, currentY);
      currentY += 0.3 * lines.length;
    }

    // Footer with pharmacy info
    pdf.setFontSize(6);
    pdf.setTextColor(150);
    pdf.text("Pharmacy Management System", 0.5, 3.5);
    pdf.text(`Printed: ${new Date().toLocaleDateString()}`, 11, 3.5);

    // Convert PDF to base64
    const pdfData = pdf.output("datauristring").split(",")[1];
    const medicationNameClean = medicationName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    const filename = `medication-card-${medicationNameClean}-${orderIdShort}-${Date.now()}.pdf`;

    return NextResponse.json({
      success: true,
      pdfData,
      filename
    });

  } catch (error) {
    console.error("[Medication Card PDF]", error);
    return NextResponse.json({ error: "Failed to generate medication card PDF" }, { status: 500 });
  }
}
