import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await pool.query(
    `SELECT gi.*, i.name AS "itemName", i.uom
     FROM grn_items gi
     LEFT JOIN items i ON i.id = gi.itemid
     WHERE gi.grnid = $1 ORDER BY gi.createdat`,
    [id]
  );
  return NextResponse.json(r.rows);
}
