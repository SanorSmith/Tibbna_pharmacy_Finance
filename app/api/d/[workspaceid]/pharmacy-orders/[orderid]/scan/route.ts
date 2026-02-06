/**
 * Barcode Scan API for Pharmacy Dispensing
 *
 * POST /api/d/[workspaceid]/pharmacy-orders/[orderid]/scan
 *
 * Accepts a scanned barcode, matches it to an order item's drug,
 * and marks that item as SCANNED.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  pharmacyOrderItems,
  pharmacyOrders,
  drugs,
  drugBatches,
} from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { z } from "zod";

const scanSchema = z.object({
  barcode: z.string().min(1),
});

type RouteParams = { params: Promise<{ workspaceid: string; orderid: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, orderid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { barcode } = scanSchema.parse(body);

    // Verify order belongs to workspace
    const [order] = await db
      .select()
      .from(pharmacyOrders)
      .where(eq(pharmacyOrders.orderid, orderid))
      .limit(1);

    if (!order || order.workspaceid !== workspaceid) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Find drug by barcode (check drugs table and drug_batches table)
    let matchedDrugId: string | null = null;
    let matchedBatchId: string | null = null;

    // Try batch barcode first (more specific)
    const [batchMatch] = await db
      .select({ batchid: drugBatches.batchid, drugid: drugBatches.drugid })
      .from(drugBatches)
      .where(eq(drugBatches.barcode, barcode))
      .limit(1);

    if (batchMatch) {
      matchedDrugId = batchMatch.drugid;
      matchedBatchId = batchMatch.batchid;
    } else {
      // Try drug-level barcode
      const [drugMatch] = await db
        .select({ drugid: drugs.drugid })
        .from(drugs)
        .where(eq(drugs.barcode, barcode))
        .limit(1);

      if (drugMatch) {
        matchedDrugId = drugMatch.drugid;
      }
    }

    if (!matchedDrugId) {
      return NextResponse.json(
        { error: "No drug found for this barcode", barcode },
        { status: 404 }
      );
    }

    // Find a PENDING item in this order that matches the drug
    const items = await db
      .select()
      .from(pharmacyOrderItems)
      .where(
        and(
          eq(pharmacyOrderItems.orderid, orderid),
          eq(pharmacyOrderItems.drugid, matchedDrugId),
          eq(pharmacyOrderItems.status, "PENDING")
        )
      )
      .limit(1);

    if (items.length === 0) {
      // Check if already scanned
      const [alreadyScanned] = await db
        .select()
        .from(pharmacyOrderItems)
        .where(
          and(
            eq(pharmacyOrderItems.orderid, orderid),
            eq(pharmacyOrderItems.drugid, matchedDrugId)
          )
        )
        .limit(1);

      if (alreadyScanned && alreadyScanned.status === "SCANNED") {
        return NextResponse.json({
          message: "Item already scanned",
          item: alreadyScanned,
          alreadyScanned: true,
        });
      }

      return NextResponse.json(
        { error: "No pending item in this order matches the scanned drug", barcode },
        { status: 400 }
      );
    }

    // Mark as scanned
    const [updated] = await db
      .update(pharmacyOrderItems)
      .set({
        status: "SCANNED",
        scannedbarcode: barcode,
        scannedat: new Date(),
        batchid: matchedBatchId,
      })
      .where(eq(pharmacyOrderItems.itemid, items[0].itemid))
      .returning();

    // Check how many items are left
    const allItems = await db
      .select()
      .from(pharmacyOrderItems)
      .where(eq(pharmacyOrderItems.orderid, orderid));

    const pending = allItems.filter((i) => i.status === "PENDING").length;
    const total = allItems.length;

    return NextResponse.json({
      message: "Item scanned successfully",
      item: updated,
      progress: { scanned: total - pending, total, allScanned: pending === 0 },
    });
  } catch (error) {
    console.error("[Pharmacy Scan POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid barcode", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to process scan" }, { status: 500 });
  }
}
