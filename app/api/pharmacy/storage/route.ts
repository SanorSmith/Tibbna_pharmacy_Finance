import { Pool } from "pg";

import { NextRequest, NextResponse } from "next/server";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const WS = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const r = await pool.query(
    `SELECT * FROM pharmacy_storage_locations WHERE workspace_id=$1 AND isactive=true
     AND ($2='' OR name ILIKE $2 OR location ILIKE $2) ORDER BY name`,
    [WS, `%${search}%`]
  );
  return NextResponse.json(r.rows);
}

export async function POST(req: NextRequest) {
  const { name, location, type, temperature, notes } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error:"Name required" }, { status:400 });
  const r = await pool.query(
    `INSERT INTO pharmacy_storage_locations (id,workspace_id,name,location,type,temperature,notes,isactive,createdat,updatedat)
     VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,true,NOW(),NOW()) RETURNING *`,
    [WS, name, location||null, type||"shelf", temperature||null, notes||null]
  );
  return NextResponse.json(r.rows[0]);
}
