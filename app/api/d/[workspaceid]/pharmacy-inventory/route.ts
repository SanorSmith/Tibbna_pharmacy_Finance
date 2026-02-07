/**
 * Pharmacy Inventory API
 * GET — full inventory with stock levels, batch info, expiry, low stock alerts
 * POST — create auto-reorder suggestion
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  drugs,
  drugBatches,
  stockLevels,
  stockLocations,
  stockMovements,
} from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { getUser } from "@/lib/user";

const DEFAULT_LOW_STOCK_THRESHOLD = 10;
const DEFAULT_REORDER_QUANTITY = 100;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "all"; // all, low, outofstock, expiring

    // Get all drugs with aggregated stock
    const allDrugs = await db
      .select({
        drugid: drugs.drugid,
        name: drugs.name,
        genericname: drugs.genericname,
        form: drugs.form,
        strength: drugs.strength,
        unit: drugs.unit,
        barcode: drugs.barcode,
        manufacturer: drugs.manufacturer,
        isactive: drugs.isactive,
        totalStock: sql<number>`COALESCE(SUM(${stockLevels.quantity}), 0)::int`,
      })
      .from(drugs)
      .leftJoin(stockLevels, eq(drugs.drugid, stockLevels.drugid))
      .where(
        search
          ? sql`(LOWER(${drugs.name}) LIKE LOWER(${'%' + search + '%'}) OR LOWER(${drugs.genericname}) LIKE LOWER(${'%' + search + '%'}) OR ${drugs.barcode} LIKE ${'%' + search + '%'})`
          : undefined
      )
      .groupBy(
        drugs.drugid,
        drugs.name,
        drugs.genericname,
        drugs.form,
        drugs.strength,
        drugs.unit,
        drugs.barcode,
        drugs.manufacturer,
        drugs.isactive
      )
      .orderBy(drugs.name);

    // Get batch info for each drug
    const enrichedDrugs = await Promise.all(
      allDrugs.map(async (drug) => {
        const batches = await db
          .select({
            batchid: drugBatches.batchid,
            lotnumber: drugBatches.lotnumber,
            expirydate: drugBatches.expirydate,
            purchaseprice: drugBatches.purchaseprice,
            sellingprice: drugBatches.sellingprice,
          })
          .from(drugBatches)
          .where(eq(drugBatches.drugid, drug.drugid))
          .orderBy(drugBatches.expirydate);

        // Get stock per location
        const locations = await db
          .select({
            locationid: stockLocations.locationid,
            locationname: stockLocations.name,
            locationtype: stockLocations.type,
            quantity: stockLevels.quantity,
            batchid: stockLevels.batchid,
          })
          .from(stockLevels)
          .innerJoin(stockLocations, eq(stockLevels.locationid, stockLocations.locationid))
          .where(eq(stockLevels.drugid, drug.drugid));

        // Check for expiring batches (within 90 days)
        const now = new Date();
        const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        const expiringBatches = batches.filter((b) => {
          const exp = new Date(b.expirydate);
          return exp <= ninetyDays && exp >= now;
        });
        const expiredBatches = batches.filter((b) => new Date(b.expirydate) < now);

        const isLowStock = drug.totalStock > 0 && drug.totalStock < DEFAULT_LOW_STOCK_THRESHOLD;
        const isOutOfStock = drug.totalStock === 0;
        const hasExpiring = expiringBatches.length > 0;
        const hasExpired = expiredBatches.length > 0;

        // Determine status
        let status: "ok" | "low" | "outofstock" | "expiring" = "ok";
        if (isOutOfStock) status = "outofstock";
        else if (isLowStock) status = "low";
        else if (hasExpiring) status = "expiring";

        return {
          ...drug,
          batches,
          locations,
          expiringBatches: expiringBatches.length,
          expiredBatches: expiredBatches.length,
          isLowStock,
          isOutOfStock,
          hasExpiring,
          hasExpired,
          status,
          reorderSuggested: isLowStock || isOutOfStock,
          suggestedReorderQty: isOutOfStock
            ? DEFAULT_REORDER_QUANTITY
            : isLowStock
            ? DEFAULT_REORDER_QUANTITY - drug.totalStock
            : 0,
        };
      })
    );

    // Apply filter
    let filtered = enrichedDrugs;
    if (filter === "low") filtered = enrichedDrugs.filter((d) => d.isLowStock);
    else if (filter === "outofstock") filtered = enrichedDrugs.filter((d) => d.isOutOfStock);
    else if (filter === "expiring") filtered = enrichedDrugs.filter((d) => d.hasExpiring || d.hasExpired);

    // Summary stats
    const summary = {
      totalDrugs: allDrugs.length,
      lowStock: enrichedDrugs.filter((d) => d.isLowStock).length,
      outOfStock: enrichedDrugs.filter((d) => d.isOutOfStock).length,
      expiringSoon: enrichedDrugs.filter((d) => d.hasExpiring).length,
      expired: enrichedDrugs.filter((d) => d.hasExpired).length,
      reorderNeeded: enrichedDrugs.filter((d) => d.reorderSuggested).length,
      threshold: DEFAULT_LOW_STOCK_THRESHOLD,
    };

    // Recent movements
    const recentMovements = await db
      .select({
        movementid: stockMovements.movementid,
        drugid: stockMovements.drugid,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        reason: stockMovements.reason,
        createdat: stockMovements.createdat,
        drugname: drugs.name,
        locationname: stockLocations.name,
      })
      .from(stockMovements)
      .innerJoin(drugs, eq(stockMovements.drugid, drugs.drugid))
      .innerJoin(stockLocations, eq(stockMovements.locationid, stockLocations.locationid))
      .orderBy(desc(stockMovements.createdat))
      .limit(20);

    return NextResponse.json({
      inventory: filtered,
      summary,
      recentMovements,
    });
  } catch (error) {
    console.error("[Pharmacy Inventory]", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

// POST — trigger auto-reorder for low stock items
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { drugids } = body; // array of drugids to reorder

    if (!Array.isArray(drugids) || drugids.length === 0) {
      return NextResponse.json({ error: "drugids array required" }, { status: 400 });
    }

    // Get drug info for reorder
    const reorderItems = [];
    for (const drugid of drugids) {
      const [drug] = await db
        .select({
          drugid: drugs.drugid,
          name: drugs.name,
          strength: drugs.strength,
          form: drugs.form,
          manufacturer: drugs.manufacturer,
        })
        .from(drugs)
        .where(eq(drugs.drugid, drugid))
        .limit(1);

      if (!drug) continue;

      // Calculate current stock
      const [stockInfo] = await db
        .select({
          totalStock: sql<number>`COALESCE(SUM(${stockLevels.quantity}), 0)::int`,
        })
        .from(stockLevels)
        .where(eq(stockLevels.drugid, drugid));

      const currentStock = stockInfo?.totalStock || 0;
      const suggestedQty = Math.max(DEFAULT_REORDER_QUANTITY - currentStock, DEFAULT_REORDER_QUANTITY);

      reorderItems.push({
        ...drug,
        currentStock,
        suggestedQuantity: suggestedQty,
        status: "REORDER_SUGGESTED",
        createdAt: new Date().toISOString(),
        createdBy: user.userid,
      });
    }

    return NextResponse.json({
      message: `Auto-reorder generated for ${reorderItems.length} items`,
      reorderItems,
    });
  } catch (error) {
    console.error("[Pharmacy Inventory POST]", error);
    return NextResponse.json({ error: "Failed to create reorder" }, { status: 500 });
  }
}
