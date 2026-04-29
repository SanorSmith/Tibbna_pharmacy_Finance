/**
 * Finance Module — Posting Engine
 *
 * The CORE of the finance system. Handles:
 * 1. Idempotency checking (same source → same journal)
 * 2. Account code resolution → account IDs
 * 3. Period validation (must be OPEN)
 * 4. Balance validation (debits = credits)
 * 5. Journal + line creation in a DB transaction
 * 6. Account balance upsert
 * 7. Audit logging
 *
 * Called from: integration hooks (automatic), manual journal API, batch processes.
 */
import { db } from "@/lib/db";
import {
  finJournalEntries,
  finJournalLines,
} from "@/lib/db/tables/finance-journal";
import { finAccounts, type FinAccount } from "@/lib/db/tables/finance-accounts";
import { finPeriods } from "@/lib/db/tables/finance-periods";
import { finAccountBalances } from "@/lib/db/tables/finance-balances";
import { finAuditLog } from "@/lib/db/tables/finance-audit";
import { eq, and, lte, gte, sql, asc, desc } from "drizzle-orm";
import type {
  PostingRequest,
  PostingResponse,
  PostingResult,
  PostingError,
  PostingLine,
} from "../types";

// ── Main Entry Point ─────────────────────────────────────────────
export async function postFinancialEvent(
  req: PostingRequest
): Promise<PostingResponse> {
  try {
    // ═══ STEP 1: Idempotency Check ═════════════════════════════
    if (req.sourceid) {
      const existing = await findExistingJournal(
        req.workspaceid,
        req.sourcetype,
        req.sourceid
      );
      if (existing) {
        return {
          success: true,
          journalid: existing.journalid,
          journalnumber: existing.journalnumber,
          status: existing.status,
          idempotent: true,
        } as PostingResult;
      }
    }

    // ═══ STEP 2: Resolve Account Codes → IDs ═══════════════════
    const uniqueCodes = [...new Set(req.lines.map((l) => l.accountcode))];
    const accountMap = await resolveAccounts(req.workspaceid, uniqueCodes);

    for (const line of req.lines) {
      const account = accountMap.get(line.accountcode);
      if (!account) {
        return makeError(
          "ACCOUNT_NOT_FOUND",
          `Account code '${line.accountcode}' not found`
        );
      }
      if (!account.isactive) {
        return makeError(
          "ACCOUNT_NOT_FOUND",
          `Account '${line.accountcode}' is inactive`
        );
      }
      if (account.isgroupaccount) {
        return makeError(
          "VALIDATION_ERROR",
          `Account '${line.accountcode}' is a group account — cannot post directly`
        );
      }
    }

    // ═══ STEP 3: Find Open Period ══════════════════════════════
    const period = await findOpenPeriod(req.workspaceid, req.date);
    if (!period) {
      return makeError(
        "PERIOD_CLOSED",
        `No open fiscal period for date ${req.date}`
      );
    }

    // ═══ STEP 4: Validate Balance ══════════════════════════════
    const totalDebit = req.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = req.lines.reduce((sum, l) => sum + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      return makeError(
        "VALIDATION_ERROR",
        `Journal not balanced: debit=${totalDebit.toFixed(2)}, credit=${totalCredit.toFixed(2)}`
      );
    }

    // ═══ STEP 5: Validate Line Items ═══════════════════════════
    for (let i = 0; i < req.lines.length; i++) {
      const line = req.lines[i];
      if (line.debit > 0 && line.credit > 0) {
        return makeError(
          "VALIDATION_ERROR",
          `Line ${i + 1}: cannot have both debit and credit > 0`
        );
      }
      if (line.debit === 0 && line.credit === 0) {
        return makeError(
          "VALIDATION_ERROR",
          `Line ${i + 1}: must have debit or credit > 0`
        );
      }
      if (line.debit < 0 || line.credit < 0) {
        return makeError(
          "VALIDATION_ERROR",
          `Line ${i + 1}: negative amounts not allowed`
        );
      }
    }

    // ═══ STEP 6: Generate Journal Number ═══════════════════════
    const journalnumber = await generateJournalNumber(req.workspaceid);

    // ═══ STEP 7: Create Journal + Lines in Transaction ═════════
    const isSystemGenerated = req.sourcetype !== "MANUAL";

    // Use raw SQL transaction via the postgres client for atomicity
    const journalResult = await db.transaction(async (tx) => {
      // Insert journal header
      const [journal] = await tx
        .insert(finJournalEntries)
        .values({
          workspaceid: req.workspaceid,
          journalnumber,
          journaldate: req.date,
          periodid: period.periodid,
          sourcetype: req.sourcetype,
          sourceid: req.sourceid,
          description: req.description,
          totaldebit: totalDebit.toFixed(2),
          totalcredit: totalCredit.toFixed(2),
          status: isSystemGenerated ? "POSTED" : "DRAFT",
          postedby: isSystemGenerated ? req.userid : null,
          postedat: isSystemGenerated ? new Date() : null,
          createdby: req.userid,
        })
        .returning();

      // Insert journal lines
      for (const line of req.lines) {
        const account = accountMap.get(line.accountcode)!;
        await tx.insert(finJournalLines).values({
          journalid: journal.journalid,
          accountid: account.accountid,
          debit: line.debit.toFixed(2),
          credit: line.credit.toFixed(2),
          memo: line.memo ?? null,
          costcenterid: line.costcenterid ?? null,
          branchid: line.branchid ?? null,
        });
      }

      // ═══ STEP 8: Update Account Balances (if auto-posted) ═══
      if (isSystemGenerated) {
        for (const line of req.lines) {
          const account = accountMap.get(line.accountcode)!;
          await upsertAccountBalance(
            tx,
            account.accountid,
            period.periodid,
            line.debit,
            line.credit
          );
        }
      }

      // ═══ STEP 9: Audit Log ══════════════════════════════════
      await tx.insert(finAuditLog).values({
        workspaceid: req.workspaceid,
        tablename: "fin_journal_entries",
        recordid: journal.journalid,
        action: "INSERT",
        userid: req.userid,
        afterdata: {
          journalid: journal.journalid,
          journalnumber: journal.journalnumber,
          sourcetype: req.sourcetype,
          sourceid: req.sourceid,
          totaldebit: totalDebit,
          totalcredit: totalCredit,
          linecount: req.lines.length,
        },
      });

      return journal;
    });

    return {
      success: true,
      journalid: journalResult.journalid,
      journalnumber: journalResult.journalnumber,
      status: journalResult.status,
      idempotent: false,
    } as PostingResult;
  } catch (err) {
    // Handle unique constraint violation (race condition on idempotency)
    if (
      err instanceof Error &&
      err.message.includes("fin_je_ws_source_uq")
    ) {
      // Another request beat us — fetch the existing journal
      if (req.sourceid) {
        const existing = await findExistingJournal(
          req.workspaceid,
          req.sourcetype,
          req.sourceid
        );
        if (existing) {
          return {
            success: true,
            journalid: existing.journalid,
            journalnumber: existing.journalnumber,
            status: existing.status,
            idempotent: true,
          } as PostingResult;
        }
      }
    }

    console.error("[PostingEngine] Unexpected error:", err);
    return makeError(
      "INTERNAL_ERROR",
      err instanceof Error ? err.message : "Unknown posting error"
    );
  }
}

