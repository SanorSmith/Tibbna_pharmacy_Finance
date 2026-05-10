import { Pool } from "pg";

import { NextRequest, NextResponse } from "next/server";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const WS = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("search") ?? "";
    const r = await pool.query(
      `SELECT * FROM manufacturers
       WHERE workspace_id = $1 AND isactive = true
         AND ($2 = '' OR name ILIKE $2 OR country ILIKE $2 OR code ILIKE $2)
       ORDER BY name`,
      [WS, `%${search}%`]
    );
    return NextResponse.json(r.rows);
  } catch (error) {
    console.error("Error fetching manufacturers:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const { name, code, country, contactname, phone, email, address, website, license_number, product_types, notes } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const r = await pool.query(
    `INSERT INTO manufacturers (id, workspace_id, name, code, country, contactname, phone, email, address, website, license_number, product_types, notes, isactive, createdat, updatedat)
     VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,NOW(),NOW()) RETURNING *`,
    [WS, name, code||null, country||null, contactname||null, phone||null, email||null, address||null, website||null, license_number||null, product_types||null, notes||null]
  );
  return NextResponse.json(r.rows[0]);
}
