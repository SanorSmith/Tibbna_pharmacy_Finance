/**
 * All Medication Cards PDF Generation API
 * 
 * POST - Generate a multi-page PDF with all medication cards, one per page
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/user";
import { pharmacyOrders, pharmacyOrderItems, patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import jsPDF from "jspdf";

interface AllMedicationCardsRequest {
  orderId: string;
  patientId?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body: AllMedicationCardsRequest = await request.json();
    
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

    // Fetch all medication items for this order
    const items = await db
      .select()
      .from(pharmacyOrderItems)
      .where(eq(pharmacyOrderItems.orderid, body.orderId));

    if (items.length === 0) {
      return NextResponse.json({ error: "No medication items found for this order" }, { status: 404 });
    }

    // Create PDF with custom dimensions (15cm x 4cm landscape)
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "cm",
      format: [15, 4] // width: 15cm, height: 4cm
    });

    // Helper function to add medication card page
    const addMedicationCardPage = (item: any, isFirstPage: boolean = false) => {
      // Add new page if not the first medication
      if (!isFirstPage) {
        pdf.addPage();
      }

      // Set font
      pdf.setFont("helvetica");

      // Header with patient info
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      if (order.patient) {
        const patientName = `${order.patient.firstname} ${order.patient.lastname}`;
        const patientId = order.patient.nationalid || "N/A";
        pdf.text(`Patient: ${patientName} (${patientId})`, 0.5, 0.8);
      } else {
        pdf.text("Patient: Unknown", 0.5, 0.8);
      }

      // Order info
      const orderDate = new Date(order.order.createdat).toLocaleDateString();
      const orderIdShort = order.order.orderid.slice(0, 8);
      pdf.text(`Order: ${orderIdShort}... | ${orderDate}`, 0.5, 1.2);

      // Medication name (bold/larger)
      pdf.setFontSize(12);
      pdf.setTextColor(0);
      pdf.setFont("helvetica", "bold");
      const medicationName = item.drugname || "Medication";
      
      // Split long medication names
      const maxNameWidth = 12; // cm
      const nameLines = pdf.splitTextToSize(medicationName, maxNameWidth);
      pdf.text(nameLines, 0.5, 1.8);

      // Reset to normal font
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);

      let currentY = 2.2;
      
      // Quantity
      if (item.quantity) {
        pdf.text(`Quantity: ${item.quantity}`, 0.5, currentY);
        currentY += 0.3;
      }

      // Parse dosage string to extract structured information
      const parseDosageDetails = (dosageStr: string) => {
        if (!dosageStr) return {};
        
        const details: any = {};
        
        // Handle both pipe-separated and comma-separated dosage strings
        const parts = dosageStr.includes('|') 
          ? dosageStr.split('|').map(p => p.trim())
          : dosageStr.split(',').map(p => p.trim());
        
        parts.forEach(part => {
          // Dose amount and unit (e.g., "500 mg", "1 tablet")
          const doseMatch = part.match(/^(\d+(?:\.\d+)?)\s*(mg|g|ml|mcg|tablet|capsule|puff|U|TU|MU|mmol)/i);
          if (doseMatch) {
            details.doseamount = doseMatch[1];
            details.doseunit = doseMatch[2];
          }
          
          // Route (Oral, Parenteral, etc.)
          if (/^(Oral|Parenteral|Nasal|Rectal|Vaginal|Implant|Inhalation|Instillation|Sublingual|Transdermal)$/i.test(part)) {
            details.route = part;
          }
          
          // Timing directions
          if (/^(Once|Twice|Three times|Four times|Five times|Every|As needed|When needed|PRN|At bedtime|With meals|Before meals|After meals|daily|hourly|weekly|monthly)/i.test(part)) {
            details.timingdirections = part;
          }
          
          // Duration
          if (/^(for\s+\d+\s*(day|week|month)s?|until finished|\d+\s*(day|week|month)s?)$/i.test(part)) {
            details.duration = part.replace(/^for\s+/i, '');
          }
        });
        
        return details;
      };
      
      const doseInfo = parseDosageDetails(item.dosage || '');

      // Dosage information
      if (doseInfo.doseamount && doseInfo.doseunit) {
        pdf.text(`Dose: ${doseInfo.doseamount} ${doseInfo.doseunit}`, 0.5, currentY);
        currentY += 0.3;
      }

      // Route
      if (doseInfo.route) {
        pdf.text(`Route: ${doseInfo.route}`, 0.5, currentY);
        currentY += 0.3;
      }

      // Timing
      if (doseInfo.timingdirections) {
        pdf.text(`Timing: ${doseInfo.timingdirections}`, 0.5, currentY);
        currentY += 0.3;
      }

      // Duration
      if (doseInfo.duration) {
        pdf.text(`Duration: ${doseInfo.duration}`, 0.5, currentY);
        currentY += 0.3;
      }

      // Additional dosage info if available
      if (item.dosage && item.dosage.trim()) {
        pdf.text(`Instructions: ${item.dosage}`, 0.5, currentY);
      }

      // Footer with pharmacy info
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text("Generated by Pharmacy Management System", 0.5, 3.5);
      pdf.text(`Printed: ${new Date().toLocaleDateString()}`, 13, 3.5);
    };

    // Add each medication as a separate page
    items.forEach((item, index) => {
      addMedicationCardPage(item, index === 0);
    });

    // Convert PDF to base64
    const pdfData = pdf.output("datauristring").split(",")[1];
    const orderIdShort = body.orderId.slice(0, 8);
    const filename = `medication-cards-all-${orderIdShort}-${Date.now()}.pdf`;

    return NextResponse.json({
      success: true,
      pdfData,
      filename,
      pageCount: items.length
    });

  } catch (error) {
    console.error("[All Medication Cards PDF]", error);
    return NextResponse.json({ error: "Failed to generate medication cards PDF" }, { status: 500 });
  }
}
