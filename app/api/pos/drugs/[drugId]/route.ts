/**
 * POS Drug Details API
 *
 * GET — full drug details with available batches, prices, stock
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drugs } from "@/lib/db/tables/pharmacy-drugs";
import { drugBatches } from "@/lib/db/tables/pharmacy-drugs";
import { stockLevels } from "@/lib/db/tables/pharmacy-stock";
import { eq, and, gt, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";

type RouteParams = { params: Promise<{ drugId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { drugId } = await params;

    // Get drug details
    const [drug] = await db
      .select()
      .from(drugs)
      .where(eq(drugs.drugid, drugId))
      .limit(1);

    if (!drug) {
      return NextResponse.json({ error: "Drug not found" }, { status: 404 });
    }

    // Get all available batches with prices and current stock
    const batches = await db
      .select({
        batchid: drugBatches.batchid,
        lotnumber: drugBatches.lotnumber,
        expirydate: drugBatches.expirydate,
        sellingprice: drugBatches.sellingprice,
        purchaseprice: drugBatches.purchaseprice,
        barcode: drugBatches.barcode,
        currentstock: sql<number>`COALESCE((
          SELECT SUM(sl.quantity) FROM pharmacy_stock_levels sl
          WHERE sl.drugid = ${drugBatches.drugid}
            AND sl.batchid = ${drugBatches.batchid}
        ), 0)`.as("currentstock"),
      })
      .from(drugBatches)
      .where(
        and(
          eq(drugBatches.drugid, drugId),
          gt(drugBatches.expirydate, sql`CURRENT_DATE`)
        )
      )
      .orderBy(drugBatches.expirydate);

    // Filter to only in-stock batches
    const inStockBatches = batches.filter((b) => Number(b.currentstock) > 0);

    // Calculate total available stock
    const totalStock = inStockBatches.reduce(
      (sum, b) => sum + Number(b.currentstock),
      0
    );

    return NextResponse.json({
      drug,
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
