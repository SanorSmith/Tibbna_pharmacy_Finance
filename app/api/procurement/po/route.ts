import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET() {
  const r = await pool.query(
    `SELECT po.*, v.name AS "vendorName", w.name AS "warehouseName"
     FROM purchase_orders po
     LEFT JOIN vendors v ON v.id::text = po.vendorid::text
     LEFT JOIN warehouses w ON w.id = po.warehouseid
     ORDER BY po.createdat DESC`
  );
  return NextResponse.json(r.rows);
}

export async function POST(req: NextRequest) {
  const { prid, warehouseid, vendorid, notes } = await req.json();
  const poNum = `PO-${Date.now().toString().slice(-8)}`;
  const r = await pool.query(
    `INSERT INTO purchase_orders (id, ponumber, vendorid, prid, warehouseid, status, orderdate, notes, createdat, updatedat)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 'DRAFT', NOW(), $5, NOW(), NOW())
     RETURNING *`,
    [poNum, vendorid, prid, warehouseid, notes ?? null]
  );
  if (prid) {
    await pool.query(
      `INSERT INTO purchase_order_items (id, poid, itemid, orderedqty, receivedqty, unitprice, totalamount, createdat)
       SELECT gen_random_uuid(), $1, pri.itemid, pri.requestedqty, 0,
              COALESCE(pri.estimatedprice,0),
              pri.requestedqty * COALESCE(pri.estimatedprice,0), NOW()
       FROM purchase_requisition_items pri WHERE pri.prid = $2`,
      [r.rows[0].id, prid]
    );
    await pool.query(`UPDATE purchase_requisitions SET status='ORDERED', updatedat=NOW() WHERE id=$1`, [prid]);
  }
  return NextResponse.json(r.rows[0]);
}
