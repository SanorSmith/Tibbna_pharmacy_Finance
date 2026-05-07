import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, itemBatches, inventoryStock, drugs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceid: string } }
) {
  try {
    const { workspaceid } = params;
    const { searchParams } = new URL(request.url);
    const drugId = searchParams.get("drugId");

    if (!drugId) {
      return NextResponse.json(
        { error: "drugId parameter is required" },
        { status: 400 }
      );
    }

    // Transform drug to inventory item using items.drugid → drugs.drugid relationship
    const inventoryItems = await db
      .select({
        itemId: items.id,
        itemName: items.name,
        genericName: items.genericname,
        itemCode: items.itemcode,
        uom: items.uom,
        manufacturer: items.manufacturer,
        drugId: drugs.drugid,
        drugName: drugs.name,
        form: drugs.form,
        strength: drugs.strength,
        batchId: itemBatches.id,
        batchNumber: itemBatches.batchnumber,
        expiryDate: itemBatches.expirydate,
        sellingPrice: itemBatches.sellingprice,
        unitCost: itemBatches.unitcost,
        stockQuantity: inventoryStock.quantity,
      })
      .from(items)
      .innerJoin(drugs, eq(drugs.drugid, items.drugid))
      .leftJoin(itemBatches, eq(itemBatches.itemid, items.id))
      .leftJoin(inventoryStock, and(
        eq(inventoryStock.itemid, items.id),
        eq(inventoryStock.batchid, itemBatches.id)
      ))
      .where(
        and(
          eq(items.drugid, drugId),
          eq(items.workspaceid, workspaceid),
          eq(items.itemtype, 'drug')
        )
      );

    // Filter to only show batches with stock and not expired
    const availableItems = inventoryItems.filter(item => {
      const hasStock = item.stockQuantity && item.stockQuantity > 0;
      const notExpired = !item.expiryDate || new Date(item.expiryDate) > new Date();
      return hasStock && notExpired;
    });

    // Group by item and calculate total stock
    const itemMap = new Map();
    availableItems.forEach(item => {
      const key = item.itemId;
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          itemId: item.itemId,
          itemName: item.itemName,
          genericName: item.genericName,
          itemCode: item.itemCode,
          uom: item.uom,
          manufacturer: item.manufacturer,
          drugId: item.drugId,
          drugName: item.drugName,
          form: item.form,
          strength: item.strength,
          totalStock: 0,
          batches: [],
        });
      }
      const itemData = itemMap.get(key);
      itemData.totalStock += (item.stockQuantity || 0);
      itemData.batches.push({
        batchId: item.batchId,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        sellingPrice: item.sellingPrice,
        unitCost: item.unitCost,
        quantity: item.stockQuantity,
      });
    });

    // Sort by FIFO (earliest expiry first)
    itemMap.forEach(item => {
      item.batches.sort((a: any, b: any) => {
        const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
        const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
        return dateA - dateB;
      });
    });

    return NextResponse.json({
      items: Array.from(itemMap.values()),
    });
  } catch (error) {
    console.error("[Inventory Items by Drug] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory items", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
