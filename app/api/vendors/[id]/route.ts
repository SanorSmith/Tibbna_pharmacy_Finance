import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, code, contactname, phone, email, address, country, paymentterms, currency, notes } = await req.json();
  const r = await pool.query(
    `UPDATE vendors SET name=$1, code=$2, contactname=$3, phone=$4, email=$5, address=$6,
     country=$7, paymentterms=$8, currency=$9, notes=$10, updatedat=NOW()
     WHERE id=$11 RETURNING *`,
    [name, code||null, contactname||null, phone||null, email||null, address||null, country||null, paymentterms||null, currency||"USD", notes||null, id]
  );
  return NextResponse.json(r.rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await pool.query(`UPDATE vendors SET isactive=false, updatedat=NOW() WHERE id=$1`, [id]);
  return NextResponse.json({ success: true });
}
