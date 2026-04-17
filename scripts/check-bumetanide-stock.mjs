import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkBumetanideStock() {
  try {
    console.log("\n🔍 Checking Bumetanide stock...\n");

    // Find Bumetanide item
    const itemResult = await pool.query(`
      SELECT id, name, itemcode
      FROM items
      WHERE name ILIKE '%bumetanide%'
      LIMIT 1
    `);

    if (itemResult.rows.length === 0) {
      console.log("❌ Bumetanide not found in items table\n");
      return;
    }

    const item = itemResult.rows[0];
    console.log(`📦 Item: ${item.name} (${item.itemcode})`);
    console.log(`   ID: ${item.id}\n`);

    // Check inventory stock
    const stockResult = await pool.query(`
      SELECT 
        ist.quantity,
        ist.reserved_quantity,
        w.name as warehouse_name
      FROM inventory_stock ist
      JOIN warehouses w ON w.id = ist.warehouse_id
      WHERE ist.item_id = $1
    `, [item.id]);

    if (stockResult.rows.length === 0) {
      console.log("❌ No stock records found\n");
    } else {
      console.log("📊 Stock records:");
      stockResult.rows.forEach(stock => {
        console.log(`  - ${stock.warehouse_name}: ${stock.quantity} (reserved: ${stock.reserved_quantity})`);
      });
      console.log();
    }

    // Check recent adjustments
    const adjResult = await pool.query(`
      SELECT 
        quantity,
        reason,
        created_at,
        created_by
      FROM stock_adjustments
      WHERE item_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [item.id]);

    if (adjResult.rows.length > 0) {
      console.log("📝 Recent adjustments:");
      adjResult.rows.forEach(adj => {
        console.log(`  - ${adj.created_at}: ${adj.quantity > 0 ? '+' : ''}${adj.quantity} (${adj.reason})`);
      });
      console.log();
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkBumetanideStock();
