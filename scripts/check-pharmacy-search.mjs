import { Pool } from 'pg';

// Try to get connection string from environment
const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: No DATABASE_URL or NEON_DATABASE_URL environment variable found');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function checkPharmacySearch() {
  try {
    console.log('=== Checking Pharmacy Search Issues ===\n');

    // 1. Check pharmacy warehouses
    console.log('1. Pharmacy Warehouses:');
    const whResult = await pool.query(
      `SELECT id, name, warehouse_type, is_active 
       FROM warehouses 
       WHERE warehouse_type = 'pharmacy'`
    );
    console.log(`   Found ${whResult.rows.length} pharmacy warehouses`);
    if (whResult.rows.length > 0) {
      whResult.rows.forEach(r => {
        console.log(`   - ID: ${r.id}, Name: ${r.name}, Active: ${r.is_active}`);
      });
    } else {
      console.log('   ⚠️  NO PHARMACY WAREHOUSES FOUND - This is why search returns empty!');
    }
    console.log();

    // 2. Check items matching "pen"
    console.log('2. Items matching "pen":');
    const penItems = await pool.query(
      `SELECT id, name, itemcode, generic_name, is_active, inventorycategory, workspace_id
       FROM items
       WHERE (name ILIKE '%pen%' 
         OR generic_name ILIKE '%pen%'
         OR itemcode ILIKE '%pen%'
         OR item_code ILIKE '%pen%')
       LIMIT 10`
    );
    console.log(`   Found ${penItems.rows.length} items matching "pen"`);
    penItems.rows.forEach(item => {
      console.log(`   - ${item.name} (${item.itemcode}) - Active: ${item.is_active}, Category: ${item.inventorycategory}, Workspace: ${item.workspace_id}`);
    });
    console.log();

    // 3. Check all items in pharmacy category
    console.log('3. All pharmacy items:');
    const pharmacyItems = await pool.query(
      `SELECT COUNT(*) as count
       FROM items
       WHERE is_active = true
       AND (inventorycategory = 'pharmacy' OR inventory_category = 'pharmacy')`
    );
    console.log(`   Found ${pharmacyItems.rows[0].count} active pharmacy items`);
    console.log();

    // 4. Check items with stock in pharmacy warehouses
    console.log('4. Items with stock in pharmacy warehouses:');
    const whIds = whResult.rows.map(r => r.id);
    if (whIds.length > 0) {
      const stockItems = await pool.query(
        `SELECT COUNT(DISTINCT i.id) as count
         FROM items i
         INNER JOIN inventory_stock ist ON ist.item_id = i.id
         WHERE ist.warehouse_id = ANY($1::uuid[])
         AND i.is_active = true`,
        [whIds]
      );
      console.log(`   Found ${stockItems.rows[0].count} items with stock in pharmacy warehouses`);
    } else {
      console.log('   ⚠️  No pharmacy warehouses to check');
    }
    console.log();

    // 5. Check workspaces
    console.log('5. Workspaces:');
    const wsResult = await pool.query(
      `SELECT workspaceid, name FROM workspaces LIMIT 5`
    );
    console.log(`   Found ${wsResult.rows.length} workspaces`);
    wsResult.rows.forEach(ws => {
      console.log(`   - ${ws.workspaceid}: ${ws.name}`);
    });
    console.log();

    // 6. Test the actual search query with "pen"
    console.log('6. Testing search query for "pen":');
    if (whIds.length > 0) {
      const whArray = `{${whIds.join(",")}}`;
      const searchResult = await pool.query(
        `SELECT
          i.id,
          i.itemcode,
          i.name,
          i.generic_name,
          i.inventorycategory,
          i.is_active,
          i.workspace_id,
          COALESCE(stock_agg.total_stock, 0)::int AS "totalStock"
        FROM items i
        LEFT JOIN (
          SELECT 
            item_id,
            SUM(quantity) as total_stock
          FROM inventory_stock
          WHERE warehouse_id = ANY($1::uuid[])
          GROUP BY item_id
        ) stock_agg ON stock_agg.item_id = i.id
        WHERE i.is_active = true
          AND (
            i.inventorycategory = 'pharmacy'
            OR i.inventory_category = 'pharmacy'
            OR stock_agg.item_id IS NOT NULL
          )
          AND (
            i.name ILIKE $2
            OR i.generic_name ILIKE $2
            OR i.itemcode ILIKE $2
            OR i.item_code ILIKE $2
          )
        GROUP BY i.id, i.itemcode, i.name, i.generic_name, i.inventorycategory, i.is_active, i.workspace_id, stock_agg.total_stock
        ORDER BY i.name
        LIMIT 10`,
        [whArray, '%pen%']
      );
      console.log(`   Search returned ${searchResult.rows.length} results`);
      searchResult.rows.forEach(item => {
        console.log(`   - ${item.name} (${item.itemcode}) - Stock: ${item.totalStock}, Workspace: ${item.workspace_id}`);
      });
    } else {
      console.log('   ⚠️  Cannot test search - no pharmacy warehouses');
    }

    console.log('\n=== SUMMARY ===');
    if (whResult.rows.length === 0) {
      console.log('❌ ISSUE: No pharmacy warehouses exist. The search API requires at least one active pharmacy warehouse.');
      console.log('   FIX: Create a pharmacy warehouse in the warehouses table.');
    } else if (penItems.rows.length === 0) {
      console.log('❌ ISSUE: No items match "pen" in the database.');
      console.log('   FIX: Try searching for a different term or add items to the database.');
    } else if (pharmacyItems.rows[0].count === 0) {
      console.log('❌ ISSUE: No items are marked as pharmacy category.');
      console.log('   FIX: Update items to have inventorycategory = "pharmacy" or ensure they have stock in pharmacy warehouses.');
    } else {
      console.log('✓ Basic checks passed. The issue may be with workspace ID filtering or specific search logic.');
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('SASL') || error.message.includes('password')) {
      console.error('\n❌ Database authentication error. Check DATABASE_URL environment variable.');
    }
  } finally {
    await pool.end();
  }
}

checkPharmacySearch();
