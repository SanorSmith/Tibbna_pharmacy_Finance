import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import crypto from "crypto";
import { db } from "@/lib/db";
import { stockTransactions } from "@/lib/db/schema";

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
  const { itemId, warehouseId, batchId, adjustmentQty, reason, createdBy, unitCost, sellingPrice, batchNumber, expiryDate, itemType, manufacturer } = body;

  if (!itemId || !warehouseId || adjustmentQty == null || adjustmentQty === "" || !reason)
    return NextResponse.json({ error: "Item, warehouse, quantity and reason are required" }, { status: 400 });

  // Verify item exists
  const itemCheck = await pool.query(
    `SELECT id, name FROM items WHERE id = $1`,
    [itemId]
  );
  if (itemCheck.rows.length === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const adjId = crypto.randomUUID();

  // Update item type and manufacturer if provided
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (itemType) {
    updates.push(`itemtype = $${paramCount++}`);
    values.push(itemType);
  }
  if (manufacturer) {
    updates.push(`manufacturer = $${paramCount++}`);
    values.push(manufacturer);
  }

  if (updates.length > 0) {
    values.push(itemId);
    await pool.query(
      `UPDATE items SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );
  }

  await pool.query(
    `INSERT INTO stock_adjustments (id, item_id, warehouse_id, batch_id, quantity, reason, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [adjId, itemId, warehouseId, batchId ?? null, parseInt(adjustmentQty), reason, createdBy ?? "Pharmacy"]
  );

  // Update or insert inventory_stock
  const checkStock = await pool.query(
    `SELECT id, quantity FROM inventory_stock 
     WHERE item_id = $1 AND warehouse_id = $2 AND ($3::uuid IS NULL OR batch_id = $3)
     LIMIT 1`,
    [itemId, warehouseId, batchId ?? null]
  );

  if (checkStock.rows.length > 0) {
    // Update existing stock
    await pool.query(
      `UPDATE inventory_stock 
       SET quantity = GREATEST(0, quantity + $1)
       WHERE id = $2`,
      [parseInt(adjustmentQty), checkStock.rows[0].id]
    );
  } else {
    // Insert new stock record
    await pool.query(
      `INSERT INTO inventory_stock (id, item_id, warehouse_id, batch_id, quantity, reserved_quantity)
       VALUES (gen_random_uuid(), $1, $2, $3, GREATEST(0, $4), 0)`,
      [itemId, warehouseId, batchId ?? null, parseInt(adjustmentQty)]
    );
  }

  // Update or create batch with pricing if provided
  let createdBatchId = batchId;
  if (unitCost !== null || sellingPrice !== null) {
    const batchCheck = await pool.query(
      `SELECT id FROM item_batches 
       WHERE item_id = $1 AND warehouse_id = $2
       LIMIT 1`,
      [itemId, warehouseId]
    );

    if (batchCheck.rows.length > 0) {
      // Update existing batch pricing
      await pool.query(
        `UPDATE item_batches 
         SET unit_cost = COALESCE($1, unit_cost),
             selling_price = COALESCE($2, selling_price)
         WHERE id = $3`,
        [unitCost, sellingPrice, batchCheck.rows[0].id]
      );
      createdBatchId = batchCheck.rows[0].id;
    } else {
      // Create new batch with pricing
      const batchResult = await pool.query(
        `INSERT INTO item_batches (id, item_id, warehouse_id, batch_number, quantity, unit_cost, selling_price)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [itemId, warehouseId, `BATCH-${Date.now()}`, parseInt(adjustmentQty), unitCost, sellingPrice]
      );
      createdBatchId = batchResult.rows[0].id;
    }

    // Update inventory_stock with batch_id if it was NULL
    if (createdBatchId && (!batchId || batchId === null)) {
      await pool.query(
        `UPDATE inventory_stock 
         SET batch_id = $1
         WHERE item_id = $2 AND warehouse_id = $3 AND batch_id IS NULL`,
        [createdBatchId, itemId, warehouseId]
      );
    }
  }

  // Log transaction (use STOCK_IN for positive, STOCK_OUT for negative)
  const transactionType = parseInt(adjustmentQty) > 0 ? 'STOCK_IN' : 'STOCK_OUT';
  await pool.query(
    `INSERT INTO stock_transactions (id, item_id, warehouse_id, batch_id, transaction_type, quantity, notes, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [crypto.randomUUID(), itemId, warehouseId, batchId ?? null, transactionType, Math.abs(parseInt(adjustmentQty)), reason, createdBy ?? "Pharmacy"]
  );

  return NextResponse.json({ success: true, id: adjId });
}
