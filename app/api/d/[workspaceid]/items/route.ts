/**
 * Items API for workspace-specific inventory
 * POST — create a new item in the items table (inventory)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, itemBatches, inventoryStock, warehouses, warehouseSections, drugs } from "@/lib/db/schema";
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
      form,
      strength,
      atccode,
      storage_location,
      storage_type,
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

    console.log('[Items POST] Creating item:', { name, itemcode: finalItemcode, barcode, form, strength, storage_location, storage_type });

    // If form/strength/atccode provided and itemtype is drug, create a drug record
    let finalDrugId = drugid;
    if (itemtype === "drug" && (form || strength || atccode) && !drugid) {
      // Check if drug with same name already exists in this workspace
      const [existingDrug] = await db
        .select()
        .from(drugs)
        .where(
          and(
            eq(drugs.workspaceid, workspaceid),
            eq(drugs.name, name)
          )
        )
        .limit(1);

      if (existingDrug) {
        finalDrugId = existingDrug.drugid;
        console.log('[Items POST] Using existing drug record:', finalDrugId);
      } else {
        const [newDrug] = await db
          .insert(drugs)
          .values({
            workspaceid,
            name,
            genericname: genericname || null,
            form: form || null,
            strength: strength || null,
            unit: uom || null,
            atccode: atccode || null,
            manufacturer: manufacturer || null,
            barcode: barcode || null,
            isactive: true,
          })
          .returning();
        
        finalDrugId = newDrug.drugid;
        console.log('[Items POST] Created drug record:', finalDrugId);
      }
    }

    // Handle storage location - find or create warehouse section
    let storageLocationId: string | null = null;
    
    if (storage_location && warehouseid) {
      // Try to find existing storage section by name
      const [existingSection] = await db
        .select()
        .from(warehouseSections)
        .where(
          and(
            eq(warehouseSections.warehouseid, warehouseid),
            eq(warehouseSections.sectionname, storage_location)
          )
        )
        .limit(1);

      if (existingSection) {
        storageLocationId = existingSection.id;
        console.log('[Items POST] Found existing storage section:', storage_location, storageLocationId);
      } else {
        // Create new warehouse section
        const [newSection] = await db
          .insert(warehouseSections)
          .values({
            warehouseid: warehouseid,
            sectionname: storage_location,
            sectiontype: storage_type || 'shelf',
            binlocation: null,
            shelf: null,
            description: null,
            temperaturecontrolled: storage_type === 'fridge' || storage_type === 'freezer',
          })
          .returning();
        
        storageLocationId = newSection.id;
        console.log('[Items POST] Created new storage section:', storage_location, storageLocationId);
      }
    }

    // Check if item with same name already exists in this workspace
    const existingByName = await db
      .select()
      .from(items)
      .where(
        and(
          eq(items.workspaceid, workspaceid),
          eq(items.name, name)
        )
      )
      .limit(1);

    // If item exists, use it to add batch/stock info
    if (existingByName.length > 0) {
      console.log('[Items POST] Item with same name already exists, using existing:', existingByName[0].name);
      const existingItem = existingByName[0];
      let batchId = null;
      let stockAdded = false;

      // If addStock is true and warehouse/batch info provided, create batch and stock for existing item
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
        batchId = crypto.randomUUID();
        await db.insert(itemBatches).values({
          id: batchId,
          itemid: existingItem.id,
          warehouseid,
          batchnumber,
          quantity,
          unitcost,
          sellingprice,
          expirydate: expirydate ? new Date(expirydate) : null,
        });

        // Create or update inventory stock record with batch_id
        const existingStock = await db
          .select()
          .from(inventoryStock)
          .where(
            and(
              eq(inventoryStock.itemid, existingItem.id),
              eq(inventoryStock.warehouseid, warehouseid)
            )
          )
          .limit(1);

        if (existingStock.length > 0) {
          // Update existing stock
          await db
            .update(inventoryStock)
            .set({
              quantity: existingStock[0].quantity + quantity,
              batchid: batchId,
            })
            .where(eq(inventoryStock.id, existingStock[0].id));
        } else {
          // Create new stock record
          await db.insert(inventoryStock).values({
            id: crypto.randomUUID(),
            itemid: existingItem.id,
            batchid: batchId,
            warehouseid,
            quantity,
            reservedquantity: 0,
          });
        }
        stockAdded = true;
      }

      return NextResponse.json(
        {
          message: stockAdded ? "Batch/stock added to existing item" : "Existing item found, no stock added (warehouse/quantity not provided)",
          item: existingItem,
          batchId,
          existing: true,
          stockAdded,
        },
        { status: 200 }
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
        drugid: finalDrugId,
        storagelocationid: storageLocationId,
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

      // Create inventory stock record with batch_id
      await db.insert(inventoryStock).values({
        id: crypto.randomUUID(),
        itemid: itemId,
        batchid: batchId,
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
