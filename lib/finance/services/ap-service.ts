/**
 * Finance Module — Accounts Payable Service
 *
 * AP invoice CRUD, payment recording, allocation, and aging.
 */
import { db } from "@/lib/db";
import {
  finApInvoices,
  finApPayments,
  finApPaymentAllocations,
  finVendors,
  type FinApInvoice,
  type FinApPayment,
  type FinVendor,
} from "@/lib/db/tables/finance-ap";
import { finAuditLog } from "@/lib/db/tables/finance-audit";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { postFinancialEvent } from "./posting-engine";
import { FinanceError } from "../errors";
import type { CreateApInvoiceInput, CreateApPaymentInput } from "../validation";

// ═══════════════════════════════════════════════════════════════
// VENDOR FINANCIAL MASTER
// ═══════════════════════════════════════════════════════════════

export async function getOrCreateVendor(
  workspaceid: string,
  vendorid: string
): Promise<FinVendor> {
  const [existing] = await db
    .select()
    .from(finVendors)
    .where(eq(finVendors.vendorid, vendorid))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(finVendors)
    .values({ vendorid, workspaceid })
    .returning();

  return created;
}

// ═══════════════════════════════════════════════════════════════
// AP INVOICES
// ═══════════════════════════════════════════════════════════════

export async function createApInvoice(
  workspaceid: string,
  input: CreateApInvoiceInput,
  userid: string
): Promise<FinApInvoice> {
  await getOrCreateVendor(workspaceid, input.vendorid);

  const [invoice] = await db
    .insert(finApInvoices)
    .values({
      workspaceid,
      vendorid: input.vendorid,
      invoicenumber: input.invoicenumber,
      supplierinvoicenumber: input.supplierinvoicenumber ?? null,
      invoicedate: input.invoicedate,
      duedate: input.duedate,
      grnid: input.grnid ?? null,
      poid: input.poid ?? null,
      subtotal: input.subtotal.toFixed(2),
      taxamount: input.taxamount.toFixed(2),
      totalamount: input.totalamount.toFixed(2),
      paidamount: "0",
      balancedue: input.totalamount.toFixed(2),
      status: "DRAFT",
      createdby: userid,
    })
    .returning();

  return invoice;
}

