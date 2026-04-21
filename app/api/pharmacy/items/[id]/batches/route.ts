import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await pool.query(
    `SELECT
      ib.id,
      ib.batch_number     AS "batchNumber",
      ib.quantity,
      ib.unit_cost        AS "unitCost",
      ib.selling_price    AS "sellingPrice",
      ib.expiry_date      AS "expiryDate",
      ib.created_at       AS "createdAt",
      w.name              AS "warehouseName"
    FROM item_batches ib
    LEFT JOIN warehouses w ON w.id = ib.warehouse_id
    WHERE ib.item_id = $1
    ORDER BY ib.expiry_date ASC NULLS LAST`,
    [id]
  );

  return NextResponse.json(result.rows);
}