// ── Post a DRAFT Journal (manual entries) ────────────────────────
export async function postDraftJournal(
  workspaceid: string,
  journalid: string,
  userid: string
): Promise<PostingResponse> {
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

  if (!journal) {
    return makeError("VALIDATION_ERROR", "Journal not found");
  }
  if (journal.status !== "DRAFT") {
    return makeError("VALIDATION_ERROR", `Journal is already ${journal.status}`);
  }

  // Verify period still open
  const [period] = await db
    .select()
    .from(finPeriods)
    .where(eq(finPeriods.periodid, journal.periodid))
    .limit(1);

  if (!period || period.status !== "OPEN") {
    return makeError("PERIOD_CLOSED", "Fiscal period is no longer open");
  }

  // Get lines
  const lines = await db
    .select()
    .from(finJournalLines)
    .where(eq(finJournalLines.journalid, journalid));

  // Re-validate balance
  const totalDebit = lines.reduce((sum, l) => sum + parseFloat(l.debit), 0);
  const totalCredit = lines.reduce(
    (sum, l) => sum + parseFloat(l.credit),
    0
  );
  if (Math.abs(totalDebit - totalCredit) >= 0.01) {
    return makeError(
      "VALIDATION_ERROR",
      "Journal is not balanced — cannot post"
    );
  }

  // Post within transaction
  await db.transaction(async (tx) => {
    // Update balances
    for (const line of lines) {
      await upsertAccountBalance(
        tx,
        line.accountid,
        journal.periodid,
        parseFloat(line.debit),
        parseFloat(line.credit)
      );
    }

    // Mark as posted
    await tx
      .update(finJournalEntries)
      .set({
        status: "POSTED",
        postedby: userid,
        postedat: new Date(),
        updatedat: new Date(),
      })
      .where(eq(finJournalEntries.journalid, journalid));

    // Audit
    await tx.insert(finAuditLog).values({
      workspaceid,
      tablename: "fin_journal_entries",
      recordid: journalid,
      action: "UPDATE",
      userid,
      beforedata: { status: "DRAFT" },
      afterdata: { status: "POSTED" },
    });
  });

  return {
    success: true,
    journalid,
    journalnumber: journal.journalnumber,
    status: "POSTED",
    idempotent: false,
  } as PostingResult;
}

