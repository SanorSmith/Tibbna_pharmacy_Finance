/**
 * API Route: Drug Interaction Analytics
 * Provides statistics and metrics for interaction checking
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drugInteractionLogs } from "@/lib/db/tables/drug-interaction-logs";
import { desc, eq, and, gte, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceid = searchParams.get("workspaceid");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!workspaceid) {
      return NextResponse.json(
        { error: "workspaceid is required" },
        { status: 400 }
      );
    }

    // Date range filter
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const end = endDate ? new Date(endDate) : new Date();

    // Fetch all logs in date range
    const logs = await db
      .select()
      .from(drugInteractionLogs)
      .where(
        and(
          eq(drugInteractionLogs.workspaceid, workspaceid),
          gte(drugInteractionLogs.checkedAt, start)
        )
      )
      .orderBy(desc(drugInteractionLogs.checkedAt));

    // Calculate statistics
    const totalChecks = logs.length;
    const checksWithInteractions = logs.filter((log) => parseInt(log.interactionCount) > 0).length;
    const proceeded = logs.filter((log) => log.decision === "proceeded").length;
    const cancelled = logs.filter((log) => log.decision === "cancelled").length;
    const noInteractions = logs.filter((log) => log.decision === "no_interactions").length;

    // Severity breakdown
    const criticalCount = logs.filter((log) => log.highestSeverity === "critical").length;
    const majorCount = logs.filter((log) => log.highestSeverity === "major").length;
    const moderateCount = logs.filter((log) => log.highestSeverity === "moderate").length;
    const minorCount = logs.filter((log) => log.highestSeverity === "minor").length;

    // Most active pharmacists
    const pharmacistStats: Record<string, { name: string; checks: number; proceeded: number; cancelled: number }> = {};
    logs.forEach((log) => {
      if (!pharmacistStats[log.pharmacistId]) {
        pharmacistStats[log.pharmacistId] = {
          name: log.pharmacistName,
          checks: 0,
          proceeded: 0,
          cancelled: 0,
        };
      }
      pharmacistStats[log.pharmacistId].checks++;
      if (log.decision === "proceeded") pharmacistStats[log.pharmacistId].proceeded++;
      if (log.decision === "cancelled") pharmacistStats[log.pharmacistId].cancelled++;
    });

    const topPharmacists = Object.entries(pharmacistStats)
      .map(([id, stats]) => ({ pharmacistId: id, ...stats }))
      .sort((a, b) => b.checks - a.checks)
      .slice(0, 10);

    // Most common drug combinations
    const drugCombinations: Record<string, number> = {};
    logs.forEach((log) => {
      if (log.drugs && Array.isArray(log.drugs)) {
        const drugNames = (log.drugs as any[]).map((d: any) => d.name).sort().join(" + ");
        drugCombinations[drugNames] = (drugCombinations[drugNames] || 0) + 1;
      }
    });

    const topCombinations = Object.entries(drugCombinations)
      .map(([drugs, count]) => ({ drugs, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Checks over time (daily)
    const checksOverTime: Record<string, number> = {};
    logs.forEach((log) => {
      const date = new Date(log.checkedAt).toISOString().split("T")[0];
      checksOverTime[date] = (checksOverTime[date] || 0) + 1;
    });

    const timeSeriesData = Object.entries(checksOverTime)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Intervention rate (checks that prevented potential issues)
    const interventionRate = totalChecks > 0 ? ((checksWithInteractions / totalChecks) * 100).toFixed(1) : "0";
    const proceedRate = checksWithInteractions > 0 ? ((proceeded / checksWithInteractions) * 100).toFixed(1) : "0";
    const cancelRate = checksWithInteractions > 0 ? ((cancelled / checksWithInteractions) * 100).toFixed(1) : "0";

    return NextResponse.json({
      summary: {
        totalChecks,
        checksWithInteractions,
        noInteractions,
        proceeded,
        cancelled,
        interventionRate: `${interventionRate}%`,
        proceedRate: `${proceedRate}%`,
        cancelRate: `${cancelRate}%`,
      },
      severity: {
        critical: criticalCount,
        major: majorCount,
        moderate: moderateCount,
        minor: minorCount,
      },
      topPharmacists,
      topCombinations,
      timeSeriesData,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
