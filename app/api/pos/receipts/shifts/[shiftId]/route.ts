/**
 * POS Shift Receipt API
 *
 * GET — Get shift report data for reprint
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  posShifts,
  posSales,
  posPayments,
  users,
  workspaces,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { shiftId } = await params;

    // Get shift with cashier
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

    // Get workspace
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.workspaceid, shift.shift.workspaceid))
      .limit(1);

    // Get sales summary by payment method for this shift
    const paymentSummary = await db
      .select({
        paymentMethod: posPayments.paymentmethod,
        totalAmount: sql<string>`COALESCE(SUM(${posPayments.amount}::numeric), 0)`,
        count: sql<number>`COUNT(${posPayments.paymentid})::int`,
      })
      .from(posPayments)
      .innerJoin(posSales, eq(posPayments.saleid, posSales.saleid))
      .where(
        and(
          eq(posSales.shiftid, shiftId),
          eq(posSales.status, "COMPLETED")
        )
      )
      .groupBy(posPayments.paymentmethod);

    // Get transaction count
    const [transactionCount] = await db
      .select({
        count: sql<number>`COUNT(${posSales.saleid})::int`,
        totalRevenue: sql<string>`COALESCE(SUM(${posSales.totalamount}::numeric), 0)`,
      })
      .from(posSales)
      .where(
        and(
          eq(posSales.shiftid, shiftId),
          eq(posSales.status, "COMPLETED")
        )
      )
      .limit(1);

    return NextResponse.json({
      workspace: workspace || null,
      shift: shift.shift,
      cashier: shift.cashier || null,
      paymentSummary: paymentSummary.map((p) => ({
        ...p,
        totalAmount: parseFloat(p.totalAmount),
      })),
      transactionCount: transactionCount?.count || 0,
      totalRevenue: parseFloat(transactionCount?.totalRevenue || "0"),
    });
  } catch (error) {
    console.error("[Shift Receipt] Error:", error);
    return NextResponse.json({ error: "Failed to get shift receipt" }, { status: 500 });
  }
}
