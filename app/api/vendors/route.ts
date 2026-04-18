import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const r = await pool.query(
    `SELECT * FROM vendors
     WHERE is_active = true
       AND ($1 = '' OR name ILIKE $1 OR contact_person ILIKE $1 OR email ILIKE $1 OR code ILIKE $1)
     ORDER BY name`,
    [`%${search}%`]
  );
  return NextResponse.json(r.rows);
}

export async function POST(req: NextRequest) {
  const { name, code, contactPerson, phone, email, address, country, paymentTerms, currency, notes } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error:"Name required" }, { status:400 });
  const r = await pool.query(
    `INSERT INTO vendors (id, name, code, contact_person, phone, email, address, country, payment_terms, currency, notes, is_active, created_at, updated_at)
     VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,NOW(),NOW()) RETURNING *`,
    [name, code||null, contactPerson||null, phone||null, email||null, address||null, country||null, paymentTerms||null, currency||"USD", notes||null]
  );
  return NextResponse.json(r.rows[0]);
}
