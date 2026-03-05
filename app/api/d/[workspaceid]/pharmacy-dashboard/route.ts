/**
 * Pharmacy Dashboard Stats API
 * Returns aggregated stats for the pharmacy dashboard
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import {
  pharmacyOrders,
  drugs,
  stockLevels,
  invoices,
} from "@/lib/db/schema";
import { eq, and, sql, lt, gte, count } from "drizzle-orm";

const LOW_STOCK_THRESHOLD = 10;
const OVERDUE_HOURS = 24;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const user = await getUser();
    if (!user?.userid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid } = await params;

    // 1. Low stock medicines
    const lowStockItems = await db
      .select({
        drugid: stockLevels.drugid,
        drugname: drugs.name,
        strength: drugs.strength,
        form: drugs.form,
        totalQuantity: sql<number>`COALESCE(SUM(${stockLevels.quantity}), 0)::int`,
      })
      .from(stockLevels)
      .innerJoin(drugs, eq(stockLevels.drugid, drugs.drugid))
      .groupBy(stockLevels.drugid, drugs.name, drugs.strength, drugs.form)
      .having(sql`SUM(${stockLevels.quantity}) < ${LOW_STOCK_THRESHOLD}`);

    // 2. Total orders by status
    const orderStats = await db
      .select({
        status: pharmacyOrders.status,
        count: count(),
      })
      .from(pharmacyOrders)
      .where(eq(pharmacyOrders.workspaceid, workspaceid))
      .groupBy(pharmacyOrders.status);

    const totalOrders = orderStats.reduce((sum, s) => sum + Number(s.count), 0);
    const pendingOrders = Number(orderStats.find((s) => s.status === "PENDING")?.count || 0);
    const inProgressOrders = Number(orderStats.find((s) => s.status === "IN_PROGRESS")?.count || 0);
    const dispensedOrders = Number(orderStats.find((s) => s.status === "DISPENSED")?.count || 0);

    // 3. Today's orders & unique patients (customer visits)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayStats] = await db
      .select({
        orderCount: count(),
        uniquePatients: sql<number>`COUNT(DISTINCT ${pharmacyOrders.patientid})::int`,
      })
      .from(pharmacyOrders)
      .where(
        and(
          eq(pharmacyOrders.workspaceid, workspaceid),
          gte(pharmacyOrders.createdat, todayStart)
        )
      );

    // 4. Sales stats (from invoices)
    const [salesStats] = await db
      .select({
        totalSales: sql<string>`COALESCE(SUM(${invoices.total}::numeric), 0)`,
        totalInvoices: count(),
        paidInvoices: sql<number>`COUNT(*) FILTER (WHERE ${invoices.status} = 'PAID')::int`,
      })
      .from(invoices)
      .innerJoin(pharmacyOrders, eq(invoices.orderid, pharmacyOrders.orderid))
      .where(eq(pharmacyOrders.workspaceid, workspaceid));

    // Today's sales
    const [todaySales] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${invoices.total}::numeric), 0)`,
      })
      .from(invoices)
      .innerJoin(pharmacyOrders, eq(invoices.orderid, pharmacyOrders.orderid))
      .where(
        and(
          eq(pharmacyOrders.workspaceid, workspaceid),
          gte(invoices.createdat, todayStart)
        )
      );

    // 5. Overdue orders (PENDING for more than OVERDUE_HOURS)
    const overdueThreshold = new Date();
    overdueThreshold.setHours(overdueThreshold.getHours() - OVERDUE_HOURS);

    const overdueOrders = await db
      .select({
        orderid: pharmacyOrders.orderid,
        patientid: pharmacyOrders.patientid,
        priority: pharmacyOrders.priority,
        createdat: pharmacyOrders.createdat,
        notes: pharmacyOrders.notes,
      })
      .from(pharmacyOrders)
      .where(
        and(
          eq(pharmacyOrders.workspaceid, workspaceid),
          eq(pharmacyOrders.status, "PENDING"),
          lt(pharmacyOrders.createdat, overdueThreshold)
        )
      )
      .limit(10);

    // 6. Doctor notifications (urgent/stat orders that are still pending)
    const doctorNotifications = await db
      .select({
        orderid: pharmacyOrders.orderid,
        priority: pharmacyOrders.priority,
        status: pharmacyOrders.status,
        notes: pharmacyOrders.notes,
        createdat: pharmacyOrders.createdat,
        source: pharmacyOrders.source,
      })
      .from(pharmacyOrders)
      .where(
        and(
          eq(pharmacyOrders.workspaceid, workspaceid),
          sql`${pharmacyOrders.status} IN ('PENDING', 'IN_PROGRESS')`,
          sql`${pharmacyOrders.priority} IN ('urgent', 'stat')`
        )
      )
      .limit(10);

    return NextResponse.json({
      lowStock: {
        count: lowStockItems.length,
        threshold: LOW_STOCK_THRESHOLD,
        items: lowStockItems,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        inProgress: inProgressOrders,
        dispensed: dispensedOrders,
        todayCount: Number(todayStats?.orderCount || 0),
      },
      customers: {
        todayVisits: Number(todayStats?.uniquePatients || 0),
      },
      sales: {
        totalRevenue: parseFloat(salesStats?.totalSales || "0"),
        todayRevenue: parseFloat(todaySales?.total || "0"),
        totalInvoices: Number(salesStats?.totalInvoices || 0),
        paidInvoices: Number(salesStats?.paidInvoices || 0),
      },
      overdue: {
        count: overdueOrders.length,
        orders: overdueOrders,
      },
      notifications: {
        count: doctorNotifications.length,
        items: doctorNotifications,
      },
    });
  } catch (error) {
    console.error("Error fetching pharmacy dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
