/**
 * POS Daily Sales Report API
 *
 * GET — sales summary, payment breakdown, top drugs for a given date
 * Query params: date (YYYY-MM-DD), workspaceId
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posSales, posSaleItems, posPayments } from "@/lib/db/schema";
import { eq, and, sql, between } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date =
      searchParams.get("date") || new Date().toISOString().split("T")[0];
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    // Sales summary
    const [salesSummary] = await db
      .select({
        totalSales: sql<string>`COALESCE(SUM(${posSales.totalamount}::numeric), 0)`,
        totalSubtotal: sql<string>`COALESCE(SUM(${posSales.subtotal}::numeric), 0)`,
        totalTax: sql<string>`COALESCE(SUM(${posSales.taxamount}::numeric), 0)`,
        totalDiscount: sql<string>`COALESCE(SUM(${posSales.discountamount}::numeric), 0)`,
        transactionCount: sql<number>`COUNT(${posSales.saleid})::int`,
      })
      .from(posSales)
      .where(
        and(
          eq(posSales.workspaceid, workspaceId),
          eq(posSales.status, "COMPLETED"),
          between(posSales.saledate, startOfDay, endOfDay)
        )
      );

    // Sales by type
    const salesByType = await db
      .select({
        saleType: posSales.saletype,
        total: sql<string>`COALESCE(SUM(${posSales.totalamount}::numeric), 0)`,
        count: sql<number>`COUNT(${posSales.saleid})::int`,
      })
      .from(posSales)
      .where(
        and(
          eq(posSales.workspaceid, workspaceId),
          eq(posSales.status, "COMPLETED"),
          between(posSales.saledate, startOfDay, endOfDay)
        )
      )
      .groupBy(posSales.saletype);

    // Payment method breakdown
    const paymentBreakdown = await db
      .select({
        paymentMethod: posPayments.paymentmethod,
        total: sql<string>`COALESCE(SUM(${posPayments.amount}::numeric), 0)`,
        count: sql<number>`COUNT(${posPayments.paymentid})::int`,
      })
      .from(posPayments)
      .innerJoin(posSales, eq(posPayments.saleid, posSales.saleid))
      .where(
        and(
          eq(posSales.workspaceid, workspaceId),
          eq(posSales.status, "COMPLETED"),
          between(posSales.saledate, startOfDay, endOfDay)
        )
      )
      .groupBy(posPayments.paymentmethod);

    // Top selling drugs
    const topDrugs = await db
      .select({
        drugName: posSaleItems.drugname,
        totalQuantity: sql<number>`SUM(${posSaleItems.quantity})::int`,
        totalRevenue: sql<string>`COALESCE(SUM(${posSaleItems.totalamount}::numeric), 0)`,
        transactionCount: sql<number>`COUNT(DISTINCT ${posSaleItems.saleid})::int`,
      })
      .from(posSaleItems)
      .innerJoin(posSales, eq(posSaleItems.saleid, posSales.saleid))
      .where(
        and(
          eq(posSales.workspaceid, workspaceId),
          eq(posSales.status, "COMPLETED"),
          between(posSales.saledate, startOfDay, endOfDay)
        )
      )
      .groupBy(posSaleItems.drugname)
      .orderBy(sql`SUM(${posSaleItems.totalamount}::numeric) DESC`)
      .limit(10);

    // Hourly distribution
    const hourlyDistribution = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${posSales.saledate})::int`,
        total: sql<string>`COALESCE(SUM(${posSales.totalamount}::numeric), 0)`,
        count: sql<number>`COUNT(${posSales.saleid})::int`,
      })
      .from(posSales)
      .where(
        and(
          eq(posSales.workspaceid, workspaceId),
          eq(posSales.status, "COMPLETED"),
          between(posSales.saledate, startOfDay, endOfDay)
        )
      )
      .groupBy(sql`EXTRACT(HOUR FROM ${posSales.saledate})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${posSales.saledate})`);

    return NextResponse.json({
      date,
      summary: {
        totalSales: parseFloat(salesSummary.totalSales),
        totalSubtotal: parseFloat(salesSummary.totalSubtotal),
        totalTax: parseFloat(salesSummary.totalTax),
        totalDiscount: parseFloat(salesSummary.totalDiscount),
        transactionCount: salesSummary.transactionCount,
      },
      salesByType: salesByType.map((s) => ({
        ...s,
        total: parseFloat(s.total),
      })),
      paymentBreakdown: paymentBreakdown.map((p) => ({
        ...p,
        total: parseFloat(p.total),
      })),
      topDrugs: topDrugs.map((d) => ({
        ...d,
        totalRevenue: parseFloat(d.totalRevenue),
      })),
      hourlyDistribution: hourlyDistribution.map((h) => ({
        ...h,
        total: parseFloat(h.total),
      })),
    });
  } catch (error) {
    console.error("[POS Daily Report]", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
