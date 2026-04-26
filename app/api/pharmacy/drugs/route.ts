/**
 * Pharmacy Drugs CRUD API — GLOBAL catalog (shared across all workspaces)
 * GET  — list all drugs with search (no workspace filter)
 * POST — register a new drug (stores creating workspace for reference)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drugs, items, itemBatches, inventoryStock, warehouseSections } from "@/lib/db/schema";
import { or, ilike, desc, eq, and } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(
  request: NextRequest
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    let whereClause;
    if (search.trim()) {
      const pattern = `%${search.trim()}%`;
      whereClause = or(
        ilike(drugs.name, pattern),
        ilike(drugs.genericname, pattern),
        ilike(drugs.nationalcode, pattern),
        ilike(drugs.barcode, pattern)
      );
    }

    const rows = await db
      .select()
      .from(drugs)
      .where(whereClause)
      .orderBy(desc(drugs.createdat));

    return NextResponse.json({ drugs: rows });
  } catch (error) {
    console.error("[Pharmacy Drugs GET]", error);
    return NextResponse.json({ error: "Failed to fetch drugs" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    
    // For medicines, form and strength are required
    const isMedicine = body.entryType === "medicine" || body.form || body.strength;
    if (isMedicine && (!body.form || !body.strength)) {
      return NextResponse.json(
        { error: "Medicine requires dose form and strength" },
        { status: 400 }
      );
    }

    const workspaceid = body.workspaceid || "cec4d702-6dae-4ea5-9a30-ef17842c00fd";
    
    let insertedDrug = null;
    
    // Only create drug record for medicines
    if (isMedicine) {
      [insertedDrug] = await db
        .insert(drugs)
        .values({
          workspaceid,
          name: body.name,
          genericname: body.genericname || null,
          atccode: body.atccode || null,
          form: body.form,
          strength: body.strength,
          unit: body.unit || "tablet",
          barcode: body.barcode || null,
          nationalcode: body.nationalcode || null,
          description: body.description || null,
          interaction: body.interaction || null,
          warning: body.warning || null,
          pregnancy: body.pregnancy || null,
          sideeffect: body.sideeffect || null,
          storagetype: body.storagetype || null,
          indication: body.indication || null,
          traffic: body.traffic || null,
          notes: body.notes || null,
          insuranceapproved: body.insuranceapproved ?? false,
          requiresprescription: body.requiresprescription ?? true,
          metadata: body.metadata || {},
        })
        .returning();
    }

    // Handle storage location - find or create warehouse section
    const warehouseId = body.warehouseid || "22222222-0000-0000-0000-000000000002"; // Pharmacy warehouse
    let storageLocationId: string | null = null;
    
    if (body.storage_location && warehouseId) {
      // Try to find existing storage section by name
      const [existingSection] = await db
        .select()
        .from(warehouseSections)
        .where(
          and(
            eq(warehouseSections.warehouseid, warehouseId),
            eq(warehouseSections.sectionname, body.storage_location)
          )
        )
        .limit(1);

      if (existingSection) {
        storageLocationId = existingSection.id;
      } else {
        // Create new warehouse section
        const [newSection] = await db
          .insert(warehouseSections)
          .values({
            warehouseid: warehouseId,
            sectionname: body.storage_location,
            sectiontype: body.storage_type || 'shelf',
            binlocation: null,
            shelf: null,
            description: null,
            temperaturecontrolled: body.storage_type === 'fridge' || body.storage_type === 'freezer',
          })
          .returning();
        
        storageLocationId = newSection.id;
      }
    }

    // Create item record (for both medicines and items/supplies)
    const itemCode = body.itemcode || `PHR-${Date.now()}`;
    const itemType = isMedicine ? "drug" : (body.itemtype || "supply");
    
    const [insertedItem] = await db
      .insert(items)
      .values({
        workspaceid,
        drugid: insertedDrug?.drugid || null,
        itemcode: itemCode,
        name: body.name,
        genericname: body.genericname || null,
        itemtype: itemType,
        inventorycategory: "pharmacy",
        uom: body.unit || body.uom || "piece",
        minlevel: body.min_level || 10,
        reorderlevel: body.reorder_level || 20,
        maxlevel: body.max_level || 100,
        controlled: body.controlled || false,
        manufacturer: body.manufacturer || null,
        storagelocationid: storageLocationId,
        isactive: true,
        description: body.description || null,
        barcode: body.barcode || null,
        batchtracking: true,
        expirytracking: body.expirytracking ?? (isMedicine ? true : false),
      })
      .returning();

    // Always create batch record to store pricing
    const initialQty = parseInt(body.initial_quantity) || 0;
    const batchNumber = body.batch_number || `BATCH-${Date.now()}`;
    
    const [insertedBatch] = await db
      .insert(itemBatches)
      .values({
        itemid: insertedItem.id,
        warehouseid: warehouseId,
        batchnumber: batchNumber,
        quantity: initialQty,
        unitcost: body.unit_cost ? parseFloat(body.unit_cost) : null,
        sellingprice: body.selling_price ? parseFloat(body.selling_price) : null,
        expirydate: body.expiry_date ? new Date(body.expiry_date) : null,
        manufacturedate: body.manufacture_date ? new Date(body.manufacture_date) : null,
      })
      .returning();

    // Create stock record if quantity > 0
    if (initialQty > 0) {
      await db
        .insert(inventoryStock)
        .values({
          itemid: insertedItem.id,
          warehouseid: warehouseId,
          batchid: insertedBatch.id,
          quantity: initialQty,
          reservedquantity: 0,
        });
    }

    return NextResponse.json({ drug: insertedDrug, item: insertedItem }, { status: 201 });
  } catch (error) {
    console.error("[Pharmacy Drugs POST]", error);
    return NextResponse.json({ error: "Failed to register drug" }, { status: 500 });
  }
}
