/**
 * Turnaround Time (TAT) Service
 *
 * Tracks elapsed time across the lab order lifecycle:
 *   Order placed → Sample received → Results entered → Validated → Approved → Released
 *
 * Provides:
 *  - Per-sample TAT calculation
 *  - Workspace-wide TAT statistics
 *  - Threshold-based alerting (fires TAT_ALERT notifications)
 */

import { db } from "@/lib/db";
import { accessionSamples, limsOrders, testResults } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, isNull, ne, or } from "drizzle-orm";
import { createWorkspaceNotification } from "@/lib/notifications";

// ── Default TAT thresholds (minutes) ──────────────────────────────────
// Can be overridden per-workspace via the API
export const DEFAULT_TAT_THRESHOLDS = {
  ROUTINE: {
    orderToAccession: 60,       // 1 h
    accessionToResult: 240,     // 4 h
    resultToValidation: 120,    // 2 h
    validationToRelease: 60,    // 1 h
    orderToRelease: 480,        // 8 h  (overall)
  },
  URGENT: {
    orderToAccession: 30,
    accessionToResult: 120,
    resultToValidation: 60,
    validationToRelease: 30,
    orderToRelease: 240,
  },
  STAT: {
    orderToAccession: 15,
    accessionToResult: 60,
    resultToValidation: 30,
    validationToRelease: 15,
    orderToRelease: 120,
  },
} as const;

export type PriorityLevel = keyof typeof DEFAULT_TAT_THRESHOLDS;

// ── Types ─────────────────────────────────────────────────────────────

export interface TATBreakdown {
  sampleid: string;
  samplenumber: string;
  orderid: string | null;
  priority: string;
  orderPlaced: string | null;
  sampleReceived: string | null;
  firstResultEntered: string | null;
  firstValidated: string | null;
  firstApproved: string | null;
  firstReleased: string | null;
  // Elapsed minutes (null when start or end timestamp missing)
  orderToAccessionMin: number | null;
  accessionToResultMin: number | null;
  resultToValidationMin: number | null;
  validationToReleaseMin: number | null;
  orderToReleaseMin: number | null;
  // Breach flags
  breaches: string[];
}

export interface TATStats {
  totalSamples: number;
  completedSamples: number;
  averageOrderToReleaseMin: number | null;
  medianOrderToReleaseMin: number | null;
  breachedCount: number;
  breachRate: number;
}

// ── Helpers ───────────────────────────────────────────────────────────

function diffMinutes(start: Date | string | null, end: Date | string | null): number | null {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e)) return null;
  return Math.round((e - s) / 60_000);
}

function getThresholds(priority: string) {
  const key = (priority || "ROUTINE").toUpperCase() as PriorityLevel;
  return DEFAULT_TAT_THRESHOLDS[key] || DEFAULT_TAT_THRESHOLDS.ROUTINE;
}

// ── Core: calculate TAT for a single sample ──────────────────────────

