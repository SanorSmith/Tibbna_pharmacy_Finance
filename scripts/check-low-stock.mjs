import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
  ssl: false
});

async function checkLowStock() {
  try {
    console.log('=== Items that should auto-load (Low Stock) ===\n');

    // Get pharmacy warehouse IDs
    const whResult = await pool.query(
      `SELECT id FROM warehouses WHERE warehouse_type = 'pharmacy' AND is_active = true`
    );
    
    if (whResult.rows.length === 0) {
      console.log('No pharmacy warehouses found');
      return;
    }

    const whIds = whResult.rows.map(r => r.id);
    const whArray = `{${whIds.join(",")}}`;

    // Get items at or below reorder level
    const result = await pool.query(
      `SELECT
        i.id,
        i.name,
        i.itemcode,
        i.uom,
        i.reorder_level,
        COALESCE(SUM(ist.quantity), 0)::int as current_stock
      FROM items i
      LEFT JOIN inventory_stock ist ON ist.item_id = i.id AND ist.warehouse_id = ANY($1::uuid[])
      WHERE i.is_active = true
        AND (
          i.inventorycategory = 'pharmacy'
          OR i.inventory_category = 'pharmacy'
          OR ist.item_id IS NOT NULL
        )
      GROUP BY i.id, i.name, i.itemcode, i.uom, i.reorder_level
      HAVING COALESCE(SUM(ist.quantity), 0) <= COALESCE(i.reorder_level, 0)
      ORDER BY i.name
      LIMIT 20`,
      [whArray]
    );

    if (result.rows.length === 0) {
      console.log('No low stock items found - all items have sufficient stock');
    } else {
      console.log(`Found ${result.rows.length} low stock items:\n`);
      result.rows.forEach(item => {
        console.log(`- ${item.name} (${item.itemcode})`);
        console.log(`  Stock: ${item.current_stock}, Reorder Level: ${item.reorder_level}`);
        console.log();
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkLowStock();
