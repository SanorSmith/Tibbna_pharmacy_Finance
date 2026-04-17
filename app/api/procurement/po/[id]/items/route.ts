import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await pool.query(
    `SELECT poi.*, i.name AS "itemName", i.uom
     FROM purchase_order_items poi
     LEFT JOIN items i ON i.id = poi.itemid
     WHERE poi.poid = $1 ORDER BY poi.createdat`,
    [id]
  );
  return NextResponse.json(r.rows);
}