export async function listApInvoices(
  workspaceid: string,
  filters?: {
    vendorid?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ invoices: FinApInvoice[]; total: number }> {
  const conditions = [eq(finApInvoices.workspaceid, workspaceid)];

  if (filters?.vendorid) {
    conditions.push(eq(finApInvoices.vendorid, filters.vendorid));
  }
  if (filters?.status) {
    conditions.push(
      sql`${finApInvoices.status} = ${filters.status}`
    );
  }

  const limit = Math.min(filters?.limit ?? 50, 200);
  const offset = filters?.offset ?? 0;

  const [invoices, countResult] = await Promise.all([
    db
      .select()
      .from(finApInvoices)
      .where(and(...conditions))
      .orderBy(desc(finApInvoices.invoicedate))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(finApInvoices)
      .where(and(...conditions)),
  ]);

  return { invoices, total: countResult[0]?.count ?? 0 };
}

export async function getApInvoiceById(
  workspaceid: string,
  apinvoiceid: string
): Promise<FinApInvoice | null> {
  const [invoice] = await db
    .select()
    .from(finApInvoices)
    .where(
      and(
        eq(finApInvoices.workspaceid, workspaceid),
        eq(finApInvoices.apinvoiceid, apinvoiceid)
      )
    )
    .limit(1);
  return invoice ?? null;
}

// ── Post AP Invoice to GL ────────────────────────────────────────
// Reverses GRNI and creates AP liability
export async function postApInvoice(
  workspaceid: string,
  apinvoiceid: string,
  userid: string
): Promise<FinApInvoice> {
  const invoice = await getApInvoiceById(workspaceid, apinvoiceid);
  if (!invoice) throw new FinanceError("NOT_FOUND", "AP invoice not found");
  if (invoice.status !== "DRAFT" && invoice.status !== "APPROVED") {
    throw new FinanceError(
      "VALIDATION_ERROR",
      `Cannot post invoice with status ${invoice.status}`
    );
  }

  const totalAmount = parseFloat(invoice.totalamount);

  // Journal: Dr GRNI, Cr AP
  const result = await postFinancialEvent({
    workspaceid,
    sourcetype: "SUPPLIER_INVOICE",
    sourceid: apinvoiceid,
    date: invoice.invoicedate,
    description: `Supplier invoice: ${invoice.invoicenumber}`,
    lines: [
      {
        accountcode: "1133",
        debit: totalAmount,
        credit: 0,
        memo: `Clear GRNI: ${invoice.invoicenumber}`,
      },
      {
        accountcode: "2111",
        debit: 0,
        credit: totalAmount,
        memo: `AP: ${invoice.invoicenumber}`,
      },
    ],
    userid,
    metadata: { apinvoiceid, vendorid: invoice.vendorid },
  });

  if (!result.success) {
    throw new FinanceError("INTERNAL_ERROR", `GL posting failed: ${result.error}`);
  }

  const [updated] = await db
    .update(finApInvoices)
    .set({
      status: "POSTED",
      journalid: result.journalid,
      updatedat: new Date(),
    })
    .where(eq(finApInvoices.apinvoiceid, apinvoiceid))
    .returning();

  return updated;
}

// ═══════════════════════════════════════════════════════════════
// AP PAYMENTS
// ═══════════════════════════════════════════════════════════════

export async function createApPayment(
  workspaceid: string,
  input: CreateApPaymentInput,
  userid: string
): Promise<FinApPayment> {
  // Validate all invoices exist and have sufficient balance
  for (const alloc of input.allocations) {
    const inv = await getApInvoiceById(workspaceid, alloc.apinvoiceid);
    if (!inv) {
      throw new FinanceError(
        "NOT_FOUND",
        `AP invoice ${alloc.apinvoiceid} not found`
      );
    }
    const balance = parseFloat(inv.balancedue);
    if (alloc.amount > balance + 0.01) {
      throw new FinanceError(
        "VALIDATION_ERROR",
        `Payment $${alloc.amount} exceeds balance $${balance} on invoice ${inv.invoicenumber}`
      );
    }
  }

  // Post payment journal: Dr AP, Cr Cash/Bank
  const result = await postFinancialEvent({
    workspaceid,
    sourcetype: "SUPPLIER_PAYMENT",
    sourceid: null, // will be set after payment created
    date: input.paymentdate,
    description: `Supplier payment: ${input.paymentmethod}`,
    lines: [
      {
        accountcode: "2111",
        debit: input.totalamount,
        credit: 0,
        memo: "Settle AP",
      },
      {
        accountcode: "1111",
        debit: 0,
        credit: input.totalamount,
        memo: `Payment: ${input.paymentmethod}`,
      },
    ],
    userid,
  });

  if (!result.success) {
    throw new FinanceError("INTERNAL_ERROR", `GL posting failed: ${result.error}`);
  }

  // Create payment record
  const [payment] = await db
    .insert(finApPayments)
    .values({
      workspaceid,
      vendorid: input.vendorid,
      paymentdate: input.paymentdate,
      paymentmethod: input.paymentmethod,
      bankaccountid: input.bankaccountid ?? null,
      reference: input.reference ?? null,
      totalamount: input.totalamount.toFixed(2),
      journalid: result.journalid,
      createdby: userid,
    })
    .returning();

  // Create allocations and update invoice balances
  for (const alloc of input.allocations) {
    await db.insert(finApPaymentAllocations).values({
      paymentid: payment.paymentid,
      apinvoiceid: alloc.apinvoiceid,
      amount: alloc.amount.toFixed(2),
    });

    // Update invoice paid amount and balance
    const inv = await getApInvoiceById(workspaceid, alloc.apinvoiceid);
    if (inv) {
      const newPaid = parseFloat(inv.paidamount) + alloc.amount;
      const newBalance = parseFloat(inv.totalamount) - newPaid;
      const newStatus = newBalance <= 0.01 ? "PAID" : "PARTIAL";

      await db
        .update(finApInvoices)
        .set({
          paidamount: newPaid.toFixed(2),
          balancedue: Math.max(0, newBalance).toFixed(2),
          status: newStatus,
          updatedat: new Date(),
        })
        .where(eq(finApInvoices.apinvoiceid, alloc.apinvoiceid));
    }
  }

  return payment;
}

export async function listApPayments(
  workspaceid: string,
  filters?: { vendorid?: string; limit?: number; offset?: number }
): Promise<FinApPayment[]> {
  const conditions = [eq(finApPayments.workspaceid, workspaceid)];
  if (filters?.vendorid) {
    conditions.push(eq(finApPayments.vendorid, filters.vendorid));
  }

  return db
    .select()
    .from(finApPayments)
    .where(and(...conditions))
    .orderBy(desc(finApPayments.paymentdate))
    .limit(filters?.limit ?? 50)
    .offset(filters?.offset ?? 0);
}

// ── AP Aging Report ──────────────────────────────────────────────
interface ApAgingBucket {
  vendorid: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
  total: number;
}

export async function getApAging(
  workspaceid: string
): Promise<ApAgingBucket[]> {
  const rows = await db.execute(sql`
    SELECT
      vendorid,
      SUM(CASE WHEN age <= 30 THEN bal ELSE 0 END) as current_amount,
      SUM(CASE WHEN age > 30 AND age <= 60 THEN bal ELSE 0 END) as days_30,
      SUM(CASE WHEN age > 60 AND age <= 90 THEN bal ELSE 0 END) as days_60,
      SUM(CASE WHEN age > 90 AND age <= 120 THEN bal ELSE 0 END) as days_90,
      SUM(CASE WHEN age > 120 THEN bal ELSE 0 END) as over_90,
      SUM(bal) as total
    FROM (
      SELECT
        vendorid,
        CAST(balancedue AS numeric) as bal,
        EXTRACT(DAY FROM NOW() - duedate::timestamp) as age
      FROM fin_ap_invoices
      WHERE workspaceid = ${workspaceid}
        AND CAST(balancedue AS numeric) > 0.01
    ) aged
    GROUP BY vendorid
    ORDER BY total DESC
  `);

  return (rows as unknown as any[]).map((r: any) => ({
    vendorid: r.vendorid,
    current: parseFloat(r.current_amount || "0"),
    days30: parseFloat(r.days_30 || "0"),
    days60: parseFloat(r.days_60 || "0"),
    days90: parseFloat(r.days_90 || "0"),
    over90: parseFloat(r.over_90 || "0"),
    total: parseFloat(r.total || "0"),
  }));
}
