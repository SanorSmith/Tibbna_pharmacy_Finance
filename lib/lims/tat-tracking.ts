/**
 * TAT (Turnaround Time) Tracking Utility
 *
 * Calculates elapsed time across LIMS workflow milestones and classifies
 * samples as on-time, warning, or overdue based on configurable thresholds.
 *
 * Workflow milestones:
 *   Order placed → Sample collected → Sample accessioned → Results entered → Results released
 *
 * Default TAT thresholds (hours):
 *   ROUTINE: 24h expected, warning at 75%, overdue at 100%
 *   URGENT:  4h expected, warning at 75%, overdue at 100%
 *   STAT:    1h expected, warning at 75%, overdue at 100%
 *   ASAP:    2h expected, warning at 75%, overdue at 100%
 */

// ── TAT Thresholds (in hours) ──

export const TAT_THRESHOLDS: Record<string, { expected: number; warningPct: number }> = {
  ROUTINE: { expected: 24, warningPct: 0.75 },
  URGENT: { expected: 4, warningPct: 0.75 },
  STAT: { expected: 1, warningPct: 0.75 },
  ASAP: { expected: 2, warningPct: 0.75 },
};

// ── Types ──

export type TATStatus = "on_time" | "warning" | "overdue" | "completed";

export interface TATInfo {
  /** Elapsed time in milliseconds from the start point to now or completion */
  elapsedMs: number;
  /** Human-readable elapsed string, e.g. "2h 15m", "1d 3h" */
  elapsedDisplay: string;
  /** Expected TAT in milliseconds */
  expectedMs: number;
  /** Expected TAT human-readable */
  expectedDisplay: string;
  /** Percentage of expected TAT consumed (0-100+) */
  percentUsed: number;
  /** Status classification */
  status: TATStatus;
  /** Whether the sample/order is complete (has a release date) */
  isComplete: boolean;
  /** Total TAT if complete (start to release) */
  totalMs: number | null;
  totalDisplay: string | null;
}

// ── Core Calculation ──

/**
 * Calculate TAT info for a sample/order.
 *
 * @param startDate     - When the clock starts (order created or sample collected)
 * @param endDate       - When the clock stops (results released), or null if still in progress
 * @param priority      - Order priority (ROUTINE, URGENT, STAT, ASAP)
 * @param expectedHours - Override expected TAT in hours (e.g. from test catalog)
 */
export function calculateTAT(
  startDate: Date | string,
  endDate: Date | string | null | undefined,
  priority: string = "ROUTINE",
  expectedHours?: number | null
): TATInfo {
  const start = toDate(startDate);
  const end = endDate ? toDate(endDate) : null;
  const now = new Date();

  const threshold = TAT_THRESHOLDS[priority.toUpperCase()] || TAT_THRESHOLDS.ROUTINE;
  const expHours = expectedHours ?? threshold.expected;
  const expectedMs = expHours * 60 * 60 * 1000;
  const warningMs = expectedMs * threshold.warningPct;

  const isComplete = end !== null;
  const elapsedMs = isComplete ? end.getTime() - start.getTime() : now.getTime() - start.getTime();

  let status: TATStatus;
  if (isComplete) {
    status = "completed";
  } else if (elapsedMs >= expectedMs) {
    status = "overdue";
  } else if (elapsedMs >= warningMs) {
    status = "warning";
  } else {
    status = "on_time";
  }

  const percentUsed = expectedMs > 0 ? Math.round((elapsedMs / expectedMs) * 100) : 0;

  return {
    elapsedMs,
    elapsedDisplay: formatDuration(elapsedMs),
    expectedMs,
    expectedDisplay: formatDuration(expectedMs),
    percentUsed,
    status,
    isComplete,
    totalMs: isComplete ? elapsedMs : null,
    totalDisplay: isComplete ? formatDuration(elapsedMs) : null,
  };
}

/**
 * Client-side helper: compute TAT from sample data returned by the API.
 * Uses collectiondate or accessionedat as start, and checks if status indicates completion.
 */
export function computeSampleTAT(sample: {
  collectiondate?: string | null;
  accessionedat?: string | null;
  currentstatus?: string;
  releaseddate?: string | null;
  priority?: string;
  orderStatus?: string;
  orderCancelledAt?: string | null;
}): TATInfo | null {
  // Exclude cancelled orders from TAT and workload KPIs
  if (sample.orderStatus === "CANCELLED" || sample.orderCancelledAt) {
    return null;
  }

  const startStr = sample.collectiondate || sample.accessionedat;
  if (!startStr) return null;

  const completedStatuses = ["ANALYZED", "DISPOSED", "IN_STORAGE"];
  const isComplete = completedStatuses.includes(sample.currentstatus || "");
  const endDate = sample.releaseddate || (isComplete ? sample.accessionedat : null);

  return calculateTAT(startStr, isComplete ? endDate : null, sample.priority || "ROUTINE");
}

// ── Display Helpers ──

/**
 * Format milliseconds into a human-readable duration string.
 * Examples: "45m", "2h 15m", "1d 3h", "3d"
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return "0m";

  const totalMinutes = Math.floor(ms / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  const remainingHours = totalHours % 24;
  const remainingMinutes = totalMinutes % 60;

  if (totalDays > 0) {
    if (remainingHours > 0) {
      return `${totalDays}d ${remainingHours}h`;
    }
    return `${totalDays}d`;
  }

  if (totalHours > 0) {
    if (remainingMinutes > 0) {
      return `${totalHours}h ${remainingMinutes}m`;
    }
    return `${totalHours}h`;
  }

  return `${totalMinutes}m`;
}

/**
 * Get CSS classes for TAT status badge coloring.
 */
export function getTATStatusColor(status: TATStatus): string {
  switch (status) {
    case "on_time":
      return "bg-green-100 text-green-800 border-green-200";
    case "warning":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "overdue":
      return "bg-red-100 text-red-800 border-red-200";
    case "completed":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

/**
 * Get a short label for TAT status.
 */
export function getTATStatusLabel(status: TATStatus): string {
  switch (status) {
    case "on_time":
      return "On Time";
    case "warning":
      return "Warning";
    case "overdue":
      return "Overdue";
    case "completed":
      return "Done";
    default:
      return "Unknown";
  }
}

// ── Helpers ──

function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}
