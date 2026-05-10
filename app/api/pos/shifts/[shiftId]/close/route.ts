/**
 * POS Shift Close API
 *
 * POST — close shift with cash count, calculate summary & variance
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posShifts, posSales, posPayments } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { z } from "zod";

type RouteParams = { params: Promise<{ shiftId: string }> };

const closeShiftSchema = z.object({
  actualCash: z.number().nonnegative(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { shiftId } = await params;
    const body = await request.json();
    const data = closeShiftSchema.parse(body);

    // Get shift
    const [shift] = await db
      .select()
      .from(posShifts)
      .where(eq(posShifts.shiftid, shiftId))
      .limit(1);

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    if (shift.status === "CLOSED") {
      return NextResponse.json(
        { error: "Shift already closed" },
        { status: 400 }
      );
    }

    // Calculate sales summary for this shift
    const [salesSummary] = await db
      .select({
        totalSales: sql<string>`COALESCE(SUM(${posSales.totalamount}::numeric), 0)`,
        transactionCount: sql<number>`COUNT(${posSales.saleid})::int`,
      })
      .from(posSales)
      .where(eq(posSales.shiftid, shiftId));

    // Calculate payment method totals
    const paymentSummary = await db
      .select({
        paymentMethod: posPayments.paymentmethod,
        total: sql<string>`COALESCE(SUM(${posPayments.amount}::numeric), 0)`,
      })
      .from(posPayments)
      .innerJoin(posSales, eq(posPayments.saleid, posSales.saleid))
      .where(eq(posSales.shiftid, shiftId))
      .groupBy(posPayments.paymentmethod);

    const cashSales =
      parseFloat(
        paymentSummary.find((p) => p.paymentMethod === "CASH")?.total || "0"
      );
    const cardSales =
      parseFloat(
        paymentSummary.find((p) => p.paymentMethod === "CARD")?.total || "0"
      );
    const insuranceSales =
      parseFloat(
        paymentSummary.find((p) => p.paymentMethod === "INSURANCE")?.total || "0"
      );
    const creditSales =
      parseFloat(
        paymentSummary.find((p) => p.paymentMethod === "CREDIT_ACCOUNT")?.total || "0"
      );

    const expectedCash = parseFloat(shift.openingcash) + cashSales;
    const variance = data.actualCash - expectedCash;

    // Update shift
    const [updatedShift] = await db
      .update(posShifts)
      .set({
        closingtime: new Date(),
        actualcash: data.actualCash.toFixed(2),
        expectedcash: expectedCash.toFixed(2),
        variance: variance.toFixed(2),
        variancereason: data.notes || null,
        totalsales: salesSummary.totalSales,
        totalcashsales: cashSales.toFixed(2),
        totalcardsales: cardSales.toFixed(2),
        totalinsurancesales: insuranceSales.toFixed(2),
        totalcreditsales: creditSales.toFixed(2),
        transactioncount: salesSummary.transactionCount,
        status: "CLOSED",
        closedat: new Date(),
        notes: data.notes || shift.notes,
      })
      .where(eq(posShifts.shiftid, shiftId))
      .returning();

    console.log(
      `[POS] Shift ${shift.shiftnumber} closed. Variance: ${variance.toFixed(2)}`
    );

    return NextResponse.json({
      shift: updatedShift,
      summary: {
        totalSales: parseFloat(salesSummary.totalSales),
        transactionCount: salesSummary.transactionCount,
        openingCash: parseFloat(shift.openingcash),
        expectedCash,
        actualCash: data.actualCash,
        variance,
        cashSales,
        cardSales,
        insuranceSales,
        creditSales,
      },
    });
  } catch (error) {
    console.error("[POS Close Shift]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to close shift" },
      { status: 500 }
    );
  }
}
