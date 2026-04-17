import { NextRequest, NextResponse } from "next/server";


const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const WORKSPACE_ID = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const result = await pool.query(
    `SELECT
      s.supplierid     AS id,
      s.name,
      s.contactname    AS "contactPerson",
      s.email,
      s.phone,
      s.address,
      s.isactive       AS "isActive",
      s.createdat      AS "createdAt",
      COUNT(DISTINCT ds.drugid)::int AS "drugCount"
    FROM suppliers s
    LEFT JOIN drug_suppliers ds ON ds.supplierid = s.supplierid
    WHERE s.isactive = true
      AND ($1 = '' OR s.name ILIKE $2 OR s.contactname ILIKE $2 OR s.email ILIKE $2 OR s.phone ILIKE $2)
    GROUP BY s.supplierid, s.name, s.contactname, s.email, s.phone, s.address, s.isactive, s.createdat
    ORDER BY s.name`,
    [search, `%${search}%`]
  );
  return NextResponse.json(result.rows);
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
