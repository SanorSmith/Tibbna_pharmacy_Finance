import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const WS = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? "";
  const r = await pool.query(
    `SELECT o.*,
      (SELECT COUNT(*) FROM shop_order_items oi WHERE oi.orderid = o.orderid)::int AS itemcount,
      u1.name AS orderedbyname,
      u2.name AS createdbyname
     FROM shop_orders o
     LEFT JOIN users u1 ON o.orderedby = u1.userid
     LEFT JOIN users u2 ON o.createdby = u2.userid
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

  // Find the user by name (createdBy)
  if (!createdBy) {
    return NextResponse.json({ error: "User name (createdBy) is required" }, { status: 400 });
  }

  const userResult = await pool.query(
    `SELECT userid FROM users WHERE name ILIKE $1 LIMIT 1`,
    [createdBy]
  );
  const userId = userResult.rows[0]?.userid;

  if (!userId) {
    return NextResponse.json({ error: `User "${createdBy}" not found` }, { status: 404 });
  }

  const r = await pool.query(
    `INSERT INTO shop_orders (orderid, workspaceid, ordernumber, clientname, orderedby, createdby, totalcost, status, createdat)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $4, $5, 'PENDING', NOW()) RETURNING *`,
    [WS, orderNum, supplier || null, userId, totalAmount||0]
  );
  const orderId = r.rows[0].orderid;
  
  for (const item of items) {
    await pool.query(
      `INSERT INTO shop_order_items (itemid, orderid, itemname, itemtype, number, unitprice, totalPrice, createdat)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [crypto.randomUUID(), orderId, item.itemName||null, item.itemType||null, item.quantity||1, item.unitCost||null, (item.quantity||1) * (item.unitCost||0)]
    );
  }
  return NextResponse.json(r.rows[0]);
}
