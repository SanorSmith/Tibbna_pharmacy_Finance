/**
 * Pharmacy Inventory API
 * GET — full inventory with stock levels, batch info, expiry, low stock alerts
 * POST — create auto-reorder suggestion
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  items,
  itemBatches,
  inventoryStock,
  warehouses,
  warehouseSections,
  stockTransactions,
} from "@/lib/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { getUser } from "@/lib/user";

// Use item's reorderlevel, fall back to 10 if not set
const FALLBACK_REORDER_THRESHOLD = 10;
const DEFAULT_REORDER_QUANTITY = 100;

// Helper to get effective reorder level for an item
function getEffectiveReorderLevel(item: { reorderlevel: number | null }): number {
  return item.reorderlevel ?? FALLBACK_REORDER_THRESHOLD;
}

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

    // Get all pharmacy items with aggregated stock for this workspace
    const allItems = await db
      .select({
        itemid: items.id,
        name: items.name,
        genericname: items.genericname,
        itemcode: items.itemcode,
        uom: items.uom,
        barcode: items.barcode,
        manufacturer: items.manufacturer,
        isactive: items.isactive,
        reorderlevel: items.reorderlevel,
        totalStock: sql<number>`COALESCE(SUM(${inventoryStock.quantity}), 0)::int`,
      })
      .from(items)
      .leftJoin(inventoryStock, eq(items.id, inventoryStock.itemid))
      .leftJoin(warehouses, eq(inventoryStock.warehouseid, warehouses.id))
      .where(
        and(
          eq(items.workspaceid, workspaceid),
          eq(items.itemtype, 'drug')
        )
      )
      .groupBy(
        items.id,
        items.name,
        items.genericname,
        items.itemcode,
        items.uom,
        items.barcode,
        items.manufacturer,
        items.isactive,
        items.reorderlevel
      )
      .orderBy(items.name);

    // Get batch info and warehouse stock for each item
    const enrichedItems = await Promise.all(
      allItems.map(async (item) => {
        const batches = await db
          .select({
            batchid: itemBatches.id,
            batchnumber: itemBatches.batchnumber,
            quantity: itemBatches.quantity,
            unitcost: itemBatches.unitcost,
          })
          .from(itemBatches)
          .where(eq(itemBatches.itemid, item.itemid))
          .orderBy(itemBatches.batchnumber);

        // Get stock per warehouse (pharmacy only)
        const locations = await db
          .select({
            warehouseid: warehouses.id,
            warehousename: warehouses.name,
            sectionid: warehouseSections.id,
            sectionname: warehouseSections.sectionname,
            quantity: inventoryStock.quantity,
            reservedquantity: inventoryStock.reservedquantity,
            batchid: inventoryStock.batchid,
          })
          .from(inventoryStock)
          .innerJoin(warehouses, eq(inventoryStock.warehouseid, warehouses.id))
          .leftJoin(warehouseSections, eq(inventoryStock.warehouseid, warehouseSections.warehouseid))
          .where(
            and(
              eq(inventoryStock.itemid, item.itemid),
              eq(warehouses.warehousetype, 'pharmacy')
            )
          );

        // Note: item_batches doesn't have expirydate, expiry is tracked at item level
        // For now, skip expiry checks - would need to add expirydate to itemBatches or use different logic
        const hasExpiring = false;
        const hasExpired = false;

        // Use item's reorderlevel for low stock calculation
        const effectiveReorderLevel = getEffectiveReorderLevel(item);
        const isLowStock = item.totalStock > 0 && item.totalStock <= effectiveReorderLevel;
        const isOutOfStock = item.totalStock === 0;

        // Determine status
        let status: "ok" | "low" | "outofstock" = "ok";
        if (isOutOfStock) status = "outofstock";
        else if (isLowStock) status = "low";

        return {
          ...item,
          batches,
          locations,
          hasExpiring,
          hasExpired,
          isLowStock,
          isOutOfStock,
          status,
          reorderSuggested: isLowStock || isOutOfStock,
          suggestedReorderQty: isOutOfStock
            ? DEFAULT_REORDER_QUANTITY
            : isLowStock
            ? Math.max(DEFAULT_REORDER_QUANTITY - item.totalStock, 0)
            : 0,
        };
      })
    );

    // Apply filter
    let filtered = enrichedItems;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = enrichedItems.filter((i) =>
        i.name.toLowerCase().includes(searchLower) ||
        (i.genericname?.toLowerCase() || '').includes(searchLower) ||
        i.barcode?.includes(search)
      );
    }
    if (filter === "low") filtered = enrichedItems.filter((i) => i.isLowStock);
    else if (filter === "outofstock") filtered = enrichedItems.filter((i) => i.isOutOfStock);
    else if (filter === "expiring") filtered = enrichedItems.filter((i) => i.hasExpiring || i.hasExpired);

    // Summary stats
    const summary = {
      totalDrugs: enrichedItems.length,
      lowStock: enrichedItems.filter((i) => i.isLowStock).length,
      outOfStock: enrichedItems.filter((i) => i.isOutOfStock).length,
      expiringSoon: enrichedItems.filter((i) => i.hasExpiring).length,
      expired: enrichedItems.filter((i) => i.hasExpired).length,
      reorderNeeded: enrichedItems.filter((i) => i.reorderSuggested).length,
      threshold: FALLBACK_REORDER_THRESHOLD,
    };

    // Recent movements
    const recentMovements = await db
      .select({
        movementid: stockTransactions.id,
        itemid: stockTransactions.itemid,
        transactiontype: stockTransactions.transactiontype,
        quantity: stockTransactions.quantity,
        referencetype: stockTransactions.referencetype,
        createdat: stockTransactions.createdat,
        itemname: items.name,
        warehousename: warehouses.name,
      })
      .from(stockTransactions)
      .innerJoin(items, eq(stockTransactions.itemid, items.id))
      .innerJoin(warehouses, eq(stockTransactions.warehouseid, warehouses.id))
      .where(
        eq(warehouses.warehousetype, 'pharmacy')
      )
      .orderBy(desc(stockTransactions.createdat))
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
    const { itemids } = body; // array of item ids to reorder

    if (!Array.isArray(itemids) || itemids.length === 0) {
      return NextResponse.json({ error: "itemids array required" }, { status: 400 });
    }

    // Get item info for reorder
    const reorderItems = [];
    for (const itemid of itemids) {
      const [item] = await db
        .select({
          itemid: items.id,
          name: items.name,
          genericname: items.genericname,
          manufacturer: items.manufacturer,
          reorderlevel: items.reorderlevel,
        })
        .from(items)
        .where(eq(items.id, itemid))
        .limit(1);

      if (!item) continue;

      // Calculate current stock in pharmacy warehouses for this workspace
      const [stockInfo] = await db
        .select({
          totalStock: sql<number>`COALESCE(SUM(${inventoryStock.quantity}), 0)::int`,
        })
        .from(inventoryStock)
        .innerJoin(warehouses, eq(inventoryStock.warehouseid, warehouses.id))
        .where(
          and(
            eq(inventoryStock.itemid, itemid),
            eq(warehouses.warehousetype, 'pharmacy')
          )
        );

      const currentStock = stockInfo?.totalStock || 0;
      const suggestedQty = Math.max(DEFAULT_REORDER_QUANTITY - currentStock, DEFAULT_REORDER_QUANTITY);

      reorderItems.push({
        ...item,
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
