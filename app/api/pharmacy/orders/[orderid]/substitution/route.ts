/**
 * Drug Substitution API
 *
 * POST /api/d/[workspaceid]/pharmacy-orders/[orderid]/substitution
 *
 * Allows a pharmacist to substitute one drug for another on an order item.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  pharmacyOrders,
  pharmacyOrderItems,
  drugs,
  substitutions,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { z } from "zod";

const substitutionSchema = z.object({
  itemid: z.string().uuid(),
  newdrugid: z.string().uuid(),
  reason: z.enum(["generic", "out_of_stock", "allergy", "cost", "other"]),
});

type RouteParams = { params: Promise<{ workspaceid: string; orderid: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, orderid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const data = substitutionSchema.parse(body);

    // Verify order
    const [order] = await db
      .select()
      .from(pharmacyOrders)
      .where(eq(pharmacyOrders.orderid, orderid))
      .limit(1);

    if (!order || order.workspaceid !== workspaceid) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify item belongs to order
    const [item] = await db
      .select()
      .from(pharmacyOrderItems)
      .where(eq(pharmacyOrderItems.itemid, data.itemid))
      .limit(1);

    if (!item || item.orderid !== orderid) {
      return NextResponse.json({ error: "Order item not found" }, { status: 404 });
    }

    // Verify new drug exists
    const [newDrug] = await db
      .select()
      .from(drugs)
      .where(eq(drugs.drugid, data.newdrugid))
      .limit(1);

    if (!newDrug) {
      return NextResponse.json({ error: "Substitute drug not found" }, { status: 404 });
    }

    // Create substitution record
    const [sub] = await db
      .insert(substitutions)
      .values({
        orderitemid: data.itemid,
        originaldrugid: item.drugid,
        newdrugid: data.newdrugid,
        reason: data.reason,
        approvedby: user.userid,
      })
      .returning();

    // Update item to point to new drug
    const [updatedItem] = await db
      .update(pharmacyOrderItems)
      .set({
        drugid: data.newdrugid,
        drugname: newDrug.name,
        status: "SUBSTITUTED",
        notes: `Substituted: ${data.reason}. Original: ${item.drugname}`,
      })
      .where(eq(pharmacyOrderItems.itemid, data.itemid))
      .returning();

    return NextResponse.json({
      message: "Drug substituted successfully",
      substitution: sub,
      item: updatedItem,
      newDrug: { drugid: newDrug.drugid, name: newDrug.name, strength: newDrug.strength },
    });
  } catch (error) {
    console.error("[Pharmacy Substitution POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to process substitution" }, { status: 500 });
  }
}
