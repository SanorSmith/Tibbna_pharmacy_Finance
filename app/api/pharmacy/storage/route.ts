import { Pool } from "pg";

import { NextRequest, NextResponse } from "next/server";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const WS = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("search") ?? "";
    const r = await pool.query(
      `SELECT 
        ws.id,
        ws.sectionname as name,
        ws.binlocation as location,
        ws.sectiontype as type,
        ws.temperaturecontrolled as temperature_controlled,
        w.name as warehouse_name
      FROM warehouse_sections ws
      JOIN warehouses w ON w.id = ws.warehouse_id
      WHERE w.warehouse_type = 'pharmacy'
        AND ($1 = '' OR ws.sectionname ILIKE $1 OR ws.binlocation ILIKE $1)
      ORDER BY ws.sectionname`,
      [`%${search}%`]
    );
    return NextResponse.json(r.rows);
  } catch (error) {
    console.error("Error fetching storage:", error);
    return NextResponse.json([], { status: 200 });
  }
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
