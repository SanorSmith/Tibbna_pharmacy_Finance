import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await req.json();

  if (status === "COMPLETED") {
    // Get GRN items and increase inventory stock
    const grnRes = await pool.query(`SELECT * FROM goods_receipt_notes WHERE id=$1`, [id]);
    const grn = grnRes.rows[0];
    const items = await pool.query(`SELECT * FROM grn_items WHERE grnid=$1`, [id]);

    for (const item of items.rows) {
      // Create batch
      const batchId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO item_batches (id, item_id, warehouse_id, batch_number, quantity, unit_cost, expiry_date, manufacture_date, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [batchId, item.itemid, grn.warehouseid, item.batchnumber??null, item.receivedqty, item.unitprice??null, item.expirydate??null, item.manufacturedate??null]
      );
      // Update inventory stock
      await pool.query(
        `INSERT INTO inventory_stock (id, item_id, warehouse_id, batch_id, quantity, reserved_quantity, last_updated)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 0, NOW())
         ON CONFLICT (item_id, warehouse_id) DO UPDATE SET quantity = inventory_stock.quantity + $4, last_updated = NOW()`,
        [item.itemid, grn.warehouseid, batchId, item.receivedqty]
      );
      // Log transaction
      await pool.query(
        `INSERT INTO stock_transactions (id, item_id, warehouse_id, batch_id, transaction_type, quantity, reference_type, reference_id, notes, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'STOCK_IN', $4, 'GRN', $5, 'GRN receipt', NOW())`,
        [item.itemid, grn.warehouseid, batchId, item.receivedqty, id]
      );
    }
  }

  await pool.query(`UPDATE goods_receipt_notes SET status=$1, updatedat=NOW() WHERE id=$2`, [status, id]);
  return NextResponse.json({ success: true });
}
