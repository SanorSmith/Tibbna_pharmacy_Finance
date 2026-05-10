/**
 * POS Cashier Performance Report API
 *
 * GET — Sales per cashier, shift count, variance tracking
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posSales, posShifts, users } from "@/lib/db/schema";
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

    const conditions: any[] = [
      eq(posSales.workspaceid, workspaceId),
      eq(posSales.status, "COMPLETED"),
    ];

    if (startDate) {
      conditions.push(gte(posSales.saledate, new Date(startDate)));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(posSales.saledate, end));
    }

    // Sales by cashier
    const cashierSales = await db
      .select({
        cashierId: posSales.cashierid,
        cashierName: users.name,
        cashierEmail: users.email,
        totalTransactions: sql<number>`COUNT(${posSales.saleid})::int`,
        totalRevenue: sql<string>`COALESCE(SUM(${posSales.totalamount}::numeric), 0)`,
        avgTransaction: sql<string>`COALESCE(AVG(${posSales.totalamount}::numeric), 0)`,
      })
      .from(posSales)
      .innerJoin(users, eq(posSales.cashierid, users.userid))
      .where(and(...conditions))
      .groupBy(posSales.cashierid, users.name, users.email)
      .orderBy(sql`SUM(${posSales.totalamount}::numeric) DESC`);

    // Shift stats per cashier
    const shiftConditions: any[] = [eq(posShifts.workspaceid, workspaceId)];
    if (startDate) shiftConditions.push(gte(posShifts.openingtime, new Date(startDate)));
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      shiftConditions.push(lte(posShifts.openingtime, end));
    }

    const shiftStats = await db
      .select({
        cashierId: posShifts.cashierid,
        totalShifts: sql<number>`COUNT(${posShifts.shiftid})::int`,
        totalVariance: sql<string>`COALESCE(SUM(${posShifts.variance}::numeric), 0)`,
        avgVariance: sql<string>`COALESCE(AVG(${posShifts.variance}::numeric), 0)`,
      })
      .from(posShifts)
      .where(and(...shiftConditions))
      .groupBy(posShifts.cashierid);

    const performance = cashierSales.map((cashier) => {
      const shifts = shiftStats.find((s) => s.cashierId === cashier.cashierId);
      return {
        cashierId: cashier.cashierId,
        cashierName: cashier.cashierName || cashier.cashierEmail || "Unknown",
        totalTransactions: cashier.totalTransactions,
        totalRevenue: parseFloat(cashier.totalRevenue),
        avgTransaction: parseFloat(cashier.avgTransaction),
        totalShifts: shifts?.totalShifts || 0,
        totalVariance: parseFloat(shifts?.totalVariance || "0"),
        avgVariance: parseFloat(shifts?.avgVariance || "0"),
      };
    });

    const totalRevenue = performance.reduce((sum, c) => sum + c.totalRevenue, 0);
    const totalTransactions = performance.reduce((sum, c) => sum + c.totalTransactions, 0);

    return NextResponse.json({
      summary: {
        totalCashiers: performance.length,
        totalTransactions,
        totalRevenue,
        averagePerCashier: performance.length > 0 ? totalRevenue / performance.length : 0,
      },
      cashiers: performance,
    });
  } catch (error) {
    console.error("[Cashier Performance Report] Error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
