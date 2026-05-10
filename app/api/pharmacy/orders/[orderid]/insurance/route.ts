/**
 * Apply Insurance to Pharmacy Order
 *
 * POST /api/d/[workspaceid]/pharmacy-orders/[orderid]/insurance
 *
 * Looks up the patient's insurance, recalculates the invoice with coverage applied.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  pharmacyOrders,
  invoices,
  invoiceLines,
  patientInsurance,
  insuranceCompanies,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { z } from "zod";

const insuranceSchema = z.object({
  insuranceid: z.string().uuid(),
});

type RouteParams = { params: Promise<{ workspaceid: string; orderid: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, orderid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { insuranceid } = insuranceSchema.parse(body);

    // Verify order
    const [order] = await db
      .select()
      .from(pharmacyOrders)
      .where(eq(pharmacyOrders.orderid, orderid))
      .limit(1);

    if (!order || order.workspaceid !== workspaceid) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Get insurance company + coverage %
    const [insurance] = await db
      .select()
      .from(insuranceCompanies)
      .where(eq(insuranceCompanies.insuranceid, insuranceid))
      .limit(1);

    if (!insurance) {
      return NextResponse.json({ error: "Insurance company not found" }, { status: 404 });
    }

    const coveragePercent = parseFloat(insurance.coveragepercent) / 100;

    // Get existing invoice
    const [inv] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.orderid, orderid))
      .limit(1);

    if (!inv) {
      return NextResponse.json(
        { error: "No invoice found. Dispense order first to generate invoice." },
        { status: 400 }
      );
    }

    // Recalculate lines
    const lines = await db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceid, inv.invoiceid));

    let totalInsuranceCovered = 0;
    let totalPatientPays = 0;

    for (const line of lines) {
      const lineTotal = parseFloat(line.linetotal);
      const covered = Math.round(lineTotal * coveragePercent * 100) / 100;
      const patientPays = Math.round((lineTotal - covered) * 100) / 100;

      totalInsuranceCovered += covered;
      totalPatientPays += patientPays;

      await db
        .update(invoiceLines)
        .set({
          insurancecovered: covered.toFixed(2),
          patientpays: patientPays.toFixed(2),
        })
        .where(eq(invoiceLines.lineid, line.lineid));
    }

    // Update invoice header
    const subtotal = parseFloat(inv.subtotal);
    const [updatedInvoice] = await db
      .update(invoices)
      .set({
        insuranceid,
        insurancecovered: totalInsuranceCovered.toFixed(2),
        patientcopay: totalPatientPays.toFixed(2),
        total: totalPatientPays.toFixed(2),
        updatedat: new Date(),
      })
      .where(eq(invoices.invoiceid, inv.invoiceid))
      .returning();

    const updatedLines = await db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceid, inv.invoiceid));

    return NextResponse.json({
      message: "Insurance applied",
      insurance: { name: insurance.name, coveragePercent: insurance.coveragepercent },
      invoice: { ...updatedInvoice, lines: updatedLines },
    });
  } catch (error) {
    console.error("[Pharmacy Insurance POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to apply insurance" }, { status: 500 });
  }
}
