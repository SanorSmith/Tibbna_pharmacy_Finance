/**
 * POS Shift Summary Report API
 *
 * GET — Shift list with reconciliation, variance, sales totals
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posShifts, posSales, users } from "@/lib/db/schema";
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
    const shiftId = searchParams.get("shiftId");

    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    // If specific shift requested
    if (shiftId) {
      const [shift] = await db
        .select({
          shift: posShifts,
          cashier: users,
        })
        .from(posShifts)
        .leftJoin(users, eq(posShifts.cashierid, users.userid))
        .where(eq(posShifts.shiftid, shiftId))
        .limit(1);

      if (!shift) {
        return NextResponse.json({ error: "Shift not found" }, { status: 404 });
      }

      // Get sales for this shift
      const shiftSales = await db
        .select({
          totalTransactions: sql<number>`COUNT(${posSales.saleid})::int`,
          totalRevenue: sql<string>`COALESCE(SUM(${posSales.totalamount}::numeric), 0)`,
          avgTransaction: sql<string>`COALESCE(AVG(${posSales.totalamount}::numeric), 0)`,
        })
        .from(posSales)
        .where(
          and(
            eq(posSales.shiftid, shiftId),
            eq(posSales.status, "COMPLETED")
          )
        );

      const duration = shift.shift.closingtime
        ? Math.round(
            (new Date(shift.shift.closingtime).getTime() -
              new Date(shift.shift.openingtime!).getTime()) /
              (1000 * 60)
          )
        : null;

      return NextResponse.json({
        shift: {
          shiftId: shift.shift.shiftid,
          shiftNumber: shift.shift.shiftnumber,
          cashier: shift.cashier?.name || shift.cashier?.email || "Unknown",
          status: shift.shift.status,
          openingTime: shift.shift.openingtime,
          closingTime: shift.shift.closingtime,
          duration,
          openingCash: parseFloat(shift.shift.openingcash || "0"),
          expectedCash: parseFloat(shift.shift.expectedcash || "0"),
          actualCash: parseFloat(shift.shift.actualcash || "0"),
          variance: parseFloat(shift.shift.variance || "0"),
          totalTransactions: shiftSales[0]?.totalTransactions || 0,
          totalRevenue: parseFloat(shiftSales[0]?.totalRevenue || "0"),
          avgTransaction: parseFloat(shiftSales[0]?.avgTransaction || "0"),
        },
      });
    }

    // List all shifts
    const conditions: any[] = [eq(posShifts.workspaceid, workspaceId)];
    if (startDate) conditions.push(gte(posShifts.openingtime, new Date(startDate)));
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(posShifts.openingtime, end));
    }

    const shifts = await db
      .select({
        shift: posShifts,
        cashier: users,
      })
      .from(posShifts)
      .leftJoin(users, eq(posShifts.cashierid, users.userid))
      .where(and(...conditions))
      .orderBy(desc(posShifts.openingtime))
      .limit(50);

    // Get sales count per shift
    const shiftIds = shifts.map((s) => s.shift.shiftid);
    let salesPerShift: Record<string, { count: number; revenue: number }> = {};

    if (shiftIds.length > 0) {
      const salesData = await db
        .select({
          shiftId: posSales.shiftid,
          count: sql<number>`COUNT(${posSales.saleid})::int`,
          revenue: sql<string>`COALESCE(SUM(${posSales.totalamount}::numeric), 0)`,
        })
        .from(posSales)
        .where(and(eq(posSales.status, "COMPLETED")))
        .groupBy(posSales.shiftid);

      salesData.forEach((s) => {
        if (s.shiftId) {
          salesPerShift[s.shiftId] = {
            count: s.count,
            revenue: parseFloat(s.revenue),
          };
        }
      });
    }

    const totalVariance = shifts.reduce(
      (sum, s) => sum + parseFloat(s.shift.variance || "0"), 0
    );

    return NextResponse.json({
      summary: {
        totalShifts: shifts.length,
        totalVariance,
        avgVariance: shifts.length > 0 ? totalVariance / shifts.length : 0,
        closedShifts: shifts.filter((s) => s.shift.status === "CLOSED").length,
        openShifts: shifts.filter((s) => s.shift.status === "OPEN").length,
      },
      shifts: shifts.map((s) => ({
        shiftId: s.shift.shiftid,
        shiftNumber: s.shift.shiftnumber,
        cashier: s.cashier?.name || s.cashier?.email || "Unknown",
        status: s.shift.status,
        openingTime: s.shift.openingtime,
        closingTime: s.shift.closingtime,
        openingCash: parseFloat(s.shift.openingcash || "0"),
        expectedCash: parseFloat(s.shift.expectedcash || "0"),
        actualCash: parseFloat(s.shift.actualcash || "0"),
        variance: parseFloat(s.shift.variance || "0"),
        transactions: salesPerShift[s.shift.shiftid]?.count || 0,
        revenue: salesPerShift[s.shift.shiftid]?.revenue || 0,
      })),
    });
  } catch (error) {
    console.error("[Shift Summary Report] Error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
