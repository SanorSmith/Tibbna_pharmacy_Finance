import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function PATCH(req: NextRequest, { params }: { params: { orderid: string } }) {
  const { orderid } = params;
  const { status } = await req.json();

  if (!status) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 });
  }

  const r = await pool.query(
    `UPDATE shop_orders SET status = $1 WHERE orderid = $2 RETURNING *`,
    [status, orderid]
  );

  if (r.rows.length === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(r.rows[0]);
}