export async function calculateSampleTAT(sampleid: string): Promise<TATBreakdown | null> {
  const [sample] = await db
    .select({
      sampleid: accessionSamples.sampleid,
      samplenumber: accessionSamples.samplenumber,
      orderid: accessionSamples.orderid,
      accessionedat: accessionSamples.accessionedat,
    })
    .from(accessionSamples)
    .where(eq(accessionSamples.sampleid, sampleid))
    .limit(1);

  if (!sample) return null;

  // Order timestamp
  let orderPlaced: string | null = null;
  let priority = "ROUTINE";
  if (sample.orderid) {
    const [order] = await db
      .select({ createdat: limsOrders.createdat, priority: limsOrders.priority, cancelledat: limsOrders.cancelledat, status: limsOrders.status })
      .from(limsOrders)
      .where(eq(limsOrders.orderid, sample.orderid))
      .limit(1);
    if (order) {
      // Exclude cancelled orders from TAT calculations
      if (order.cancelledat || order.status === "CANCELLED") {
        return null;
      }
      orderPlaced = order.createdat?.toISOString() ?? null;
      priority = order.priority || "ROUTINE";
    }
  }

  // Result timestamps (earliest per milestone)
  const results = await db
    .select({
      entereddate: testResults.entereddate,
      technicalvalidateddate: testResults.technicalvalidateddate,
      medicalvalidateddate: testResults.medicalvalidateddate,
      releaseddate: testResults.releaseddate,
    })
    .from(testResults)
    .where(eq(testResults.sampleid, sampleid));

  const earliest = (dates: (Date | null | undefined)[]) => {
    const valid = dates.filter((d): d is Date => d != null).map(d => d.getTime());
    return valid.length > 0 ? new Date(Math.min(...valid)).toISOString() : null;
  };

  const firstResultEntered = earliest(results.map(r => r.entereddate));
  const firstValidated = earliest(results.map(r => r.technicalvalidateddate));
  const firstApproved = earliest(results.map(r => r.medicalvalidateddate));
  const firstReleased = earliest(results.map(r => r.releaseddate));
  const sampleReceived = sample.accessionedat?.toISOString() ?? null;

  const orderToAccessionMin = diffMinutes(orderPlaced, sampleReceived);
  const accessionToResultMin = diffMinutes(sampleReceived, firstResultEntered);
  const resultToValidationMin = diffMinutes(firstResultEntered, firstApproved || firstValidated);
  const validationToReleaseMin = diffMinutes(firstApproved || firstValidated, firstReleased);
  const orderToReleaseMin = diffMinutes(orderPlaced || sampleReceived, firstReleased);

  // Breach detection
  const thresholds = getThresholds(priority);
  const breaches: string[] = [];
  if (orderToAccessionMin != null && orderToAccessionMin > thresholds.orderToAccession) breaches.push("orderToAccession");
  if (accessionToResultMin != null && accessionToResultMin > thresholds.accessionToResult) breaches.push("accessionToResult");
  if (resultToValidationMin != null && resultToValidationMin > thresholds.resultToValidation) breaches.push("resultToValidation");
  if (validationToReleaseMin != null && validationToReleaseMin > thresholds.validationToRelease) breaches.push("validationToRelease");
  if (orderToReleaseMin != null && orderToReleaseMin > thresholds.orderToRelease) breaches.push("orderToRelease");

  // Also detect in-progress breaches (elapsed since last milestone without next milestone)
  const now = new Date().toISOString();
  if (!sampleReceived && orderPlaced) {
    const elapsed = diffMinutes(orderPlaced, now);
    if (elapsed != null && elapsed > thresholds.orderToAccession) breaches.push("orderToAccession_inProgress");
  }
  if (sampleReceived && !firstResultEntered) {
    const elapsed = diffMinutes(sampleReceived, now);
    if (elapsed != null && elapsed > thresholds.accessionToResult) breaches.push("accessionToResult_inProgress");
  }
  if (firstResultEntered && !firstApproved && !firstValidated) {
    const elapsed = diffMinutes(firstResultEntered, now);
    if (elapsed != null && elapsed > thresholds.resultToValidation) breaches.push("resultToValidation_inProgress");
  }
  if ((firstApproved || firstValidated) && !firstReleased) {
    const elapsed = diffMinutes(firstApproved || firstValidated, now);
    if (elapsed != null && elapsed > thresholds.validationToRelease) breaches.push("validationToRelease_inProgress");
  }

  return {
    sampleid: sample.sampleid,
    samplenumber: sample.samplenumber,
    orderid: sample.orderid,
    priority,
    orderPlaced,
    sampleReceived,
    firstResultEntered,
    firstValidated,
    firstApproved,
    firstReleased,
    orderToAccessionMin,
    accessionToResultMin,
    resultToValidationMin,
    validationToReleaseMin,
    orderToReleaseMin,
    breaches,
  };
}

