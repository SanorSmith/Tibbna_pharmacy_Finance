import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const workspaceId = req.nextUrl.searchParams.get("workspaceId") ?? "";
  const source = req.nextUrl.searchParams.get("source") ?? "global"; // 'global', 'inventory', or undefined

  console.log('[Pharmacy Items API] Received workspace ID:', workspaceId, 'source:', source);

  // Search global drugs table for drug interaction checker
  if (source === "global") {
    const searchPattern = search.trim() === "" ? "%" : `%${search}%`;
    
    const result = await pool.query(
      `SELECT
        drugid as id,
        name,
        genericname,
        form,
        strength,
        unit,
        category,
        description,
        requiresprescription as "requiresPrescription",
        isactive as "isActive"
      FROM global_drugs
      WHERE isactive = true
        AND (
          $1 = '%'
          OR name ILIKE $1
          OR genericname ILIKE $1
          OR atccode ILIKE $1
          OR nationalcode ILIKE $1
        )
      ORDER BY name
      LIMIT 50`,
      [searchPattern]
    );

    console.log('[Pharmacy Items API] Returning', result.rows.length, 'global drugs');
    return NextResponse.json({ items: result.rows });
  }

  // Get all pharmacy warehouses (warehouses table doesn't have workspace_id)
  const whQuery = `SELECT id FROM warehouses WHERE warehouse_type = 'pharmacy' AND is_active = true`;
  const whRes = await pool.query(whQuery);

  if (!whRes.rows.length) return NextResponse.json([]);

  const ids = whRes.rows.map((r: any) => r.id);
  const whArray = `{${ids.join(",")}}`;

  const queryParams = [whArray, search.trim() === "" ? "%" : `%${search}%`];
  let workspaceFilter = '';
  
  if (workspaceId) {
    workspaceFilter = `AND i.workspace_id = $3`;
    queryParams.push(workspaceId);
  }

  const result = await pool.query(
    `SELECT
      i.id,
      i.itemcode,
      i.name,
      i.generic_name       AS "generic_Name",
      i.item_type          AS "itemType",
      i.inventorycategory  AS "inventoryCategory",
      i.uom,
      i.min_level          AS "minLevel",
      i.reorder_level      AS "reorderLevel",
      i.max_level          AS "maxLevel",
      i.controlled,
      i.manufacturer,
      i.packaging_type     AS "packagingType",
      i.package_size       AS "packageSize",
      i.tablets_per_pack   AS "tabletsPerPack",
      i.is_active          AS "isActive",
      i.description,
      i.barcode,
      i.created_at         AS "createdAt",
      i.storage_location_id AS "storageLocationId",
      s.name               AS "supplierName",
      ws.sectionname       AS "storageLocationName",
      ws.bin_location      AS "storageLocation",
      ws.section_type      AS "storageType",
      COALESCE(stock_agg.total_stock, 0)::int AS "totalStock",
      COALESCE(stock_agg.total_reserved, 0)::int AS "reservedStock",
      COUNT(DISTINCT ib.id)::int                   AS "batchCount",
      MIN(CASE WHEN ib.expiry_date IS NOT NULL AND ib.quantity > 0
          THEN ib.expiry_date END)                 AS "nearestExpiry",
      (SELECT ib2.unit_cost FROM item_batches ib2
        INNER JOIN inventory_stock ist2 ON ist2.batch_id = ib2.id
        WHERE ib2.item_id = i.id
          AND ib2.warehouse_id = ANY($1::uuid[])
          AND ib2.unit_cost IS NOT NULL
          AND (ib2.expiry_date IS NULL OR ib2.expiry_date > CURRENT_DATE)
          AND ist2.quantity > 0
        ORDER BY ib2.expiry_date ASC NULLS LAST LIMIT 1)      AS "unitCost",
      (SELECT ib3.selling_price FROM item_batches ib3
        INNER JOIN inventory_stock ist3 ON ist3.batch_id = ib3.id
        WHERE ib3.item_id = i.id
          AND ib3.warehouse_id = ANY($1::uuid[])
          AND ib3.selling_price IS NOT NULL
          AND (ib3.expiry_date IS NULL OR ib3.expiry_date > CURRENT_DATE)
          AND ist3.quantity > 0
        ORDER BY ib3.expiry_date ASC NULLS LAST LIMIT 1)      AS "sellingPrice"
    FROM items i
    LEFT JOIN (
      SELECT 
        item_id,
        SUM(quantity) as total_stock,
        SUM(reserved_quantity) as total_reserved
      FROM inventory_stock
      WHERE warehouse_id = ANY($1::uuid[])
      GROUP BY item_id
    ) stock_agg ON stock_agg.item_id = i.id
    LEFT JOIN item_batches ib
      ON ib.item_id = i.id
      AND ib.warehouse_id = ANY($1::uuid[])
    LEFT JOIN suppliers s
      ON s.supplierid = i.supplier_id
    LEFT JOIN warehouse_sections ws
      ON ws.id = i.storage_location_id
    WHERE i.is_active = true
      ${workspaceFilter}
      AND (
        i.inventorycategory = 'pharmacy'
        OR i.inventory_category = 'pharmacy'
        OR stock_agg.item_id IS NOT NULL
      )
    AND (
        $2 = '%'
        OR i.name ILIKE $2
        OR i.generic_name ILIKE $2
        OR i.itemcode ILIKE $2
        OR i.item_code ILIKE $2
      )
    GROUP BY
      i.id, i.itemcode, i.name, i.generic_name, i.itemtype,
      i.inventorycategory, i.uom, i.min_level, i.reorder_level,
      i.max_level, i.controlled, i.manufacturer, i.packaging_type,
      i.package_size, i.tablets_per_pack, i.is_active,
      i.description, i.barcode, i.created_at, i.storage_location_id,
      s.supplierid, s.name, ws.id, ws.sectionname, ws.bin_location, ws.section_type,
      stock_agg.total_stock, stock_agg.total_reserved
    ORDER BY i.name`,
  queryParams
  );

  console.log('[Pharmacy Items API] Returning', result.rows.length, 'items for workspace', workspaceId);

  return NextResponse.json({ items: result.rows });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, form, strength, sellingprice, unitcost, workspaceid, initial_quantity, warehouseid, lotnumber, expirydate } = body;

    console.log('[Pharmacy Items API] Creating item:', name);

    // Check for existing item with same name, form, and strength
    const existingCheck = await pool.query(
      `SELECT id, is_active FROM items 
       WHERE name ILIKE $1 
         AND is_active = true
       LIMIT 1`,
      [name]
    );

    if (existingCheck.rows.length > 0) {
      console.log('[Pharmacy Items API] Item already exists:', existingCheck.rows[0].id);
      return NextResponse.json(
        { error: "Item with this name already exists", existingId: existingCheck.rows[0].id },
        { status: 409 }
      );
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create drug record first with form, strength, and unit
      let drugId = null;
      if (form || strength) {
        const drugResult = await client.query(
          `INSERT INTO drugs (workspaceid, name, genericname, form, strength, unit, isactive, createdat, updatedat)
           VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
           RETURNING drugid`,
          [workspaceid, name, name, form || 'tablet', strength || '', body.unit || 'mg']
        );
        drugId = drugResult.rows[0].drugid;
        console.log('[Pharmacy Items API] Created drug:', drugId);
      }

      // Create item linked to drug
      const itemResult = await client.query(
        `INSERT INTO items (name, item_code, item_type, inventory_category, uom, drug_id, is_active, workspace_id, created_at, updated_at)
         VALUES ($1, $2, 'medicine', 'pharmacy', $3, $4, true, $5, NOW(), NOW())
         RETURNING id`,
        [name, name.substring(0, 20).toUpperCase(), body.unit || 'tablet', drugId, workspaceid]
      );

      const itemId = itemResult.rows[0].id;
      console.log('[Pharmacy Items API] Created item:', itemId, 'linked to drug:', drugId);

      // Create batch if provided
      let batchId = null;
      if (lotnumber && expirydate) {
        const batchResult = await client.query(
          `INSERT INTO item_batches (item_id, lot_number, expiry_date, unit_cost, selling_price, quantity, warehouse_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING id`,
          [itemId, lotnumber, expirydate, unitcost || 0, sellingprice || 0, initial_quantity || 0, warehouseid]
        );
        batchId = batchResult.rows[0].id;
        console.log('[Pharmacy Items API] Created batch:', batchId);
      }

      // Create inventory_stock record with batch_id if batch was created
      if (initial_quantity && warehouseid) {
        await client.query(
          `INSERT INTO inventory_stock (item_id, batch_id, warehouse_id, quantity, reserved_quantity, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 0, NOW(), NOW())`,
          [itemId, batchId, warehouseid, initial_quantity]
        );
        console.log('[Pharmacy Items API] Created inventory_stock with quantity:', initial_quantity);
      }

      await client.query('COMMIT');
      return NextResponse.json({ id: itemId, batchId, message: "Item created successfully" });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[Pharmacy Items API] Error:', error);
    return NextResponse.json(
      { error: error.message || "Failed to create item" },
      { status: 500 }
    );
  }
}
