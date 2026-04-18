import { Pool } from "pg";
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";


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
  const { name, code, contactPerson, email, phone, address, category, type } = body;
  if (!name?.trim())
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  
  // Get authenticated user
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  // Generate defaults for all required NOT NULL fields
  const supplierCode = code || `SUP-${Date.now().toString().slice(-8)}`;
  const supplierCategory = category || "general";
  const supplierType = type || "vendor";
  
  try {
    const result = await pool.query(
      `INSERT INTO suppliers (supplierid, workspaceid, name, code, contactperson, email, phonenumber, addressline1, category, type, createdby, isactive, createdat)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW())
       RETURNING supplierid AS id, name, code, contactperson AS "contactPerson", email, phonenumber AS phone, addressline1 AS address, category, type`,
      [crypto.randomUUID(), WORKSPACE_ID, name, supplierCode, contactPerson ?? null, email ?? null, phone ?? null, address ?? null, supplierCategory, supplierType, user.userid]
    );
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating supplier:", error);
    return NextResponse.json({ error: error.message || "Failed to create supplier" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, name, contactPerson, email, phone, address } = body;
  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });
  const result = await pool.query(
    `UPDATE suppliers SET
      name         = COALESCE($1, name),
      contactperson = COALESCE($2, contactperson),
      email        = COALESCE($3, email),
      phonenumber  = COALESCE($4, phonenumber),
      addressline1 = COALESCE($5, addressline1)
    WHERE supplierid = $6
    RETURNING supplierid AS id, name, contactperson AS "contactPerson", email, phonenumber AS phone, addressline1 AS address`,
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
