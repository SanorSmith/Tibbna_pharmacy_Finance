/**
 * Pharmacy Order Cancel API
 *
 * POST /api/d/[workspaceid]/pharmacy-orders/[orderid]/cancel
 *
 * Cancels an order and marks all items as CANCELLED
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pharmacyOrders, pharmacyOrderItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/user";

type RouteParams = { params: Promise<{ workspaceid: string; orderid: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, orderid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch order
    const [order] = await db
      .select()
      .from(pharmacyOrders)
      .where(eq(pharmacyOrders.orderid, orderid))
      .limit(1);

    if (!order || order.workspaceid !== workspaceid) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "DISPENSED" || order.status === "CANCELLED") {
      return NextResponse.json(
        { error: `Order already ${order.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Mark order as cancelled
    await db
      .update(pharmacyOrders)
      .set({ 
        status: "CANCELLED", 
        updatedat: new Date(),
        cancelledby: user.userid,
        cancelledat: new Date()
      })
      .where(eq(pharmacyOrders.orderid, orderid));

    // Mark all items as cancelled
    await db
      .update(pharmacyOrderItems)
      .set({ status: "CANCELLED", updatedat: new Date() })
      .where(eq(pharmacyOrderItems.orderid, orderid));

    return NextResponse.json({
      message: "Order cancelled successfully",
      order: { ...order, status: "CANCELLED" },
    });
  } catch (error) {
    console.error("[Pharmacy Order Cancel POST]", error);
    return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 });
  }
}
