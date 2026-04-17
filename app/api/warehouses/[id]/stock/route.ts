import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await pool.query(
    `SELECT
      ist.id, ist.quantity, ist.reserved_quantity,
      i.name AS item_name, i.itemcode, i.uom,
      i.reorder_level
    FROM inventory_stock ist
    JOIN items i ON i.id = ist.item_id
    WHERE ist.warehouse_id = $1
      AND i.is_active = true
    ORDER BY i.name`,
    [id]
  );
  return NextResponse.json(r.rows);
}
