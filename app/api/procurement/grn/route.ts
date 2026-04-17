import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET() {
  const r = await pool.query(
    `SELECT g.*, v.name AS "vendorName", w.name AS "warehouseName"
     FROM goods_receipt_notes g
     LEFT JOIN vendors v ON v.id::text = g.vendorid::text
     LEFT JOIN warehouses w ON w.id = g.warehouseid
     ORDER BY g.createdat DESC`
  );
  return NextResponse.json(r.rows);
}
