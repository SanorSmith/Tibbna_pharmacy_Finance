import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceid: string; id: string } }
) {
  try {
    const result = await pool.query(
      `SELECT * FROM vendor_payments
       WHERE vendor_id = $1
       ORDER BY payment_date DESC`,
      [params.id]
    );
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching vendor payments:", error);
    return NextResponse.json({ error: "Failed to fetch vendor payments" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { workspaceid: string; id: string } }
) {
  try {
    const body = await req.json();
    const { paymentReference, amount, paymentDate, paymentMethod, notes } = body;

    const result = await pool.query(
      `INSERT INTO vendor_payments (vendor_id, payment_reference, amount, payment_date, payment_method, status, notes, createdat)
       VALUES ($1, $2, $3, $4, $5, 'completed', $6, NOW())
       RETURNING *`,
      [params.id, paymentReference, amount, paymentDate, paymentMethod, notes]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error("Error adding vendor payment:", error);
    return NextResponse.json({ error: "Failed to add vendor payment" }, { status: 500 });
  }
}
