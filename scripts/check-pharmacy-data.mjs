import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') 
    ? { rejectUnauthorized: false } 
    : false,
});

async function checkData() {
  try {
    console.log("\n📊 Checking existing pharmacy inventory data...\n");

    // Check warehouses
    const warehouses = await pool.query("SELECT COUNT(*) as count FROM warehouses WHERE warehouse_type = 'pharmacy'");
    console.log(`📦 Warehouses (pharmacy): ${warehouses.rows[0].count} records`);

    // Check items
    const items = await pool.query("SELECT COUNT(*) as count FROM items WHERE inventorycategory = 'pharmacy'");
    console.log(`💊 Items (pharmacy): ${items.rows[0].count} records`);

    // Check item_batches
    const batches = await pool.query("SELECT COUNT(*) as count FROM item_batches");
    console.log(`📋 Item Batches: ${batches.rows[0].count} records`);

    // Check inventory_stock
    const stock = await pool.query("SELECT COUNT(*) as count FROM inventory_stock");
    console.log(`📊 Inventory Stock: ${stock.rows[0].count} records`);

    // Check vendors (may not exist)
    try {
      const vendors = await pool.query("SELECT COUNT(*) as count FROM vendors");
      console.log(`🏢 Vendors: ${vendors.rows[0].count} records`);
    } catch (e) {
      console.log(`🏢 Vendors: Table doesn't exist yet`);
    }

    // Check purchase_orders (may not exist)
    try {
      const pos = await pool.query("SELECT COUNT(*) as count FROM purchase_orders");
      console.log(`📝 Purchase Orders: ${pos.rows[0].count} records`);
    } catch (e) {
      console.log(`📝 Purchase Orders: Table doesn't exist yet`);
    }

    // Check goods_receipt_notes (may not exist)
    try {
      const grns = await pool.query("SELECT COUNT(*) as count FROM goods_receipt_notes");
      console.log(`📥 Goods Receipt Notes: ${grns.rows[0].count} records`);
    } catch (e) {
      console.log(`📥 Goods Receipt Notes: Table doesn't exist yet`);
    }

    // Check manufacturers
    try {
      const mfg = await pool.query("SELECT COUNT(*) as count FROM manufacturers");
      console.log(`🏭 Manufacturers: ${mfg.rows[0].count} records`);
    } catch (e) {
      console.log(`🏭 Manufacturers: Table doesn't exist yet`);
    }

    // Sample some items
    console.log("\n📝 Sample Items:");
    const sampleItems = await pool.query("SELECT itemcode, name FROM items WHERE inventorycategory = 'pharmacy' LIMIT 5");
    sampleItems.rows.forEach(item => {
      console.log(`   - ${item.itemcode}: ${item.name}`);
    });

    console.log("\n⚠️  WARNING: Fresh start will DELETE all this data!");
    console.log("   Only the pharmacy inventory tables will be affected.");
    console.log("   Other data (patients, appointments, lab, etc.) will NOT be affected.\n");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkData();
