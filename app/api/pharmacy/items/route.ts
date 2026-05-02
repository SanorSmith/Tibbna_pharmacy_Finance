import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const workspaceId = req.nextUrl.searchParams.get("workspaceId") ?? "";
  const source = req.nextUrl.searchParams.get("source") ?? "global"; // 'global' or 'inventory'

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
      i.itemtype           AS "itemType",
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
      COALESCE(SUM(ist.quantity), 0)::int          AS "totalStock",
      COALESCE(SUM(ist.reserved_quantity), 0)::int AS "reservedStock",
      COUNT(DISTINCT ib.id)::int                   AS "batchCount",
      MIN(CASE WHEN ib.expiry_date IS NOT NULL AND ib.quantity > 0
          THEN ib.expiry_date END)                 AS "nearestExpiry",
      (SELECT ib2.unit_cost FROM item_batches ib2
        WHERE ib2.item_id = i.id
          AND ib2.warehouse_id = ANY($1::uuid[])
          AND ib2.unit_cost IS NOT NULL
        ORDER BY ib2.created_at DESC LIMIT 1)      AS "unitCost",
      (SELECT ib3.selling_price FROM item_batches ib3
        WHERE ib3.item_id = i.id
          AND ib3.warehouse_id = ANY($1::uuid[])
          AND ib3.selling_price IS NOT NULL
        ORDER BY ib3.created_at DESC LIMIT 1)      AS "sellingPrice"
    FROM items i
    LEFT JOIN inventory_stock ist
      ON ist.item_id = i.id
      AND ist.warehouse_id = ANY($1::uuid[])
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
        OR ist.warehouse_id IS NOT NULL
      )
      AND (
        -- Only show items that have inventory records (batches or stock)
        EXISTS (
          SELECT 1 FROM item_batches ib_check
          WHERE ib_check.item_id = i.id
            AND ib_check.warehouse_id = ANY($1::uuid[])
        )
        OR EXISTS (
          SELECT 1 FROM inventory_stock ist_check
          WHERE ist_check.item_id = i.id
            AND ist_check.warehouse_id = ANY($1::uuid[])
        )
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
      s.supplierid, s.name, ws.id, ws.sectionname, ws.bin_location, ws.section_type
    ORDER BY i.name`,
  queryParams
  );

  console.log('[Pharmacy Items API] Returning', result.rows.length, 'items for workspace', workspaceId);

  return NextResponse.json({ items: result.rows });
}
