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
import { stockLevels, stockMovements } from "@/lib/db/tables/pharmacy-stock";
import { eq, sql } from "drizzle-orm";
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

    if (order.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Order already cancelled" },
        { status: 400 }
      );
    }

    // Get all order items to process stock changes
    const items = await db
      .select()
      .from(pharmacyOrderItems)
      .where(eq(pharmacyOrderItems.orderid, orderid));

    let restockedCount = 0;
    let releasedCount = 0;
    const restockedItems: string[] = [];

    // Process each item based on its status
    for (const item of items) {
      if (!item.drugid) continue;

      try {
        const [stockLevel] = await db
          .select()
          .from(stockLevels)
          .where(eq(stockLevels.drugid, item.drugid))
          .limit(1);

        if (!stockLevel) {
          console.warn(`No stock level found for ${item.drugname}`);
          continue;
        }

        if (item.status === "DISPENSED") {
          // RESTOCK: Return dispensed items back to inventory
          await db
            .update(stockLevels)
            .set({
              quantity: sql`${stockLevels.quantity} + ${item.quantity}`,
              updatedat: new Date(),
            })
            .where(eq(stockLevels.stocklevelid, stockLevel.stocklevelid));

          // Create RETURN stock movement for audit trail
          await db.insert(stockMovements).values({
            drugid: item.drugid,
            batchid: item.batchid,
            locationid: item.dispenselocationid || stockLevel.locationid,
            type: "RETURN",
            quantity: item.quantity,
            reason: `Returned from cancelled order ${orderid}`,
            referenceid: orderid,
            performedby: user.userid,
          });

          restockedCount++;
          restockedItems.push(`${item.drugname} (${item.quantity} units)`);
          console.log(`Restocked ${item.quantity} units of ${item.drugname} from cancelled order ${orderid}`);
        } else if (item.status === "PENDING") {
          // RELEASE RESERVATION: Free up reserved stock for pending items
          if (stockLevel.reservedquantity >= item.quantity) {
            await db
              .update(stockLevels)
              .set({
                reservedquantity: sql`${stockLevels.reservedquantity} - ${item.quantity}`,
                updatedat: new Date(),
              })
              .where(eq(stockLevels.stocklevelid, stockLevel.stocklevelid));
            
            releasedCount++;
            console.log(`Released ${item.quantity} reserved units of ${item.drugname} from cancelled order ${orderid}`);
          }
        }
      } catch (stockError) {
        console.error(`Error processing stock for ${item.drugname}:`, stockError);
        // Continue with cancellation even if stock processing fails
      }
    }

    // Mark order as cancelled
    await db
      .update(pharmacyOrders)
      .set({ 
        status: "CANCELLED", 
        updatedat: new Date()
      })
      .where(eq(pharmacyOrders.orderid, orderid));

    // Mark all items as cancelled
    await db
      .update(pharmacyOrderItems)
      .set({ status: "CANCELLED" })
      .where(eq(pharmacyOrderItems.orderid, orderid));

    // Build response message
    const messageParts = ["Order cancelled successfully"];
    if (restockedCount > 0) {
      messageParts.push(`${restockedCount} item${restockedCount > 1 ? 's' : ''} restocked`);
    }
    if (releasedCount > 0) {
      messageParts.push(`${releasedCount} reservation${releasedCount > 1 ? 's' : ''} released`);
    }

    return NextResponse.json({
      message: messageParts.join(" - "),
      order: { ...order, status: "CANCELLED" },
      restockedCount,
      releasedCount,
      restockedItems: restockedCount > 0 ? restockedItems : undefined,
    });
  } catch (error) {
    console.error("[Pharmacy Order Cancel POST]", error);
    return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 });
  }
}
