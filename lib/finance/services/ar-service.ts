/**
 * Finance Module — Accounts Receivable Service
 *
 * AR transaction logging and aging reports.
 * Customer balance = SUM(debit) - SUM(credit) per customer.
 */
import { db } from "@/lib/db";
import {
  finArTransactions,
  type FinArTransaction,
  type NewFinArTransaction,
} from "@/lib/db/tables/finance-ar";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import type { ArTransactionInput } from "../types";

// ── Create AR Transaction ────────────────────────────────────────
export async function createArTransaction(
  input: ArTransactionInput
): Promise<FinArTransaction> {
  const [transaction] = await db
    .insert(finArTransactions)
    .values({
      workspaceid: input.workspaceid,
      customertype: input.customertype,
      customerid: input.customerid,
      sourcetype: input.sourcetype,
      sourceid: input.sourceid,
      transactiondate: input.transactiondate,
      debitamount: input.debitamount.toFixed(2),
      creditamount: input.creditamount.toFixed(2),
      description: input.description ?? null,
      journalid: input.journalid ?? null,
    })
    .returning();

  return transaction;
}

// ── Get Customer Balance ─────────────────────────────────────────
export async function getCustomerBalance(
  workspaceid: string,
  customertype: string,
  customerid: string
): Promise<number> {
  const [result] = await db
    .select({
      balance: sql<string>`COALESCE(SUM(CAST(${finArTransactions.debitamount} AS numeric) - CAST(${finArTransactions.creditamount} AS numeric)), 0)`,
    })
    .from(finArTransactions)
    .where(
      and(
        eq(finArTransactions.workspaceid, workspaceid),
        sql`${finArTransactions.customertype} = ${customertype}`,
        eq(finArTransactions.customerid, customerid)
      )
    );

  return parseFloat(result?.balance ?? "0");
}

// ── List AR Transactions ─────────────────────────────────────────
export async function listArTransactions(
  workspaceid: string,
  filters?: {
    customertype?: string;
    customerid?: string;
    limit?: number;
    offset?: number;
  }
): Promise<FinArTransaction[]> {
  const conditions = [eq(finArTransactions.workspaceid, workspaceid)];

  if (filters?.customertype) {
    conditions.push(
      sql`${finArTransactions.customertype} = ${filters.customertype}`
    );
  }
  if (filters?.customerid) {
    conditions.push(eq(finArTransactions.customerid, filters.customerid));
  }

  return db
    .select()
    .from(finArTransactions)
    .where(and(...conditions))
    .orderBy(desc(finArTransactions.transactiondate))
    .limit(filters?.limit ?? 50)
    .offset(filters?.offset ?? 0);
}

// ── AR Aging Report ──────────────────────────────────────────────
interface AgingBucket {
  customertype: string;
  customerid: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
  total: number;
}

export async function getArAging(
  workspaceid: string
): Promise<AgingBucket[]> {
  const rows = await db.execute(sql`
    SELECT
      customertype,
      customerid,
      SUM(CASE WHEN age <= 30 THEN balance ELSE 0 END) as current_amount,
      SUM(CASE WHEN age > 30 AND age <= 60 THEN balance ELSE 0 END) as days_30,
      SUM(CASE WHEN age > 60 AND age <= 90 THEN balance ELSE 0 END) as days_60,
      SUM(CASE WHEN age > 90 AND age <= 120 THEN balance ELSE 0 END) as days_90,
      SUM(CASE WHEN age > 120 THEN balance ELSE 0 END) as over_90,
      SUM(balance) as total
    FROM (
      SELECT
        customertype,
        customerid,
        CAST(debitamount AS numeric) - CAST(creditamount AS numeric) as balance,
        EXTRACT(DAY FROM NOW() - transactiondate::timestamp) as age
      FROM fin_ar_transactions
      WHERE workspaceid = ${workspaceid}
    ) aged
    GROUP BY customertype, customerid
    HAVING SUM(balance) > 0.01
    ORDER BY total DESC
  `);

  return (rows as unknown as any[]).map((r: any) => ({
    customertype: r.customertype,
    customerid: r.customerid,
    current: parseFloat(r.current_amount || "0"),
    days30: parseFloat(r.days_30 || "0"),
    days60: parseFloat(r.days_60 || "0"),
    days90: parseFloat(r.days_90 || "0"),
    over90: parseFloat(r.over_90 || "0"),
    total: parseFloat(r.total || "0"),
  }));
}
