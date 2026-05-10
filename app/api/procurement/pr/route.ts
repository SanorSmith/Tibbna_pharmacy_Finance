import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET() {
  const r = await pool.query(
    `SELECT pr.*, w.name AS "warehouseName",
      (SELECT COUNT(*) FROM purchase_requisition_items pri WHERE pri.prid = pr.id)::int AS "itemCount"
     FROM purchase_requisitions pr
     LEFT JOIN warehouses w ON w.id = pr.warehouseid
     ORDER BY pr.createdat DESC`
  );
  return NextResponse.json(r.rows);
}
