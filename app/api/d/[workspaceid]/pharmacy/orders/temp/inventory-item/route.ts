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
    const itemId = searchParams.get("itemId");
    const batchId = searchParams.get("batchId");

    if (!itemId || !batchId) {
      return NextResponse.json(
        { error: "itemId and batchId parameters are required" },
        { status: 400 }
      );
    }

    // Fetch inventory item and batch details using items.drugid → drugs.drugid relationship
    const result = await db
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
        batchQuantity: itemBatches.quantity,
        stockQuantity: inventoryStock.quantity,
      })
      .from(items)
      .innerJoin(drugs, eq(drugs.drugid, items.drugid))
      .innerJoin(itemBatches, and(eq(itemBatches.itemid, items.id), eq(itemBatches.id, batchId)))
      .leftJoin(inventoryStock, and(
        eq(inventoryStock.itemid, items.id),
        eq(inventoryStock.batchid, itemBatches.id)
      ))
      .where(
        and(
          eq(items.id, itemId),
          eq(items.workspaceid, workspaceid)
        )
      );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    const item = result[0];
    
    // Use the stock quantity from inventory_stock if available, otherwise use batch quantity
    const availableQuantity = item.stockQuantity && item.stockQuantity > 0 
      ? item.stockQuantity 
      : item.batchQuantity || 0;

    return NextResponse.json({
      ...item,
      batchQuantity: availableQuantity,
    });
  } catch (error) {
    console.error("[Inventory Item] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory item", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