// ── Workspace TAT summary ────────────────────────────────────────────

export async function getWorkspaceTATSummary(
  workspaceid: string,
  from?: Date,
  to?: Date,
): Promise<{ stats: TATStats; samples: TATBreakdown[] }> {
  const conditions: any[] = [eq(accessionSamples.workspaceid, workspaceid)];
  if (from) conditions.push(gte(accessionSamples.accessionedat, from));
  if (to) conditions.push(lte(accessionSamples.accessionedat, to));

  // Exclude samples linked to cancelled orders
  const samples = await db
    .select({ sampleid: accessionSamples.sampleid })
    .from(accessionSamples)
    .leftJoin(limsOrders, eq(accessionSamples.orderid, limsOrders.orderid))
    .where(and(
      ...conditions,
      or(
        isNull(accessionSamples.orderid),              // samples without linked orders
        isNull(limsOrders.cancelledat),                 // orders that aren't cancelled (by timestamp)
      ),
      or(
        isNull(accessionSamples.orderid),
        ne(limsOrders.status, "CANCELLED"),             // orders that aren't cancelled (by status)
      ),
    ))
    .orderBy(desc(accessionSamples.accessionedat))
    .limit(500);

  const breakdowns: TATBreakdown[] = [];
  for (const s of samples) {
    const tat = await calculateSampleTAT(s.sampleid);
    if (tat) breakdowns.push(tat);
  }

  const completed = breakdowns.filter(b => b.orderToReleaseMin != null);
  const completedTimes = completed.map(b => b.orderToReleaseMin!).sort((a, b) => a - b);

  const avg = completedTimes.length > 0
    ? Math.round(completedTimes.reduce((s, v) => s + v, 0) / completedTimes.length)
    : null;

  const median = completedTimes.length > 0
    ? completedTimes[Math.floor(completedTimes.length / 2)]
    : null;

  const breachedCount = breakdowns.filter(b => b.breaches.length > 0).length;

  return {
    stats: {
      totalSamples: breakdowns.length,
      completedSamples: completed.length,
      averageOrderToReleaseMin: avg,
      medianOrderToReleaseMin: median,
      breachedCount,
      breachRate: breakdowns.length > 0 ? Math.round((breachedCount / breakdowns.length) * 100) : 0,
    },
    samples: breakdowns,
  };
}

// ── TAT alert — call after key lifecycle events ──────────────────────

export async function checkAndAlertTAT(
  workspaceid: string,
  sampleid: string,
): Promise<void> {
  const tat = await calculateSampleTAT(sampleid);
  if (!tat || tat.breaches.length === 0) return;

  const inProgressBreaches = tat.breaches.filter(b => b.endsWith("_inProgress"));
  if (inProgressBreaches.length === 0) return; // only alert on in-progress breaches

  const stageLabels: Record<string, string> = {
    orderToAccession_inProgress: "Order → Accession",
    accessionToResult_inProgress: "Accession → Result Entry",
    resultToValidation_inProgress: "Result Entry → Validation",
    validationToRelease_inProgress: "Validation → Release",
  };

  const breachDescriptions = inProgressBreaches.map(b => stageLabels[b] || b).join(", ");

  try {
    await createWorkspaceNotification({
      workspaceid,
      type: "TAT_ALERT" as any,
      title: "TAT Threshold Breached",
      message: `Sample ${tat.samplenumber} (${tat.priority}) has exceeded TAT threshold for: ${breachDescriptions}.`,
      relatedentityid: sampleid,
      relatedentitytype: "sample",
      metadata: {
        sampleId: sampleid,
        sampleNumber: tat.samplenumber,
        priority: tat.priority,
        breaches: tat.breaches,
        orderToReleaseMin: tat.orderToReleaseMin,
      },
      priority: "high",
    });
  } catch (error) {
    console.error("[TAT] Failed to send TAT alert:", error);
  }
}