// ── Reverse a Posted Journal ─────────────────────────────────────
export async function reverseJournal(
  workspaceid: string,
  journalid: string,
  reason: string,
  userid: string
): Promise<PostingResponse> {
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

  if (!journal) {
    return makeError("VALIDATION_ERROR", "Journal not found");
  }
  if (journal.status !== "POSTED") {
    return makeError(
      "VALIDATION_ERROR",
      "Only POSTED journals can be reversed"
    );
  }

  // Get original lines
  const originalLines = await db
    .select()
    .from(finJournalLines)
    .where(eq(finJournalLines.journalid, journalid));

  // Build reversal lines (swap debit/credit)
  const reversalLines: PostingLine[] = originalLines.map((line) => ({
    accountcode: "", // We'll use accountid directly below
    debit: parseFloat(line.credit),
    credit: parseFloat(line.debit),
    memo: `Reversal: ${line.memo || ""}`.trim(),
  }));

  // Find open period
  const today = new Date().toISOString().split("T")[0];
  const period = await findOpenPeriod(workspaceid, today);
  if (!period) {
    return makeError("PERIOD_CLOSED", "No open period for reversal date");
  }

  const journalnumber = await generateJournalNumber(workspaceid);
  const totalDebit = reversalLines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = reversalLines.reduce((sum, l) => sum + l.credit, 0);

  const result = await db.transaction(async (tx) => {
    // Create reversal journal
    const [reversal] = await tx
      .insert(finJournalEntries)
      .values({
        workspaceid,
        journalnumber,
        journaldate: today,
        periodid: period.periodid,
        sourcetype: journal.sourcetype,
        sourceid: `REV-${journal.sourceid || journal.journalid}`,
        description: `Reversal of ${journal.journalnumber}: ${reason}`,
        totaldebit: totalDebit.toFixed(2),
        totalcredit: totalCredit.toFixed(2),
        status: "POSTED",
        postedby: userid,
        postedat: new Date(),
        reversalof: journalid,
        reversalreason: reason,
        createdby: userid,
      })
      .returning();

    // Insert reversed lines + update balances
    for (let i = 0; i < originalLines.length; i++) {
      const orig = originalLines[i];
      const debit = parseFloat(orig.credit);
      const credit = parseFloat(orig.debit);

      await tx.insert(finJournalLines).values({
        journalid: reversal.journalid,
        accountid: orig.accountid,
        debit: debit.toFixed(2),
        credit: credit.toFixed(2),
        memo: `Reversal: ${orig.memo || ""}`.trim(),
      });

      await upsertAccountBalance(
        tx,
        orig.accountid,
        period.periodid,
        debit,
        credit
      );
    }

    // Mark original as reversed
    await tx
      .update(finJournalEntries)
      .set({ status: "REVERSED", updatedat: new Date() })
      .where(eq(finJournalEntries.journalid, journalid));

    // Audit
    await tx.insert(finAuditLog).values({
      workspaceid,
      tablename: "fin_journal_entries",
      recordid: reversal.journalid,
      action: "INSERT",
      userid,
      afterdata: {
        type: "REVERSAL",
        reversalof: journalid,
        reason,
      },
    });

    return reversal;
  });

  return {
    success: true,
    journalid: result.journalid,
    journalnumber: result.journalnumber,
    status: "POSTED",
    idempotent: false,
  } as PostingResult;
}

// ═══════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════

async function findExistingJournal(
  workspaceid: string,
  sourcetype: string,
  sourceid: string
) {
  const [existing] = await db
    .select()
    .from(finJournalEntries)
    .where(
      and(
        eq(finJournalEntries.workspaceid, workspaceid),
        sql`${finJournalEntries.sourcetype} = ${sourcetype}`,
        eq(finJournalEntries.sourceid, sourceid)
      )
    )
    .limit(1);
  return existing ?? null;
}

async function resolveAccounts(
  workspaceid: string,
  codes: string[]
): Promise<Map<string, FinAccount>> {
  const map = new Map<string, FinAccount>();
  if (codes.length === 0) return map;

  // Batch fetch all accounts for this workspace that match the codes
  const accounts = await db
    .select()
    .from(finAccounts)
    .where(eq(finAccounts.workspaceid, workspaceid));

  for (const account of accounts) {
    if (codes.includes(account.accountcode)) {
      map.set(account.accountcode, account);
    }
  }

  return map;
}

