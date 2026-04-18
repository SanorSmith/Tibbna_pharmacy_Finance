import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: NextRequest) {
  const tab      = req.nextUrl.searchParams.get("tab")      ?? "stock";
  const dateFrom = req.nextUrl.searchParams.get("dateFrom") ?? "";
  const dateTo   = req.nextUrl.searchParams.get("dateTo")   ?? "";
  const category = req.nextUrl.searchParams.get("category") ?? "all";
  const type     = req.nextUrl.searchParams.get("type")     ?? "stock";

  if (tab === "stock" || type === "stock") {
    const r = await pool.query(
      `SELECT
        i.id, 
        i.name, 
        i.generic_name AS "genericName", 
        i.itemcode, 
        i.uom,
        i.inventorycategory AS category,
        i.reorder_level AS "reorderLevel",
        COALESCE(SUM(ist.quantity),0)::int          AS "totalStock",
        COALESCE(SUM(ist.reserved_quantity),0)::int AS "reservedStock"
      FROM items i
      LEFT JOIN inventory_stock ist ON ist.item_id = i.id
      WHERE i.is_active = true
        ${category !== "all" && category !== "pharmacy" ? `AND i.inventorycategory = '${category}'` : ""}
      GROUP BY i.id, i.name, i.generic_name, i.itemcode, i.uom, i.inventorycategory, i.reorder_level
      ORDER BY i.inventorycategory, i.name`
    );
    return NextResponse.json(r.rows);
  }

  if (tab === "consumption") {
    const r = await pool.query(
      `SELECT
        i.name AS "itemName", i.itemcode,
        st.transaction_type AS "transactionType",
        SUM(st.quantity)::int AS "totalQty",
        COUNT(*)::int AS "txCount",
        w.name AS "warehouseName",
        MAX(st.created_at) AS "lastActivity"
      FROM stock_transactions st
      JOIN items i ON i.id = st.item_id
      LEFT JOIN warehouses w ON w.id = st.warehouse_id
      WHERE st.transaction_type IN ('STOCK_OUT','DISPENSE','WASTAGE','ADJUSTMENT')
        AND st.created_at BETWEEN $1 AND $2
      GROUP BY i.name, i.itemcode, st.transaction_type, w.name
      ORDER BY "totalQty" DESC`,
      [dateFrom || "2000-01-01", dateTo || "2099-01-01"]
    );
    return NextResponse.json(r.rows);
  }

  return NextResponse.json([]);
}
