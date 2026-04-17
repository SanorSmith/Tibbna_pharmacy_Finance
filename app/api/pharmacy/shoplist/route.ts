import { NextRequest, NextResponse } from "next/server";


const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// GET - fetch low stock items for shop list
export async function GET(req: NextRequest) {
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
      i.generic_name      AS "genericName",
      i.uom,
      i.min_level         AS "minLevel",
      i.reorder_level     AS "reorderLevel",
      i.max_level         AS "maxLevel",
      i.manufacturer,
      COALESCE(SUM(ist.quantity), 0)::int AS "currentStock",
      (SELECT ib2.unit_cost FROM item_batches ib2
        WHERE ib2.item_id = i.id
          AND ib2.warehouse_id = ANY($1::uuid[])
          AND ib2.unit_cost IS NOT NULL
        ORDER BY ib2.created_at DESC LIMIT 1) AS "lastUnitCost"
    FROM items i
    LEFT JOIN inventory_stock ist
      ON ist.item_id = i.id
      AND ist.warehouse_id = ANY($1::uuid[])
    WHERE i.is_active = true
      AND i.inventorycategory = 'pharmacy'
    GROUP BY i.id, i.itemcode, i.name, i.generic_name, i.uom,
             i.min_level, i.reorder_level, i.max_level, i.manufacturer
    HAVING COALESCE(SUM(ist.quantity), 0) <= i.reorder_level
    ORDER BY COALESCE(SUM(ist.quantity), 0) ASC`,
    [whArray]
  );

  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { items, notes } = body;

  const WAREHOUSE_ID = "22222222-0000-0000-0000-000000000002";
  const prId = crypto.randomUUID();
  const prNumber = `PR-PHARM-${Date.now()}`;

  await pool.query(
    `INSERT INTO purchase_requisitions
      (id, prnumber, warehouseid, requestedby, status, notes, createdat, updatedat)
     VALUES ($1, $2, $3, 'Pharmacy System', 'draft', $4, NOW(), NOW())`,
    [prId, prNumber, WAREHOUSE_ID, notes ?? "Auto-generated from pharmacy shop list"]
  );

  for (const item of items) {
    await pool.query(
      `INSERT INTO purchase_requisition_items
        (id, prid, itemid, requestedqty, estimatedprice, notes, createdat)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        crypto.randomUUID(),
        prId,
        item.itemId,
        item.quantity,
        item.unitCost ?? null,
        item.notes ?? null,
      ]
    );
  }

  return NextResponse.json({ success: true, prId, prNumber });
}