async function findOpenPeriod(workspaceid: string, dateStr: string) {
  const [period] = await db
    .select()
    .from(finPeriods)
    .where(
      and(
        eq(finPeriods.workspaceid, workspaceid),
        eq(finPeriods.status, "OPEN"),
        lte(finPeriods.startdate, dateStr),
        gte(finPeriods.enddate, dateStr)
      )
    )
    .limit(1);
  return period ?? null;
}

async function generateJournalNumber(workspaceid: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `JE-${year}-`;

  const [result] = await db
    .select({ maxnum: finJournalEntries.journalnumber })
    .from(finJournalEntries)
    .where(
      and(
        eq(finJournalEntries.workspaceid, workspaceid),
        sql`${finJournalEntries.journalnumber} LIKE ${prefix + "%"}`
      )
    )
    .orderBy(desc(finJournalEntries.journalnumber))
    .limit(1);

  let nextSeq = 1;
  if (result?.maxnum) {
    const currentSeq = parseInt(result.maxnum.replace(prefix, ""), 10);
    if (!isNaN(currentSeq)) {
      nextSeq = currentSeq + 1;
    }
  }

  return `${prefix}${nextSeq.toString().padStart(6, "0")}`;
}

// ── Balance Upsert ───────────────────────────────────────────────
async function upsertAccountBalance(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  accountid: string,
  periodid: string,
  debitDelta: number,
  creditDelta: number
): Promise<void> {
  if (debitDelta === 0 && creditDelta === 0) return;

  const [existing] = await tx
    .select()
    .from(finAccountBalances)
    .where(
      and(
        eq(finAccountBalances.accountid, accountid),
        eq(finAccountBalances.periodid, periodid)
      )
    )
    .limit(1);

  if (existing) {
    const newPeriodDebit = parseFloat(existing.perioddebit) + debitDelta;
    const newPeriodCredit = parseFloat(existing.periodcredit) + creditDelta;
    const newClosingDebit =
      parseFloat(existing.openingdebit) + newPeriodDebit;
    const newClosingCredit =
      parseFloat(existing.openingcredit) + newPeriodCredit;

    await tx
      .update(finAccountBalances)
      .set({
        perioddebit: newPeriodDebit.toFixed(2),
        periodcredit: newPeriodCredit.toFixed(2),
        closingdebit: newClosingDebit.toFixed(2),
        closingcredit: newClosingCredit.toFixed(2),
        updatedat: new Date(),
      })
      .where(eq(finAccountBalances.balanceid, existing.balanceid));
  } else {
    // New balance row — get opening from previous period
    const opening = await getPreviousPeriodClosing(tx, accountid, periodid);

    await tx.insert(finAccountBalances).values({
      accountid,
      periodid,
      openingdebit: opening.debit.toFixed(2),
      openingcredit: opening.credit.toFixed(2),
      perioddebit: debitDelta.toFixed(2),
      periodcredit: creditDelta.toFixed(2),
      closingdebit: (opening.debit + debitDelta).toFixed(2),
      closingcredit: (opening.credit + creditDelta).toFixed(2),
    });
  }
}

async function getPreviousPeriodClosing(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  accountid: string,
  currentPeriodId: string
): Promise<{ debit: number; credit: number }> {
  // Get current period's start date
  const [currentPeriod] = await tx
    .select()
    .from(finPeriods)
    .where(eq(finPeriods.periodid, currentPeriodId))
    .limit(1);

  if (!currentPeriod) return { debit: 0, credit: 0 };

  // Find previous period balance for this account
  const [prevBalance] = await tx
    .select({
      closingdebit: finAccountBalances.closingdebit,
      closingcredit: finAccountBalances.closingcredit,
    })
    .from(finAccountBalances)
    .innerJoin(finPeriods, eq(finPeriods.periodid, finAccountBalances.periodid))
    .where(
      and(
        eq(finAccountBalances.accountid, accountid),
        sql`${finPeriods.enddate} < ${currentPeriod.startdate}`
      )
    )
    .orderBy(desc(finPeriods.enddate))
    .limit(1);

  if (!prevBalance) return { debit: 0, credit: 0 };

  return {
    debit: parseFloat(prevBalance.closingdebit),
    credit: parseFloat(prevBalance.closingcredit),
  };
}

// ── Error Helper ─────────────────────────────────────────────────
function makeError(
  code: PostingError["code"],
  message: string
): PostingError {
  return { success: false, error: message, code };
}
