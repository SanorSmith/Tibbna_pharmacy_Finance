import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    
    console.log('[Pharmacy Summary API] Received workspace ID:', workspaceId);
    
    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    // Get pharmacy warehouses first
    const whRes = await pool.query(`
      SELECT id FROM warehouses WHERE warehouse_type = 'pharmacy' AND is_active = true
    `);
    
    if (!whRes.rows.length) {
      return NextResponse.json({
        totalItems: 0,
        lowStock: 0,
        outOfStock: 0,
        totalValue: 0,
        expiringSoon: 0,
        criticalItems: 0
      });
    }

    const whIds = whRes.rows.map((r: any) => r.id);

    // Get pharmacy inventory summary matching the items API logic
    const summary = await pool.query(`
      WITH item_stock AS (
        SELECT 
          i.id,
          i.reorder_level,
          COALESCE(SUM(ist.quantity), 0) as total_stock
        FROM items i
        LEFT JOIN inventory_stock ist ON ist.item_id = i.id AND ist.warehouse_id = ANY($1::uuid[])
        WHERE i.is_active = true 
          AND i.workspace_id = $2
          AND (
            i.inventory_category = 'pharmacy'
            OR i.inventorycategory = 'pharmacy'
            OR ist.warehouse_id IS NOT NULL
          )
        GROUP BY i.id, i.reorder_level
      )
      SELECT 
        COUNT(*) as total_items,
        COUNT(*) FILTER (WHERE total_stock > 0 AND total_stock <= reorder_level) as low_stock,
        COUNT(*) FILTER (WHERE total_stock = 0) as out_of_stock
      FROM item_stock
    `, [whIds, workspaceId]);

    // Get expiring soon items (within 30 days)
    const expiring = await pool.query(`
      SELECT COUNT(DISTINCT ib.item_id) as expiring_soon
      FROM item_batches ib
      WHERE ib.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
        AND ib.expiry_date > CURRENT_DATE
        AND ib.item_id IN (
          SELECT id FROM items WHERE workspace_id = $1 AND is_active = true
        )
    `, [workspaceId]);

    const result = summary.rows[0];
    const expiringResult = expiring.rows[0];

    const response = {
      totalItems: parseInt(result.total_items) || 0,
      lowStock: parseInt(result.low_stock) || 0,
      outOfStock: parseInt(result.out_of_stock) || 0,
      totalValue: 0, // Calculate based on unit cost if needed
      expiringSoon: parseInt(expiringResult.expiring_soon) || 0,
      criticalItems: parseInt(result.low_stock) || 0 // Low stock items as critical
    };

    console.log('[Pharmacy Summary API] Returning:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error("[Pharmacy Summary API]", error);
    return NextResponse.json({ error: "Failed to fetch pharmacy summary" }, { status: 500 });
  }
}
