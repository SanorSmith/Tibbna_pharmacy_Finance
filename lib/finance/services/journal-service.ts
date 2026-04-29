/**
 * Finance Module — Journal Entry Service
 *
 * CRUD for journal entries. Posting/reversal delegated to posting-engine.
 */
import { db } from "@/lib/db";
import {
  finJournalEntries,
  finJournalLines,
  type FinJournalEntry,
  type FinJournalLine,
} from "@/lib/db/tables/finance-journal";
import { finAccounts } from "@/lib/db/tables/finance-accounts";
import { finPeriods } from "@/lib/db/tables/finance-periods";
import { eq, and, desc, asc, sql, lte, gte } from "drizzle-orm";
import { FinanceError } from "../errors";
import type { CreateJournalEntryInput } from "../validation";
import { postFinancialEvent } from "./posting-engine";
import type { PostingResponse } from "../types";

export interface JournalWithLines extends FinJournalEntry {
  lines: (FinJournalLine & {
    accountcode?: string;
    accountname?: string;
  })[];
}

// ── Create Manual Journal Entry (DRAFT) ──────────────────────────
export async function createManualJournal(
  workspaceid: string,
  input: CreateJournalEntryInput,
  userid: string
): Promise<PostingResponse> {
  return postFinancialEvent({
    workspaceid,
    sourcetype: "MANUAL",
    sourceid: null,
    date: input.journaldate,
    description: input.description ?? "",
    lines: input.lines.map((l) => ({
      accountcode: l.accountcode,
      debit: l.debit,
      credit: l.credit,
      memo: l.memo ?? undefined,
    })),
    userid,
  });
}

// ── List Journal Entries ─────────────────────────────────────────
export async function listJournalEntries(
  workspaceid: string,
  filters?: {
    status?: string;
    sourcetype?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ entries: FinJournalEntry[]; total: number }> {
  const conditions = [eq(finJournalEntries.workspaceid, workspaceid)];

  if (filters?.status) {
    conditions.push(
      eq(
        finJournalEntries.status,
        filters.status as FinJournalEntry["status"]
      )
    );
  }
  if (filters?.from) {
    conditions.push(gte(finJournalEntries.journaldate, filters.from));
  }
  if (filters?.to) {
    conditions.push(lte(finJournalEntries.journaldate, filters.to));
  }
  if (filters?.sourcetype) {
    conditions.push(
      sql`${finJournalEntries.sourcetype} = ${filters.sourcetype}`
    );
  }

  const limit = Math.min(filters?.limit ?? 50, 200);
  const offset = filters?.offset ?? 0;

  const [entries, countResult] = await Promise.all([
    db
      .select()
      .from(finJournalEntries)
      .where(and(...conditions))
      .orderBy(desc(finJournalEntries.journaldate), desc(finJournalEntries.createdat))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(finJournalEntries)
      .where(and(...conditions)),
  ]);

  return {
    entries,
    total: countResult[0]?.count ?? 0,
  };
}

// ── Get Journal with Lines ───────────────────────────────────────
export async function getJournalWithLines(
  workspaceid: string,
  journalid: string
): Promise<JournalWithLines | null> {
  const [journal] = await db
    .select()
    .from(finJournalEntries)
    .where(
      and(
        eq(finJournalEntries.workspaceid, workspaceid),
        eq(finJournalEntries.journalid, journalid)
      )
    )
    .limit(1);

  if (!journal) return null;

  // Fetch lines with account info
  const lines = await db
    .select({
      lineid: finJournalLines.lineid,
      journalid: finJournalLines.journalid,
      accountid: finJournalLines.accountid,
      debit: finJournalLines.debit,
      credit: finJournalLines.credit,
      memo: finJournalLines.memo,
      costcenterid: finJournalLines.costcenterid,
      branchid: finJournalLines.branchid,
      accountcode: finAccounts.accountcode,
      accountname: finAccounts.accountname,
    })
    .from(finJournalLines)
    .innerJoin(finAccounts, eq(finAccounts.accountid, finJournalLines.accountid))
    .where(eq(finJournalLines.journalid, journalid))
    .orderBy(asc(finJournalLines.lineid));

  return { ...journal, lines };
}
