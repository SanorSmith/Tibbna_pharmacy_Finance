/**
 * Shop Orders API Route
 * 
 * Provides CRUD operations for laboratory shop orders management
 * Supports order creation, reading, updating, and deletion
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, ilike, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { shopOrders, shopOrderItems } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { z } from "zod";

// Validation schema for shop order items
const shopOrderItemSchema = z.object({
  itemname: z.string().min(1, "Item name is required"),
  itemtype: z.string().optional(),
  size: z.string().optional(),
  number: z.number().int().positive().default(1),
  materialid: z.string().uuid().optional(),
  equipmentid: z.string().uuid().optional(),
  supplierid: z.string().uuid().optional(),
  unitprice: z.number().positive().optional(),
  totalprice: z.number().positive().optional(),
  notes: z.string().optional(),
  specifications: z.string().optional(),
  sortorder: z.number().int().default(0),
});

// Validation schema for shop orders
const shopOrderSchema = z.object({
  deliveryaddress: z.string().optional(),
  deliverytime: z.string().datetime().optional().or(z.literal("")),
  clientname: z.string().optional(),
  clientemail: z.string().email().optional().or(z.literal("")),
  clientphone: z.string().optional(),
  status: z.string().default("draft"),
  priority: z.string().default("normal"),
  orderdate: z.string().datetime().optional().or(z.literal("")),
  totalcost: z.number().positive().optional(),
  currency: z.string().default("USD"),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  items: z.array(shopOrderItemSchema).min(1, "At least one item is required"),
});

// Generate order number
function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}${month}${day}-${random}`;
}

// GET /api/d/[workspaceid]/shop-orders - Get all shop orders
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    const whereConditions: any[] = [eq(shopOrders.workspaceid, workspaceid)];

    // Apply filters
    if (search) {
      const searchCondition = or(
        ilike(shopOrders.ordernumber, `%${search}%`),
        ilike(shopOrders.clientname, `%${search}%`)
      );
      if (searchCondition) {
        whereConditions.push(searchCondition);
      }
    }

    if (status) {
      whereConditions.push(eq(shopOrders.status, status));
    }

    const query = db
      .select()
      .from(shopOrders)
      .where(and(...whereConditions));

    const orders = await query.orderBy(desc(shopOrders.createdat));

    // Fetch items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await db
          .select()
          .from(shopOrderItems)
          .where(eq(shopOrderItems.orderid, order.orderid))
          .orderBy(shopOrderItems.sortorder);
        
        return { ...order, items };
      })
    );

    return NextResponse.json({ orders: ordersWithItems });
  } catch (error) {
    console.error("Error fetching shop orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop orders" },
      { status: 500 }
    );
  }
}

// POST /api/d/[workspaceid]/shop-orders - Create new shop order
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = shopOrderSchema.parse(body);

    // Generate order number
    const ordernumber = generateOrderNumber();

    // Calculate total cost from items if not provided
    let totalCost = validatedData.totalcost;
    if (!totalCost && validatedData.items) {
      totalCost = validatedData.items.reduce((sum, item) => {
        return sum + (item.totalprice || (item.unitprice || 0) * item.number);
      }, 0);
    }

    const toDateOrUndefined = (value?: string) => {
      if (!value) return undefined;
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      return new Date(trimmed);
    };

    // Create the order
    const newOrder = await db.insert(shopOrders).values({
      ordernumber,
      deliveryaddress: validatedData.deliveryaddress,
      deliverytime: toDateOrUndefined(validatedData.deliverytime || undefined),
      clientname: validatedData.clientname,
      clientemail: validatedData.clientemail,
      clientphone: validatedData.clientphone,
      orderedby: user.userid,
      status: validatedData.status,
      priority: validatedData.priority,
      orderdate: toDateOrUndefined(validatedData.orderdate || undefined),
      totalcost: totalCost !== undefined && totalCost !== null ? totalCost.toString() : undefined,
      currency: validatedData.currency,
      notes: validatedData.notes,
      internalNotes: validatedData.internalNotes,
      createdby: user.userid,
      createdat: new Date().toISOString(),
      workspaceid,
    }).returning();

    // Create order items
    const orderItems = await Promise.all(
      validatedData.items.map((item, index) =>
        db.insert(shopOrderItems).values({
          orderid: newOrder[0].orderid,
          itemname: item.itemname,
          itemtype: item.itemtype,
          size: item.size,
          number: item.number,
          materialid: item.materialid,
          equipmentid: item.equipmentid,
          supplierid: item.supplierid,
          unitprice: item.unitprice !== undefined && item.unitprice !== null ? item.unitprice.toString() : undefined,
          totalPrice: item.totalprice !== undefined && item.totalprice !== null ? item.totalprice.toString() : undefined,
          notes: item.notes,
          specifications: item.specifications,
          sortorder: item.sortorder || index,
          createdat: new Date().toISOString(),
        }).returning()
      )
    );

    return NextResponse.json({ 
      order: { ...newOrder[0], items: orderItems.map(i => i[0]) } 
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating shop order:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create shop order" },
      { status: 500 }
    );
  }
}
