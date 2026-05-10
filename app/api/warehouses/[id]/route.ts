import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await pool.query(`SELECT * FROM warehouses WHERE id = $1`, [id]);
  if (!r.rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(r.rows[0]);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, warehouse_type, location, manager, description } = await req.json();
  const r = await pool.query(
    `UPDATE warehouses SET name=$1, warehouse_type=$2, location=$3, manager=$4, description=$5, updated_at=NOW() WHERE id=$6 RETURNING *`,
    [name, warehouse_type, location ?? null, manager ?? null, description ?? null, id]
  );
  if (!r.rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(r.rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await pool.query(`UPDATE warehouses SET is_active=false, updated_at=NOW() WHERE id=$1`, [id]);
  return NextResponse.json({ success: true });
}