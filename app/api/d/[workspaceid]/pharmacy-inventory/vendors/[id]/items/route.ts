import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceid: string; id: string } }
) {
  try {
    const result = await pool.query(
      `SELECT vi.*, i.name as item_name, i.itemcode as item_code, i.uom
       FROM vendor_items vi
       LEFT JOIN items i ON i.id = vi.item_id
       WHERE vi.vendor_id = $1
       ORDER BY i.name`,
      [params.id]
    );
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching vendor items:", error);
    return NextResponse.json({ error: "Failed to fetch vendor items" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { workspaceid: string; id: string } }
) {
  try {
    const body = await req.json();
    const { itemId, isPrimarySupplier, leadTimeDays, minOrderQty, unitPrice } = body;

    const result = await pool.query(
      `INSERT INTO vendor_items (vendor_id, item_id, is_primary_supplier, lead_time_days, min_order_qty, unit_price, createdat, updatedat)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (vendor_id, item_id) 
       DO UPDATE SET
         is_primary_supplier = $3,
         lead_time_days = $4,
         min_order_qty = $5,
         unit_price = $6,
         updatedat = NOW()
       RETURNING *`,
      [params.id, itemId, isPrimarySupplier || false, leadTimeDays || 0, minOrderQty || 1, unitPrice || '0']
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error("Error adding vendor item:", error);
    return NextResponse.json({ error: "Failed to add vendor item" }, { status: 500 });
  }
}
