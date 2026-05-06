import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pharmacyOrders } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceid: string } }
) {
  try {
    const { workspaceid } = params;

    // Get counts for each status
    const result = await db
      .select({
        status: pharmacyOrders.status,
        count: sql<number>`count(*)::int`,
      })
      .from(pharmacyOrders)
      .where(eq(pharmacyOrders.workspaceid, workspaceid))
      .groupBy(pharmacyOrders.status);

    // Calculate totals
    const counts = {
      all: 0,
      PENDING: 0,
      IN_PROGRESS: 0,
      DISPENSED: 0,
      CANCELLED: 0,
      PARTIALLY_DISPENSED: 0,
      ON_HOLD: 0,
    };

    result.forEach((row) => {
      counts.all += row.count;
      if (row.status in counts) {
        counts[row.status as keyof typeof counts] = row.count;
      }
    });

    return NextResponse.json({ counts });
  } catch (error) {
    console.error("Error fetching order counts:", error);
    return NextResponse.json(
      { error: "Failed to fetch order counts" },
      { status: 500 }
    );
  }
}
