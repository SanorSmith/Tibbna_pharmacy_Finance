/**
 * POS Drug/Item Details API
 *
 * GET — full item details with available batches, prices, stock
 *
 * Accepts either a drug UUID (drugs.drugid) or an item UUID (items.id).
 * Uses the unified inventory system: items → item_batches → inventory_stock
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drugs } from "@/lib/db/tables/pharmacy-drugs";
import { items, itemBatches, inventoryStock } from "@/lib/db/schema";
import { eq, and, or, sql, gt } from "drizzle-orm";
import { getUser } from "@/lib/user";

type RouteParams = { params: Promise<{ drugId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { drugId } = await params;

    // Try to find the item — by items.id first, then by items.drug_id
    let [item] = await db
      .select()
      .from(items)
      .where(eq(items.id, drugId))
      .limit(1);

    if (!item) {
      [item] = await db
        .select()
        .from(items)
        .where(eq(items.drugid, drugId))
        .limit(1);
    }

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Get drug-specific details if linked
    let drugDetails = null;
    if (item.drugid) {
      const [d] = await db
        .select()
        .from(drugs)
        .where(eq(drugs.drugid, item.drugid))
        .limit(1);
      drugDetails = d || null;
    }

    // Get all available batches with prices and current stock from inventory_stock
    const batches = await db
      .select({
        batchid: itemBatches.id,
        batchnumber: itemBatches.batchnumber,
        expirydate: itemBatches.expirydate,
        sellingprice: itemBatches.sellingprice,
        unitcost: itemBatches.unitcost,
        isquarantined: itemBatches.isquarantined,
        manufacturedate: itemBatches.manufacturedate,
        currentstock: sql<number>`COALESCE((
          SELECT SUM(ist.quantity)
          FROM inventory_stock ist
          WHERE ist.item_id = ${itemBatches.itemid}
            AND ist.batch_id = ${itemBatches.id}
            AND ist.quantity > 0
        ), 0)`.as("currentstock"),
      })
      .from(itemBatches)
      .where(
        and(
          eq(itemBatches.itemid, item.id),
          eq(itemBatches.isquarantined, false),
          or(
            sql`${itemBatches.expirydate} IS NULL`,
            gt(itemBatches.expirydate, sql`CURRENT_TIMESTAMP`)
          )
        )
      )
      .orderBy(sql`${itemBatches.expirydate} ASC NULLS LAST`);

    // Filter to only in-stock batches
    const inStockBatches = batches.filter((b) => Number(b.currentstock) > 0);

    // Calculate total available stock
    const totalStock = inStockBatches.reduce(
      (sum, b) => sum + Number(b.currentstock),
      0
    );

    return NextResponse.json({
      item,
      drug: drugDetails,
      batches: inStockBatches,
      totalStock,
      // Recommended price from earliest-expiry in-stock batch (FIFO)
      recommendedPrice:
        inStockBatches.length > 0 ? inStockBatches[0].sellingprice : null,
      recommendedBatchId:
        inStockBatches.length > 0 ? inStockBatches[0].batchid : null,
    });
  } catch (error) {
    console.error("[POS Drug Details]", error);
    return NextResponse.json(
      { error: "Failed to get drug details" },
      { status: 500 }
    );
  }
}
