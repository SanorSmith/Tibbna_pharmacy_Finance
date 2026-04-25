/**
 * Items API for workspace-specific inventory
 * POST — create a new item in the items table (inventory)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, itemBatches, inventoryStock, warehouses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      name,
      genericname,
      itemcode,
      uom,
      inventorycategory = "pharmacy",
      itemtype = "drug",
      manufacturer,
      barcode,
      reorderlevel = 10,
      minlevel = 10,
      maxlevel,
      controlled = false,
      drugid,
      // Optional: Add stock/batch info immediately
      addStock = false,
      warehouseid,
      batchnumber,
      quantity = 0,
      unitcost,
      sellingprice,
      expirydate,
    } = body;

    if (!name || !uom) {
      return NextResponse.json(
        { error: "name and uom are required" },
        { status: 400 }
      );
    }

    // Generate itemcode if not provided
    const finalItemcode = itemcode || barcode || `${name.substring(0, 8).toUpperCase()}-${Date.now().toString(36)}`;

    console.log('[Items POST] Creating item:', { name, itemcode: finalItemcode, barcode });

    // Check if item with same itemcode already exists in this workspace
    const existing = await db
      .select()
      .from(items)
      .where(
        and(
          eq(items.workspaceid, workspaceid),
          eq(items.itemcode, finalItemcode)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      console.log('[Items POST] Item already exists:', existing[0].itemcode);
      return NextResponse.json(
        { error: `Item with itemcode "${finalItemcode}" already exists in workspace` },
        { status: 409 }
      );
    }

    // Create the item
    const itemId = crypto.randomUUID();
    const [newItem] = await db
      .insert(items)
      .values({
        id: itemId,
        workspaceid,
        itemcode: finalItemcode,
        name,
        genericname,
        itemtype,
        inventorycategory,
        uom,
        manufacturer,
        barcode,
        reorderlevel,
        minlevel,
        maxlevel,
        controlled,
        drugid,
        isactive: true,
      })
      .returning();

    // If addStock is true and warehouse/batch info provided, create batch and stock
    if (addStock && warehouseid && batchnumber && quantity > 0) {
      // Verify warehouse exists
      const [warehouse] = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.id, warehouseid))
        .limit(1);

      if (!warehouse) {
        return NextResponse.json(
          { error: "Warehouse not found" },
          { status: 400 }
        );
      }

      // Create batch
      const batchId = crypto.randomUUID();
      await db.insert(itemBatches).values({
        id: batchId,
        itemid: itemId,
        warehouseid,
        batchnumber,
        quantity,
        unitcost,
        sellingprice,
        expirydate: expirydate ? new Date(expirydate) : null,
      });

      // Create inventory stock record
      await db.insert(inventoryStock).values({
        id: crypto.randomUUID(),
        itemid: itemId,
        warehouseid,
        quantity,
        reservedquantity: 0,
      });
    }

    return NextResponse.json(
      {
        message: "Item created successfully",
        item: newItem,
        stockAdded: addStock,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Items POST]", error);
    return NextResponse.json(
      { error: error.message || "Failed to create item" },
      { status: 500 }
    );
  }
}
