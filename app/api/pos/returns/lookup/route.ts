/**
 * POS Returns Lookup API
 *
 * GET — Search for original sale to process a return.
 *       Supports search by sale number or customer phone.
 *       Only returns completed sales within 30-day window.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  posSales,
  posSaleItems,
  posReturns,
} from "@/lib/db/schema";
import { eq, and, like, gte, desc, or, inArray } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const saleNumber = searchParams.get("saleNumber");
    const phone = searchParams.get("phone");
    const workspaceId = searchParams.get("workspaceId");
    const saleId = searchParams.get("saleId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Missing workspaceId" },
        { status: 400 }
      );
    }

    // Build conditions
    const conditions: any[] = [
      eq(posSales.workspaceid, workspaceId),
      inArray(posSales.status, ["COMPLETED", "REFUNDED"]),
    ];

    // Only allow returns within 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    conditions.push(gte(posSales.saledate, thirtyDaysAgo));

    // Specific sale lookup
    if (saleId) {
      conditions.push(eq(posSales.saleid, saleId));
    } else if (saleNumber) {
      conditions.push(like(posSales.salenumber, `%${saleNumber}%`));
    } else if (phone) {
      conditions.push(like(posSales.customerphone, `%${phone}%`));
    } else {
      return NextResponse.json(
        { error: "Please provide saleNumber, phone, or saleId" },
        { status: 400 }
      );
    }

    // Search for matching sales
    const sales = await db
      .select()
      .from(posSales)
      .where(and(...conditions))
      .orderBy(desc(posSales.saledate))
      .limit(10);

    // Enrich each sale with items and return history
    const salesWithDetails = await Promise.all(
      sales.map(async (sale) => {
        // Get sale items
        const items = await db
          .select()
          .from(posSaleItems)
          .where(eq(posSaleItems.saleid, sale.saleid));

        // Check existing returns for this sale
        const existingReturns = await db
          .select()
          .from(posReturns)
          .where(
            and(
              eq(posReturns.originalsaleid, sale.saleid),
              eq(posReturns.status, "COMPLETED")
            )
          );

        const totalReturned = existingReturns.reduce(
          (sum, ret) => sum + parseFloat(ret.refundamount || "0"),
          0
        );

        const saleTotal = parseFloat(sale.totalamount || "0");

        return {
          ...sale,
          items,
          hasReturns: existingReturns.length > 0,
          totalReturned,
          canReturn: totalReturned < saleTotal,
          remainingAmount: saleTotal - totalReturned,
        };
      })
    );

    return NextResponse.json({ sales: salesWithDetails });
  } catch (error) {
    console.error("[Returns Lookup] Error:", error);
    return NextResponse.json(
      { error: "Failed to lookup sale" },
      { status: 500 }
    );
  }
}
