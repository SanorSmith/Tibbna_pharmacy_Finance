/**
 * POS Product Sales Report API
 *
 * GET — Top selling products by revenue/quantity, with date range
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posSales, posSaleItems } from "@/lib/db/schema";
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
    const limit = parseInt(searchParams.get("limit") || "20");

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

    const productSales = await db
      .select({
        drugName: posSaleItems.drugname,
        drugId: posSaleItems.drugid,
        totalQuantity: sql<number>`SUM(${posSaleItems.quantity})::int`,
        totalRevenue: sql<string>`COALESCE(SUM(${posSaleItems.totalamount}::numeric), 0)`,
        transactionCount: sql<number>`COUNT(DISTINCT ${posSaleItems.saleid})::int`,
        avgUnitPrice: sql<string>`COALESCE(AVG(${posSaleItems.unitprice}::numeric), 0)`,
      })
      .from(posSaleItems)
      .innerJoin(posSales, eq(posSaleItems.saleid, posSales.saleid))
      .where(and(...conditions))
      .groupBy(posSaleItems.drugname, posSaleItems.drugid)
      .orderBy(sql`SUM(${posSaleItems.totalamount}::numeric) DESC`)
      .limit(limit);

    const totalRevenue = productSales.reduce(
      (sum, p) => sum + parseFloat(p.totalRevenue), 0
    );
    const totalQuantity = productSales.reduce(
      (sum, p) => sum + p.totalQuantity, 0
    );

    return NextResponse.json({
      summary: {
        totalProducts: productSales.length,
        totalRevenue,
        totalQuantitySold: totalQuantity,
      },
      products: productSales.map((p) => ({
        drugName: p.drugName,
        drugId: p.drugId,
        quantitySold: p.totalQuantity,
        revenue: parseFloat(p.totalRevenue),
        transactionCount: p.transactionCount,
        avgUnitPrice: parseFloat(p.avgUnitPrice),
        revenueShare: totalRevenue > 0
          ? (parseFloat(p.totalRevenue) / totalRevenue) * 100
          : 0,
      })),
    });
  } catch (error) {
    console.error("[Product Sales Report] Error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
