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

const SOURCE_WORKSPACE = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";
const TARGET_WORKSPACE = "fa9fb036-a7eb-49af-890c-54406dad139d";

async function migratePharmacyData() {
  try {
    console.log("🔄 Migrating pharmacy inventory data...\n");
    console.log(`From: ${SOURCE_WORKSPACE}`);
    console.log(`To: ${TARGET_WORKSPACE}\n`);

    // Check if target workspace has any existing pharmacy data
    const targetItems = await pool.query(
      `SELECT COUNT(*) as count FROM items WHERE workspace_id = $1`,
      [TARGET_WORKSPACE]
    );

    if (parseInt(targetItems.rows[0].count) > 0) {
      console.log(`⚠️  Target workspace already has ${targetItems.rows[0].count} items.`);
      console.log("   Migration aborted to prevent data loss.");
      console.log("   Delete existing items first if you want to proceed.");
      await pool.end();
      return;
    }

    // Migrate items
    console.log("📦 Migrating items...");
    const itemsResult = await pool.query(`
      UPDATE items 
      SET workspace_id = $1
      WHERE workspace_id = $2
        AND itemtype IN ('drug', 'supply', 'consumable')
      RETURNING id, name
    `, [TARGET_WORKSPACE, SOURCE_WORKSPACE]);

    console.log(`✓ Migrated ${itemsResult.rows.length} items`);

    // Count inventory stock for migrated items
    console.log("\n📊 Checking inventory stock...");
    const stockResult = await pool.query(`
      SELECT COUNT(*) as count FROM inventory_stock 
      WHERE item_id IN (
        SELECT id FROM items WHERE workspace_id = $1
      )
    `, [TARGET_WORKSPACE]);

    console.log(`✓ Found ${stockResult.rows[0].count} stock records for migrated items`);

    // Count item batches for migrated items
    console.log("\n📅 Checking item batches...");
    const batchesResult = await pool.query(`
      SELECT COUNT(*) as count FROM item_batches 
      WHERE item_id IN (
        SELECT id FROM items WHERE workspace_id = $1
      )
    `, [TARGET_WORKSPACE]);

    console.log(`✓ Found ${batchesResult.rows[0].count} batches for migrated items`);

    // Count stock transactions for migrated items
    console.log("\n📝 Checking stock transactions...");
    const transactionsResult = await pool.query(`
      SELECT COUNT(*) as count FROM stock_transactions 
      WHERE item_id IN (
        SELECT id FROM items WHERE workspace_id = $1
      )
    `, [TARGET_WORKSPACE]);

    console.log(`✓ Found ${transactionsResult.rows[0].count} transactions for migrated items`);

    // Create pharmacy warehouse if it doesn't exist
    console.log("\n🏢 Creating pharmacy warehouse...");
    const warehouseId = "22222222-0000-0000-0000-000000000002";
    
    await pool.query(`
      INSERT INTO warehouses (id, workspace_id, name, warehouse_type, is_active, created_at)
      VALUES ($1, $2, 'Main Pharmacy', 'pharmacy', true, NOW())
      ON CONFLICT (id) DO UPDATE SET 
        workspace_id = $2,
        name = 'Main Pharmacy',
        warehouse_type = 'pharmacy',
        is_active = true
    `, [warehouseId, TARGET_WORKSPACE]);

    console.log(`✓ Created/updated pharmacy warehouse`);

    // Update inventory stock to use the pharmacy warehouse
    console.log("\n🔗 Linking inventory to pharmacy warehouse...");
    await pool.query(`
      UPDATE inventory_stock 
      SET warehouse_id = $1
      WHERE item_id IN (
        SELECT id FROM items WHERE workspace_id = $2
      )
    `, [warehouseId, TARGET_WORKSPACE]);

    console.log(`✓ Linked inventory to pharmacy warehouse`);

    console.log("\n✅ Migration complete!");
    console.log(`\nSummary:`);
    console.log(`  ${itemsResult.rows.length} items migrated`);
    console.log(`  ${stockResult.rows[0].count} stock records linked`);
    console.log(`  ${batchesResult.rows[0].count} batches linked`);
    console.log(`  ${transactionsResult.rows[0].count} transactions linked`);
    console.log(`  1 pharmacy warehouse created`);

  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

migratePharmacyData();
