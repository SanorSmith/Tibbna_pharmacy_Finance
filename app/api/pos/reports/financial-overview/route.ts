/**
 * POS Financial Overview Report API
 *
 * GET — Gross revenue, refunds, net revenue, tax, discount, margins
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posSales, posReturns, posShifts } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
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

    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    // Sales conditions
    const salesConditions: any[] = [
      eq(posSales.workspaceid, workspaceId),
      eq(posSales.status, "COMPLETED"),
    ];
    if (startDate) salesConditions.push(gte(posSales.saledate, new Date(startDate)));
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      salesConditions.push(lte(posSales.saledate, end));
    }

    const [salesSummary] = await db
      .select({
        totalSales: sql<number>`COUNT(${posSales.saleid})::int`,
        grossRevenue: sql<string>`COALESCE(SUM(${posSales.totalamount}::numeric), 0)`,
        totalSubtotal: sql<string>`COALESCE(SUM(${posSales.subtotal}::numeric), 0)`,
        totalTax: sql<string>`COALESCE(SUM(${posSales.taxamount}::numeric), 0)`,
        totalDiscount: sql<string>`COALESCE(SUM(${posSales.discountamount}::numeric), 0)`,
      })
      .from(posSales)
      .where(and(...salesConditions));

    // Returns conditions
    const returnsConditions: any[] = [
      eq(posReturns.workspaceid, workspaceId),
      eq(posReturns.status, "COMPLETED"),
    ];
    if (startDate) returnsConditions.push(gte(posReturns.returndate, new Date(startDate)));
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      returnsConditions.push(lte(posReturns.returndate, end));
    }

    const [returnsSummary] = await db
      .select({
        totalReturns: sql<number>`COUNT(${posReturns.returnid})::int`,
        totalRefunds: sql<string>`COALESCE(SUM(${posReturns.refundamount}::numeric), 0)`,
        totalRestockingFees: sql<string>`COALESCE(SUM(${posReturns.restockingfee}::numeric), 0)`,
      })
      .from(posReturns)
      .where(and(...returnsConditions));

    // Shift stats
    const shiftConditions: any[] = [eq(posShifts.workspaceid, workspaceId)];
    if (startDate) shiftConditions.push(gte(posShifts.openingtime, new Date(startDate)));
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      shiftConditions.push(lte(posShifts.openingtime, end));
    }

    const [shiftSummary] = await db
      .select({
        totalShifts: sql<number>`COUNT(${posShifts.shiftid})::int`,
        totalVariance: sql<string>`COALESCE(SUM(${posShifts.variance}::numeric), 0)`,
        avgVariance: sql<string>`COALESCE(AVG(${posShifts.variance}::numeric), 0)`,
      })
      .from(posShifts)
      .where(and(...shiftConditions));

    // Daily revenue trend
    const dailyRevenue = await db
      .select({
        date: sql<string>`DATE(${posSales.saledate})::text`,
        revenue: sql<string>`COALESCE(SUM(${posSales.totalamount}::numeric), 0)`,
        transactions: sql<number>`COUNT(${posSales.saleid})::int`,
      })
      .from(posSales)
      .where(and(...salesConditions))
      .groupBy(sql`DATE(${posSales.saledate})`)
      .orderBy(sql`DATE(${posSales.saledate})`);

    const grossRevenue = parseFloat(salesSummary.grossRevenue);
    const totalRefunds = parseFloat(returnsSummary.totalRefunds);
    const totalRestockingFees = parseFloat(returnsSummary.totalRestockingFees);
    const totalTax = parseFloat(salesSummary.totalTax);
    const totalDiscount = parseFloat(salesSummary.totalDiscount);
    const netRevenue = grossRevenue - totalRefunds + totalRestockingFees;

    return NextResponse.json({
      period: { startDate, endDate },
      sales: {
        totalTransactions: salesSummary.totalSales,
        grossRevenue,
        totalTax,
        totalDiscount,
        netSalesRevenue: grossRevenue - totalTax - totalDiscount,
        avgTransactionValue: salesSummary.totalSales > 0
          ? grossRevenue / salesSummary.totalSales
          : 0,
      },
      returns: {
        totalReturns: returnsSummary.totalReturns,
        totalRefunds,
        totalRestockingFees,
        returnRate: salesSummary.totalSales > 0
          ? (returnsSummary.totalReturns / salesSummary.totalSales) * 100
          : 0,
      },
      financial: {
        netRevenue,
        profitMargin: grossRevenue > 0
          ? ((netRevenue - totalTax) / grossRevenue) * 100
          : 0,
      },
      shifts: {
        totalShifts: shiftSummary.totalShifts,
        totalVariance: parseFloat(shiftSummary.totalVariance),
        avgVariance: parseFloat(shiftSummary.avgVariance),
      },
      dailyTrend: dailyRevenue.map((d) => ({
        date: d.date,
        revenue: parseFloat(d.revenue),
        transactions: d.transactions,
      })),
    });
  } catch (error) {
    console.error("[Financial Overview Report] Error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
