import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: NextRequest) {
  const whRes = await pool.query(`SELECT id FROM warehouses WHERE warehouse_type = 'pharmacy' AND is_active = true`);
  if (!whRes.rows.length) return NextResponse.json([]);
  const whArray = `{${whRes.rows.map((r: any) => r.id).join(",")}}`;

  const result = await pool.query(
    `SELECT
      sa.id,
      sa.quantity            AS "adjustmentQty",
      sa.reason,
      sa.created_by          AS "createdBy",
      sa.created_at          AS "createdAt",
      i.name                 AS "itemName",
      i.itemcode,
      i.uom,
      ib.batch_number        AS "batchNumber",
      w.name                 AS "warehouseName"
    FROM stock_adjustments sa
    LEFT JOIN items i         ON i.id = sa.item_id
    LEFT JOIN item_batches ib ON ib.id = sa.batch_id
    LEFT JOIN warehouses w    ON w.id = sa.warehouse_id
    WHERE sa.warehouse_id = ANY($1::uuid[])
    ORDER BY sa.created_at DESC
    LIMIT 100`,
    [whArray]
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { itemId, warehouseId, batchId, adjustmentQty, reason, createdBy } = body;

  if (!itemId || !warehouseId || !adjustmentQty || !reason)
    return NextResponse.json({ error: "Item, warehouse, quantity and reason are required" }, { status: 400 });

  const adjId = crypto.randomUUID();

  await pool.query(
    `INSERT INTO stock_adjustments (id, item_id, warehouse_id, batch_id, quantity, reason, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [adjId, itemId, warehouseId, batchId ?? null, parseInt(adjustmentQty), reason, createdBy ?? "Pharmacy"]
  );

  // Update or insert inventory_stock (UPSERT)
  await pool.query(
    `INSERT INTO inventory_stock (id, item_id, warehouse_id, batch_id, quantity, reserved_quantity)
     VALUES (gen_random_uuid(), $1, $2, $3, GREATEST(0, $4), 0)
     ON CONFLICT (item_id, warehouse_id, batch_id)
     DO UPDATE SET quantity = GREATEST(0, inventory_stock.quantity + $4)`,
    [itemId, warehouseId, batchId ?? null, parseInt(adjustmentQty)]
  );

  // Log transaction
  await pool.query(
    `INSERT INTO stock_transactions (id, item_id, warehouse_id, batch_id, transaction_type, quantity, notes, created_by, created_at)
     VALUES ($1, $2, $3, $4, 'ADJUSTMENT', $5, $6, $7, NOW())`,
    [crypto.randomUUID(), itemId, warehouseId, batchId ?? null, Math.abs(parseInt(adjustmentQty)), reason, createdBy ?? "Pharmacy"]
  );

  return NextResponse.json({ success: true, id: adjId });
}
