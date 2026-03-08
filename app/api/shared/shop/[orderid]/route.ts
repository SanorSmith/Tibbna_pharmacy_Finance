/**
 * Individual Shop Order API Route
 * 
 * Provides CRUD operations for individual shop orders
 * Supports order reading, updating, deletion, and status changes
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { shopOrders, shopOrderItems } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { z } from "zod";

// Validation schema for shop order updates
const shopOrderUpdateSchema = z.object({
  deliveryaddress: z.string().optional(),
  deliverytime: z.string().datetime().optional().or(z.literal("")),
  clientname: z.string().optional(),
  clientemail: z.string().email().optional().or(z.literal("")),
  clientphone: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  totalcost: z.number().positive().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

// GET /api/d/[workspaceid]/shop-orders/[orderid] - Get specific order
export async function GET(
  request: NextRequest,
  { params }: { 
    params: Promise<{ workspaceid: string; orderid: string }> 
  }
) {
  try {
    const { workspaceid, orderid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await db
      .select()
      .from(shopOrders)
      .where(
        and(
          eq(shopOrders.workspaceid, workspaceid),
          eq(shopOrders.orderid, orderid)
        )
      )
      .limit(1);

    if (order.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Fetch order items
    const items = await db
      .select()
      .from(shopOrderItems)
      .where(eq(shopOrderItems.orderid, orderid))
      .orderBy(shopOrderItems.sortorder);

    return NextResponse.json({ order: { ...order[0], items } });
  } catch (error) {
    console.error("Error fetching shop order:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop order" },
      { status: 500 }
    );
  }
}

// PUT /api/d/[workspaceid]/shop-orders/[orderid] - Update order
export async function PUT(
  request: NextRequest,
  { params }: { 
    params: Promise<{ workspaceid: string; orderid: string }> 
  }
) {
  try {
    const { workspaceid, orderid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = shopOrderUpdateSchema.parse(body);

    // Check if order exists
    const existingOrder = await db
      .select()
      .from(shopOrders)
      .where(
        and(
          eq(shopOrders.workspaceid, workspaceid),
          eq(shopOrders.orderid, orderid)
        )
      )
      .limit(1);

    if (existingOrder.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order
    const updateData: any = {
      ...validatedData,
      updatedby: user.userid,
      updatedat: new Date().toISOString(),
    };
    
    // Convert datetime strings to Date objects
    if (updateData.deliverytime) {
      updateData.deliverytime = new Date(updateData.deliverytime);
    }
    
    const updatedOrder = await db
      .update(shopOrders)
      .set(updateData)
      .where(
        and(
          eq(shopOrders.workspaceid, workspaceid),
          eq(shopOrders.orderid, orderid)
        )
      )
      .returning();

    // Fetch updated items
    const items = await db
      .select()
      .from(shopOrderItems)
      .where(eq(shopOrderItems.orderid, orderid))
      .orderBy(shopOrderItems.sortorder);

    return NextResponse.json({ order: { ...updatedOrder[0], items } });
  } catch (error) {
    console.error("Error updating shop order:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update shop order" },
      { status: 500 }
    );
  }
}

// DELETE /api/d/[workspaceid]/shop-orders/[orderid] - Delete order
export async function DELETE(
  request: NextRequest,
  { params }: { 
    params: Promise<{ workspaceid: string; orderid: string }> 
  }
) {
  try {
    const { workspaceid, orderid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if order exists
    const existingOrder = await db
      .select()
      .from(shopOrders)
      .where(
        and(
          eq(shopOrders.workspaceid, workspaceid),
          eq(shopOrders.orderid, orderid)
        )
      )
      .limit(1);

    if (existingOrder.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Delete order (items will be cascade deleted)
    await db
      .delete(shopOrders)
      .where(
        and(
          eq(shopOrders.workspaceid, workspaceid),
          eq(shopOrders.orderid, orderid)
        )
      );

    return NextResponse.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting shop order:", error);
    return NextResponse.json(
      { error: "Failed to delete shop order" },
      { status: 500 }
    );
  }
}
