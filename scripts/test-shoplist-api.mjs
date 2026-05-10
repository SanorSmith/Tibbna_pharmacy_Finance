import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
  ssl: false
});

async function testShoplistAPI() {
  try {
    console.log('=== Testing Shoplist API Query ===\n');

    // Get pharmacy warehouse IDs
    const whRes = await pool.query(
      `SELECT id FROM warehouses WHERE warehouse_type = 'pharmacy' AND is_active = true`
    );
    
    if (whRes.rows.length === 0) {
      console.log('No pharmacy warehouses found');
      return;
    }

    const ids = whRes.rows.map(r => r.id);
    const whArray = `{${ids.join(",")}}`;
    console.log('Pharmacy warehouse IDs:', whArray);

    // Run the exact query from the API
    const result = await pool.query(
      `SELECT
        i.id,
        i.itemcode,
        i.name,
        i.generic_name AS "genericName",
        i.uom,
        i.min_level AS "minLevel",
        i.reorder_level AS "reorderLevel",
        i.max_level AS "maxLevel",
        i.manufacturer,
        COALESCE(SUM(ist.quantity), 0)::int AS "currentStock",
        (SELECT ib2.unit_cost FROM item_batches ib2
          WHERE ib2.item_id = i.id
            AND ib2.warehouse_id = ANY($1::uuid[])
            AND ib2.unit_cost IS NOT NULL
          ORDER BY ib2.created_at DESC LIMIT 1) AS "lastUnitCost"
      FROM items i
      LEFT JOIN inventory_stock ist
        ON ist.item_id = i.id
        AND ist.warehouse_id = ANY($1::uuid[])
      WHERE i.is_active = true
        AND (
          i.inventorycategory = 'pharmacy'
          OR i.inventory_category = 'pharmacy'
          OR ist.item_id IS NOT NULL
        )
      GROUP BY i.id, i.itemcode, i.name, i.generic_name, i.uom,
               i.min_level, i.reorder_level, i.max_level, i.manufacturer
      HAVING COALESCE(SUM(ist.quantity), 0) <= i.reorder_level
      ORDER BY COALESCE(SUM(ist.quantity), 0) ASC`,
      [whArray]
    );

    console.log(`\nAPI returned ${result.rows.length} items`);
    if (result.rows.length === 0) {
      console.log('⚠️ No items returned because:');
      console.log('1. Filter: i.inventorycategory = "pharmacy"');
      console.log('2. Many items have inventorycategory = null');
      console.log('\nSuggestion: Update query to also check inventory_category column');
    } else {
      result.rows.forEach(item => {
        console.log(`- ${item.name} (${item.itemcode}) - Stock: ${item.currentStock}, Reorder: ${item.reorderLevel}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testShoplistAPI();
