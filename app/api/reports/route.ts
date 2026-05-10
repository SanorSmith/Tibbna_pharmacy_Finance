import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: NextRequest) {
  const tab        = req.nextUrl.searchParams.get("tab")        ?? "stock";
  const dateFrom   = req.nextUrl.searchParams.get("dateFrom")   ?? "";
  const dateTo     = req.nextUrl.searchParams.get("dateTo")     ?? "";
  const category   = req.nextUrl.searchParams.get("category")   ?? "all";
  const type       = req.nextUrl.searchParams.get("type")       ?? "stock";
  const workspaceId = req.nextUrl.searchParams.get("workspaceId") ?? "";

  console.log('[Reports API] workspaceId:', workspaceId, 'type:', type, 'category:', category);

  if (tab === "consumption" || type === "consumption") {
    const consumptionParams: any[] = [dateFrom || "2000-01-01", dateTo || "2099-01-01"];
    let consumptionWorkspaceFilter = "";
    let pharmacyWarehouseFilter = "";
    
    if (workspaceId) {
      consumptionWorkspaceFilter = `AND i.workspace_id = $3`;
      consumptionParams.push(workspaceId);
    }
    
    // Add pharmacy warehouse filter if category is pharmacy
    if (category === "pharmacy") {
      const whQuery = `SELECT id FROM warehouses WHERE warehouse_type = 'pharmacy' AND is_active = true`;
      const whRes = await pool.query(whQuery);
      const whIds = whRes.rows.map((r: any) => r.id);
      
      if (whIds.length > 0) {
        const whArray = `{${whIds.join(",")}}`;
        consumptionParams.push(whArray);
        pharmacyWarehouseFilter = `AND w.id = ANY($${consumptionParams.length}::uuid[])`;
      }
    }
    
    console.log('[Reports API] Consumption query - dateFrom:', dateFrom || "2000-01-01", 'dateTo:', dateTo || "2099-01-01");
    console.log('[Reports API] Consumption params:', consumptionParams);
    
    const query = `SELECT
        i.name AS itemname,
        i.itemcode,
        st.transaction_type AS transactiontype,
        SUM(st.quantity)::int AS totalqty,
        COUNT(*)::int AS txcount,
        w.name AS warehousename,
        MAX(st.created_at) AS lastmoved
      FROM stock_transactions st
      JOIN items i ON i.id = st.item_id
      LEFT JOIN warehouses w ON w.id = st.warehouse_id
      WHERE st.transaction_type IN ('STOCK_OUT','DISPENSE','WASTAGE','ADJUSTMENT')
        AND st.created_at BETWEEN $1 AND $2
        ${consumptionWorkspaceFilter}
        ${pharmacyWarehouseFilter}
      GROUP BY i.name, i.itemcode, st.transaction_type, w.name
      ORDER BY totalqty DESC`;
    
    console.log('[Reports API] Consumption query:', query);
    
    const r = await pool.query(query, consumptionParams);
    
    console.log('[Reports API] Consumption returned', r.rows.length, 'records');
    
    // Check if there are ANY stock transactions
    const totalTx = await pool.query(`SELECT COUNT(*) as count FROM stock_transactions WHERE transaction_type IN ('STOCK_OUT','DISPENSE','WASTAGE','ADJUSTMENT')`);
    console.log('[Reports API] Total stock transactions in DB:', totalTx.rows[0].count);
    
    return NextResponse.json(r.rows);
  }
  
  if (tab === "stock" || type === "stock") {
    const queryParams: any[] = [];
    let paramIndex = 1;
    let whIds: any[] = [];
    
    let workspaceFilter = "";
    if (workspaceId) {
      workspaceFilter = `AND i.workspace_id = $${paramIndex}`;
      queryParams.push(workspaceId);
      paramIndex++;
      console.log('[Reports API] Applying workspace filter:', workspaceFilter, 'with param:', workspaceId);
    } else {
      console.log('[Reports API] WARNING: No workspaceId provided - will return ALL items!');
    }
    
    // Get pharmacy warehouses for filtering
    let categoryFilter = "";
    if (category === "pharmacy") {
      // Get pharmacy warehouses
      const whQuery = `SELECT id FROM warehouses WHERE warehouse_type = 'pharmacy' AND is_active = true`;
      const whRes = await pool.query(whQuery);
      whIds = whRes.rows.map((r: any) => r.id);
      
      if (whIds.length > 0) {
        const whArray = `{${whIds.join(",")}}`;
        queryParams.push(whArray);
        categoryFilter = `AND (
          i.inventorycategory = 'pharmacy' 
          OR i.inventory_category = 'pharmacy'
          OR EXISTS (
            SELECT 1 FROM item_batches ib_check
            WHERE ib_check.item_id = i.id
              AND ib_check.warehouse_id = ANY($${paramIndex}::uuid[])
          )
        )`;
        paramIndex++;
      } else {
        categoryFilter = "AND (i.inventorycategory = 'pharmacy' OR i.inventory_category = 'pharmacy')";
      }
    } else if (category !== "all") {
      categoryFilter = `AND i.inventorycategory = '${category}'`;
    }
    
    let query = "";
    if (category === "pharmacy" && whIds.length > 0) {
      // Use same logic as pharmacy items API
      const whArray = `{${whIds.join(",")}}`;
      query = `SELECT
        i.id, 
        i.name, 
        i.generic_name AS "genericName", 
        i.itemcode, 
        i.uom,
        i.inventorycategory AS category,
        i.reorder_level AS "reorderLevel",
        COALESCE(stock_agg.total_stock, 0)::int AS "totalStock",
        COALESCE(stock_agg.total_reserved, 0)::int AS "reservedStock"
      FROM items i
      LEFT JOIN (
        SELECT 
          item_id,
          SUM(quantity) as total_stock,
          SUM(reserved_quantity) as total_reserved
        FROM inventory_stock
        WHERE warehouse_id = ANY($2::uuid[])
        GROUP BY item_id
      ) stock_agg ON stock_agg.item_id = i.id
      WHERE i.is_active = true
        ${workspaceFilter}
        AND (
          i.inventorycategory = 'pharmacy'
          OR i.inventory_category = 'pharmacy'
          OR stock_agg.item_id IS NOT NULL
        )
        AND EXISTS (
          SELECT 1 FROM item_batches ib_check
          WHERE ib_check.item_id = i.id
            AND ib_check.warehouse_id = ANY($2::uuid[])
        )
      ORDER BY i.name`;
    } else {
      query = `SELECT
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
        ${workspaceFilter}
        ${categoryFilter}
      GROUP BY i.id, i.name, i.generic_name, i.itemcode, i.uom, i.inventorycategory, i.reorder_level
      ORDER BY i.inventorycategory, i.name`;
    }
    
    console.log('[Reports API] Executing query:', query);
    console.log('[Reports API] Query params:', queryParams);
    
    const r = await pool.query(query, queryParams);
    
    console.log('[Reports API] Returned', r.rows.length, 'items');
    
    // Debug: Check how many items have batches vs stock
    if (category === "pharmacy" && whIds && whIds.length > 0) {
      const whArray = `{${whIds.join(",")}}`;
      const debugBatches = await pool.query(
        `SELECT COUNT(DISTINCT item_id) as count FROM item_batches WHERE warehouse_id = ANY($1::uuid[])`,
        [whArray]
      );
      const debugStock = await pool.query(
        `SELECT COUNT(DISTINCT item_id) as count FROM inventory_stock WHERE warehouse_id = ANY($1::uuid[])`,
        [whArray]
      );
      console.log('[Reports API] DEBUG - Items with batches in pharmacy warehouses:', debugBatches.rows[0].count);
      console.log('[Reports API] DEBUG - Items with stock in pharmacy warehouses:', debugStock.rows[0].count);
    }
    
    // Log category breakdown for debugging
    const categoryBreakdown = r.rows.reduce((acc: any, row: any) => {
      const cat = row.category || 'null';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
    console.log('[Reports API] Category breakdown:', categoryBreakdown);
    
    // Log first 3 items for debugging
    console.log('[Reports API] Sample items:', r.rows.slice(0, 3).map((row: any) => ({
      name: row.name,
      category: row.category
    })));
    
    return NextResponse.json(r.rows);
  }

  return NextResponse.json([]);
}
