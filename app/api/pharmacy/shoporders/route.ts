import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const WS = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? "";
  const r = await pool.query(
    `SELECT o.*, 
      (SELECT COUNT(*) FROM pharmacy_order_items oi WHERE oi.orderid = o.id)::int AS itemcount
     FROM pharmacy_shop_orders o
     WHERE o.workspaceid = $1
       AND ($2 = '' OR $2 = 'ALL' OR o.status = $2)
     ORDER BY o.createdat DESC`,
    [WS, status]
  );
  return NextResponse.json(r.rows);
}

export async function POST(req: NextRequest) {
  const { supplier, createdBy, items, totalAmount } = await req.json();
  if (!items?.length) return NextResponse.json({ error: "No items" }, { status: 400 });
  
  const orderNum = `ORD-${Date.now().toString().slice(-8)}`;
  const r = await pool.query(
    `INSERT INTO pharmacy_shop_orders (id, workspaceid, ordernumber, supplier, createdby, totalamount, status, createdat, updatedat)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'PENDING', NOW(), NOW()) RETURNING *`,
    [WS, orderNum, supplier||null, createdBy||null, totalAmount||0]
  );
  const orderId = r.rows[0].id;
  
  for (const item of items) {
    await pool.query(
      `INSERT INTO pharmacy_order_items (id, orderid, itemid, itemname, quantity, unitcost, suppliername, createdat)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())`,
      [orderId, item.itemId, item.itemName||null, item.quantity||0, item.unitCost||null, item.supplierName||null]
    );
  }
  return NextResponse.json(r.rows[0]);
}
