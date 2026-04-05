/**
 * Payment Recording API
 * 
 * Handles payment recording for all services (lab tests, consultations, pharmacy, etc.)
 * Updates invoice status and triggers notifications to EHR patient page
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { invoices, invoiceItems } from "@/lib/db/tables/invoices";
import { eq, and } from "drizzle-orm";
import { createWorkspaceNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      invoiceId,
      invoiceNumber,
      patientId,
      amountPaid,
      paymentMethod,
      paymentDate,
      notes,
      workspaceid,
    } = body;

    // Validate required fields
    if ((!invoiceId && !invoiceNumber) || !amountPaid || !paymentMethod) {
      return NextResponse.json(
        { error: "Missing required fields: invoiceId/invoiceNumber, amountPaid, paymentMethod" },
        { status: 400 }
      );
    }

    // Find the invoice
    let invoice;
    if (invoiceId) {
      [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);
    } else if (invoiceNumber) {
      [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.invoice_number, invoiceNumber))
        .limit(1);
    }

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Calculate new payment totals
    const currentAmountPaid = parseFloat(invoice.amount_paid?.toString() || "0");
    const newAmountPaid = currentAmountPaid + parseFloat(amountPaid);
    const totalAmount = parseFloat(invoice.total_amount?.toString() || "0");
    const newBalanceDue = totalAmount - newAmountPaid;

    // Determine new status
    let newStatus = invoice.status;
    if (newBalanceDue <= 0) {
      newStatus = "PAID";
    } else if (newAmountPaid > 0 && newBalanceDue > 0) {
      newStatus = "PARTIAL";
    }

    // Update invoice
    const [updatedInvoice] = await db
      .update(invoices)
      .set({
        amount_paid: newAmountPaid.toString(),
        balance_due: newBalanceDue.toString(),
        status: newStatus,
        payment_method: paymentMethod,
        payment_date: paymentDate || new Date().toISOString().split('T')[0],
        notes: notes || invoice.notes,
        updatedat: new Date(),
      })
      .where(eq(invoices.id, invoice.id))
      .returning();

    // Create notification for patient's EHR page
    if (patientId || invoice.patient_id) {
      const finalPatientId = patientId || invoice.patient_id;
      
      await createWorkspaceNotification({
        workspaceid: workspaceid || user.workspaceid,
        type: "PAYMENT_RECEIVED",
        title: `Payment Received - ${invoice.invoice_number}`,
        message: `Payment of ${amountPaid} received. ${newStatus === 'PAID' ? 'Invoice fully paid.' : `Balance due: ${newBalanceDue.toFixed(2)}`}`,
        relatedentityid: invoice.id,
        relatedentitytype: "invoice",
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          patientId: finalPatientId,
          amountPaid: amountPaid,
          paymentMethod: paymentMethod,
          newStatus: newStatus,
          balanceDue: newBalanceDue,
        },
      });
    }

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      payment: {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        status: newStatus,
        paymentMethod: paymentMethod,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      },
      message: newStatus === 'PAID' 
        ? "Payment recorded successfully. Invoice fully paid." 
        : `Payment recorded successfully. Balance due: ${newBalanceDue.toFixed(2)}`,
    });

  } catch (error) {
    console.error("Payment recording error:", error);
    return NextResponse.json(
      {
        error: "Failed to record payment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET - Retrieve payment history for an invoice
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");
    const invoiceNumber = searchParams.get("invoiceNumber");
    const patientId = searchParams.get("patientId");

    if (!invoiceId && !invoiceNumber && !patientId) {
      return NextResponse.json(
        { error: "Missing required parameter: invoiceId, invoiceNumber, or patientId" },
        { status: 400 }
      );
    }

    let query = db.select().from(invoices);

    if (invoiceId) {
      query = query.where(eq(invoices.id, invoiceId)) as any;
    } else if (invoiceNumber) {
      query = query.where(eq(invoices.invoice_number, invoiceNumber)) as any;
    } else if (patientId) {
      query = query.where(eq(invoices.patient_id, patientId)) as any;
    }

    const results = await query;

    return NextResponse.json({
      success: true,
      invoices: results,
      count: results.length,
    });

  } catch (error) {
    console.error("Payment history retrieval error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve payment history",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
