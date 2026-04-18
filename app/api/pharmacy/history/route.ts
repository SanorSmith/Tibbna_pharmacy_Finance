import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const type = searchParams.get("type") || "ALL";
    const offset = (page - 1) * limit;

    // Get pharmacy warehouses
    const whRes = await pool.query(
      `SELECT id FROM warehouses WHERE warehouse_type = 'pharmacy' AND is_active = true`
    );

    if (!whRes.rows.length) {
      return NextResponse.json({ transactions: [], total: 0 });
    }

    const warehouseIds = whRes.rows.map((r: any) => r.id);
    const whArray = `{${warehouseIds.join(",")}}`;

    // Build WHERE clause based on type filter
    let typeFilter = "";
    if (type !== "ALL") {
      if (type === "STOCK_IN") typeFilter = "AND st.transaction_type = 'STOCK_IN'";
      else if (type === "STOCK_OUT") typeFilter = "AND st.transaction_type = 'STOCK_OUT'";
      else if (type === "WASTAGE") typeFilter = "AND st.transaction_type = 'WASTAGE'";
      else if (type === "TRANSFER") typeFilter = "AND st.transaction_type = 'TRANSFER'";
    }

    // Get transactions
    const result = await pool.query(
      `SELECT 
        st.id,
        st.transaction_type AS "transactionType",
        st.quantity,
        st.reference_type AS "referenceType",
        st.reference_id AS "referenceId",
        st.notes,
        st.created_by AS "createdBy",
        st.created_at AS "createdAt",
        i.name AS "itemName",
        i.itemcode,
        i.uom,
        w.name AS "warehouseName",
        ib.batch_number AS "batchNumber",
        ib.expiry_date AS "expiryDate"
      FROM stock_transactions st
      JOIN items i ON i.id = st.item_id
      JOIN warehouses w ON w.id = st.warehouse_id
      LEFT JOIN item_batches ib ON ib.id = st.batch_id
      WHERE st.warehouse_id = ANY($1::uuid[])
      ${typeFilter}
      ORDER BY st.created_at DESC
      LIMIT $2 OFFSET $3`,
      [whArray, limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total
      FROM stock_transactions st
      WHERE st.warehouse_id = ANY($1::uuid[])
      ${typeFilter}`,
      [whArray]
    );

    return NextResponse.json({
      rows: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
    });
  } catch (error) {
    console.error("[Pharmacy History GET]", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
