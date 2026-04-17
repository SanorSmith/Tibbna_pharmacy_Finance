import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";

  const whRes = await pool.query(
    `SELECT id FROM warehouses WHERE warehouse_type = 'pharmacy' AND is_active = true`
  );

  if (!whRes.rows.length) return NextResponse.json([]);

  const ids = whRes.rows.map((r: any) => r.id);
  const whArray = `{${ids.join(",")}}`;

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
      i.is_active          AS "isActive",
      i.description,
      i.barcode,
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
    WHERE i.is_active = true
      AND (
        i.inventorycategory = 'pharmacy'
        OR ist.warehouse_id = ANY($1::uuid[])
      )
    AND (
        $2 = '%'
        OR i.name ILIKE $2
        OR i.generic_name ILIKE $2
        OR i.itemcode ILIKE $2
      )
    GROUP BY
      i.id, i.itemcode, i.name, i.generic_name, i.itemtype,
      i.inventorycategory, i.uom, i.min_level, i.reorder_level,
      i.max_level, i.controlled, i.manufacturer, i.is_active,
      i.description, i.barcode
    ORDER BY i.name`,
  [whArray, search.trim() === "" ? "%" : `%${search}%`]
  );

  return NextResponse.json(result.rows);
}
