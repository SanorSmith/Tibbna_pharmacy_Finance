import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await pool.query(
    `SELECT pri.*, i.name AS "itemName", i.uom
     FROM purchase_requisition_items pri
     LEFT JOIN items i ON i.id = pri.itemid
     WHERE pri.prid = $1 ORDER BY pri.createdat`,
    [id]
  );
  return NextResponse.json(r.rows);
}
