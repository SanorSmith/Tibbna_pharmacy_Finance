/**
 * POS Returns Report API
 *
 * GET — Returns summary with breakdown by reason, status, refund method
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  posReturns,
  posReturnItems,
  posReturnReasons,
  posSales,
} from "@/lib/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");

    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    const conditions: any[] = [eq(posReturns.workspaceid, workspaceId)];

    if (startDate) {
      conditions.push(gte(posReturns.returndate, new Date(startDate)));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(posReturns.returndate, end));
    }
    if (status) {
      conditions.push(eq(posReturns.status, status as any));
    }

    const returns = await db
      .select({
        returnRecord: posReturns,
        reason: posReturnReasons,
      })
      .from(posReturns)
      .leftJoin(posReturnReasons, eq(posReturns.returnreasonid, posReturnReasons.reasonid))
      .where(and(...conditions))
      .orderBy(desc(posReturns.returndate));

    // Summary
    const totalReturns = returns.length;
    const totalRefundAmount = returns.reduce(
      (sum, r) => sum + parseFloat(r.returnRecord.refundamount || "0"), 0
    );
    const totalRestockingFees = returns.reduce(
      (sum, r) => sum + parseFloat(r.returnRecord.restockingfee || "0"), 0
    );

    // Breakdown by status
    const byStatus: Record<string, { count: number; amount: number }> = {};
    returns.forEach((r) => {
      const s = r.returnRecord.status || "UNKNOWN";
      if (!byStatus[s]) byStatus[s] = { count: 0, amount: 0 };
      byStatus[s].count++;
      byStatus[s].amount += parseFloat(r.returnRecord.refundamount || "0");
    });

    // Breakdown by reason
    const byReason: Record<string, { count: number; amount: number }> = {};
    returns.forEach((r) => {
      const reason = r.reason?.reasonname || "Other";
      if (!byReason[reason]) byReason[reason] = { count: 0, amount: 0 };
      byReason[reason].count++;
      byReason[reason].amount += parseFloat(r.returnRecord.refundamount || "0");
    });

    // Breakdown by refund method
    const byMethod: Record<string, { count: number; amount: number }> = {};
    returns.forEach((r) => {
      const method = r.returnRecord.refundmethod || "UNKNOWN";
      if (!byMethod[method]) byMethod[method] = { count: 0, amount: 0 };
      byMethod[method].count++;
      byMethod[method].amount += parseFloat(r.returnRecord.refundamount || "0");
    });

    // Daily trend
    const byDate: Record<string, { count: number; amount: number }> = {};
    returns.forEach((r) => {
      const d = new Date(r.returnRecord.returndate!).toISOString().split("T")[0];
      if (!byDate[d]) byDate[d] = { count: 0, amount: 0 };
      byDate[d].count++;
      byDate[d].amount += parseFloat(r.returnRecord.refundamount || "0");
    });

    const returnList = returns.map((r) => ({
      returnNumber: r.returnRecord.returnnumber,
      originalSaleNumber: r.returnRecord.originalsalenumber,
      returnDate: r.returnRecord.returndate,
      returnType: r.returnRecord.returntype,
      reason: r.reason?.reasonname || "—",
      totalReturnAmount: parseFloat(r.returnRecord.totalreturnamount || "0"),
      restockingFee: parseFloat(r.returnRecord.restockingfee || "0"),
      refundAmount: parseFloat(r.returnRecord.refundamount || "0"),
      refundMethod: r.returnRecord.refundmethod,
      status: r.returnRecord.status,
      customer: r.returnRecord.customername || "Walk-in",
    }));

    return NextResponse.json({
      summary: {
        totalReturns,
        totalRefundAmount,
        totalRestockingFees,
        netRefunds: totalRefundAmount - totalRestockingFees,
      },
      byStatus,
      byReason,
      byMethod,
      dailyTrend: Object.entries(byDate).map(([date, data]) => ({
        date,
        ...data,
      })),
      returns: returnList,
    });
  } catch (error) {
    console.error("[Returns Report] Error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
