import { Pool } from "pg";

import { NextRequest, NextResponse } from "next/server";


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const WORKSPACE_ID = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("search") ?? "";
    const result = await pool.query(
      `SELECT
        v.id,
        v.name,
        v.contact_person AS "contactPerson",
        v.email,
        v.phone,
        v.address,
        v.is_active AS "isActive",
        v.created_at AS "createdAt",
        0 AS "drugCount"
      FROM vendors v
      WHERE v.is_active = true
        AND ($1 = '' OR v.name ILIKE $2 OR v.contact_person ILIKE $2 OR v.email ILIKE $2 OR v.phone ILIKE $2)
      ORDER BY v.name`,
      [search, `%${search}%`]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json([], { status: 200 }); // Return empty array on error
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, contactPerson, email, phone, address } = body;
  if (!name?.trim())
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const result = await pool.query(
    `INSERT INTO suppliers (supplierid, workspaceid, name, contactname, email, phone, address, isactive, createdat)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
     RETURNING supplierid AS id, name, contactname AS "contactPerson", email, phone, address`,
    [crypto.randomUUID(), WORKSPACE_ID, name, contactPerson ?? null, email ?? null, phone ?? null, address ?? null]
  );
  return NextResponse.json(result.rows[0]);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, name, contactPerson, email, phone, address } = body;
  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });
  const result = await pool.query(
    `UPDATE suppliers SET
      name        = COALESCE($1, name),
      contactname = COALESCE($2, contactname),
      email       = COALESCE($3, email),
      phone       = COALESCE($4, phone),
      address     = COALESCE($5, address)
    WHERE supplierid = $6
    RETURNING supplierid AS id, name, contactname AS "contactPerson", email, phone, address`,
    [name, contactPerson, email, phone, address, id]
  );
  if (!result.rows.length)
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await pool.query(`UPDATE suppliers SET isactive = false WHERE supplierid = $1`, [id]);
  return NextResponse.json({ success: true });
}
