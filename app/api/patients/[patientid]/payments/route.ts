/**
 * Patient Payment Status API
 * 
 * Retrieves all payment/billing information for a patient
 * Used by EHR patient page to display payment status in real-time
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { invoices, invoiceItems } from "@/lib/db/tables/invoices";
import { eq, desc, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { patientid } = await params;

    if (!patientid) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 }
      );
    }

    // Fetch all invoices for the patient
    const patientInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.patient_id, patientid))
      .orderBy(desc(invoices.invoice_date));

    // Fetch invoice items for each invoice
    const invoicesWithItems = await Promise.all(
      patientInvoices.map(async (invoice) => {
        const items = await db
          .select()
          .from(invoiceItems)
          .where(eq(invoiceItems.invoice_id, invoice.id));

        return {
          ...invoice,
          items: items,
        };
      })
    );

    // Calculate summary statistics
    const totalAmount = patientInvoices.reduce(
      (sum, inv) => sum + parseFloat(inv.total_amount?.toString() || "0"),
      0
    );

    const totalPaid = patientInvoices.reduce(
      (sum, inv) => sum + parseFloat(inv.amount_paid?.toString() || "0"),
      0
    );

    const totalDue = patientInvoices.reduce(
      (sum, inv) => sum + parseFloat(inv.balance_due?.toString() || "0"),
      0
    );

    const pendingInvoices = patientInvoices.filter(
      (inv) => inv.status === "PENDING" || inv.status === "PARTIAL"
    );

    const paidInvoices = patientInvoices.filter(
      (inv) => inv.status === "PAID"
    );

    return NextResponse.json({
      success: true,
      patientId: patientid,
      summary: {
        totalInvoices: patientInvoices.length,
        totalAmount: totalAmount.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        totalDue: totalDue.toFixed(2),
        pendingCount: pendingInvoices.length,
        paidCount: paidInvoices.length,
      },
      invoices: invoicesWithItems,
      pendingInvoices: pendingInvoices,
      recentPayments: paidInvoices.slice(0, 5), // Last 5 paid invoices
    });

  } catch (error) {
    console.error("Patient payment status error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve payment status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
