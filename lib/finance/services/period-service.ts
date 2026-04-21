/**
 * Finance Module — Fiscal Period Service
 *
 * CRUD and auto-generation for fiscal periods.
 * Periods control which date ranges accept journal postings.
 */
import { db } from "@/lib/db";
import { finPeriods, type FinPeriod } from "@/lib/db/tables/finance-periods";
import { eq, and, asc, desc } from "drizzle-orm";
import { FinanceError } from "../errors";

// ── Generate Monthly Periods for a Year ──────────────────────────
export async function generatePeriods(
  workspaceid: string,
  year: number
): Promise<{ periodsCreated: number }> {
  // Check if periods already exist for this year
  const existing = await db
    .select()
    .from(finPeriods)
    .where(
      and(
        eq(finPeriods.workspaceid, workspaceid),
        eq(finPeriods.fiscalyear, year)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new FinanceError(
      "DUPLICATE_CONFLICT",
      `Fiscal periods for ${year} already exist`
    );
  }

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  let count = 0;

  // Create 12 monthly periods
  for (let m = 0; m < 12; m++) {
    const monthNum = (m + 1).toString().padStart(2, "0");
    const startdate = `${year}-${monthNum}-01`;
    const lastDay = new Date(year, m + 1, 0).getDate();
    const enddate = `${year}-${monthNum}-${lastDay.toString().padStart(2, "0")}`;

    await db.insert(finPeriods).values({
      workspaceid,
      periodcode: `${year}-${monthNum}`,
      periodname: `${months[m]} ${year}`,
      periodtype: "MONTH",
      startdate,
      enddate,
      fiscalyear: year,
      status: "OPEN",
    });
    count++;
  }

  return { periodsCreated: count };
}

// ── List Periods ─────────────────────────────────────────────────
export async function listPeriods(
  workspaceid: string,
  filters?: { fiscalyear?: number; status?: string }
): Promise<FinPeriod[]> {
  const conditions = [eq(finPeriods.workspaceid, workspaceid)];

  if (filters?.fiscalyear) {
    conditions.push(eq(finPeriods.fiscalyear, filters.fiscalyear));
  }
  if (filters?.status) {
    conditions.push(eq(finPeriods.status, filters.status as FinPeriod["status"]));
  }

  return db
    .select()
    .from(finPeriods)
    .where(and(...conditions))
    .orderBy(asc(finPeriods.startdate));
}

// ── Get Period by ID ─────────────────────────────────────────────
export async function getPeriodById(
  workspaceid: string,
  periodid: string
): Promise<FinPeriod | null> {
  const [period] = await db
    .select()
    .from(finPeriods)
    .where(
      and(
        eq(finPeriods.workspaceid, workspaceid),
        eq(finPeriods.periodid, periodid)
      )
    )
    .limit(1);
  return period ?? null;
}

// ── Close Period ─────────────────────────────────────────────────
export async function closePeriod(
  workspaceid: string,
  periodid: string,
  userid: string
): Promise<FinPeriod> {
  const period = await getPeriodById(workspaceid, periodid);
  if (!period) {
    throw new FinanceError("NOT_FOUND", "Period not found");
  }
  if (period.status !== "OPEN") {
    throw new FinanceError(
      "VALIDATION_ERROR",
      `Period is already ${period.status}`
    );
  }

  const [updated] = await db
    .update(finPeriods)
    .set({
      status: "CLOSED",
      closedby: userid,
      closedat: new Date(),
    })
    .where(
      and(
        eq(finPeriods.workspaceid, workspaceid),
        eq(finPeriods.periodid, periodid)
      )
    )
    .returning();

  return updated;
}

// ── Reopen Period ────────────────────────────────────────────────
export async function reopenPeriod(
  workspaceid: string,
  periodid: string
): Promise<FinPeriod> {
  const period = await getPeriodById(workspaceid, periodid);
  if (!period) {
    throw new FinanceError("NOT_FOUND", "Period not found");
  }
  if (period.status === "LOCKED") {
    throw new FinanceError(
      "VALIDATION_ERROR",
      "Locked periods cannot be reopened"
    );
  }
  if (period.status === "OPEN") {
    throw new FinanceError("VALIDATION_ERROR", "Period is already open");
  }

  const [updated] = await db
    .update(finPeriods)
    .set({
      status: "OPEN",
      closedby: null,
      closedat: null,
    })
    .where(
      and(
        eq(finPeriods.workspaceid, workspaceid),
        eq(finPeriods.periodid, periodid)
      )
    )
    .returning();

  return updated;
}
