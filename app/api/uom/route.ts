import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  const r = await pool.query(
    `SELECT uc.*, i.name AS "itemName"
     FROM unit_conversions uc
     LEFT JOIN items i ON i.id = uc.item_id
     ORDER BY i.name, uc.from_uom`
  );
  return NextResponse.json(r.rows);
}

export async function POST(req: NextRequest) {
  const { item_id, from_uom, to_uom, factor } = await req.json();
  if (!from_uom||!to_uom||!factor) return NextResponse.json({ error: "from_uom, to_uom and factor required" }, { status:400 });
  const r = await pool.query(
    `INSERT INTO unit_conversions (id, item_id, from_uom, to_uom, factor, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) RETURNING *`,
    [item_id||null, from_uom, to_uom, factor]
  );
  return NextResponse.json(r.rows[0]);
}
