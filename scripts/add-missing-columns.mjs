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

async function addMissingColumns() {
  try {
    console.log("\n🔧 Adding missing columns to tables...\n");

    // 1. warehouse_sections
    console.log("📦 Updating warehouse_sections...");
    await pool.query(`
      ALTER TABLE warehouse_sections 
      ADD COLUMN IF NOT EXISTS section_name TEXT,
      ADD COLUMN IF NOT EXISTS section_type TEXT,
      ADD COLUMN IF NOT EXISTS bin_location TEXT,
      ADD COLUMN IF NOT EXISTS shelf TEXT,
      ADD COLUMN IF NOT EXISTS temperature_controlled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      
      -- Copy data from old columns to new ones
      UPDATE warehouse_sections 
      SET section_name = sectionname 
      WHERE section_name IS NULL AND sectionname IS NOT NULL;
      
      UPDATE warehouse_sections 
      SET created_at = createdat 
      WHERE created_at IS NULL AND createdat IS NOT NULL;
    `);
    console.log("   ✅ Added: section_name, section_type, bin_location, shelf, temperature_controlled, created_at");

    // 2. warehouses
    console.log("\n🏢 Updating warehouses...");
    await pool.query(`
      ALTER TABLE warehouses 
      ADD COLUMN IF NOT EXISTS code TEXT,
      ADD COLUMN IF NOT EXISTS manager TEXT,
      ADD COLUMN IF NOT EXISTS capacity INTEGER;
    `);
    console.log("   ✅ Added: code, manager, capacity");

    // 3. items
    console.log("\n📦 Updating items...");
    await pool.query(`
      ALTER TABLE items 
      ADD COLUMN IF NOT EXISTS item_code TEXT,
      ADD COLUMN IF NOT EXISTS item_type TEXT,
      ADD COLUMN IF NOT EXISTS inventory_category TEXT,
      ADD COLUMN IF NOT EXISTS supplier_id UUID,
      ADD COLUMN IF NOT EXISTS drug_id UUID;
      
      -- Copy data from old columns
      UPDATE items 
      SET item_code = itemcode 
      WHERE item_code IS NULL AND itemcode IS NOT NULL;
      
      UPDATE items 
      SET item_type = itemtype 
      WHERE item_type IS NULL AND itemtype IS NOT NULL;
      
      UPDATE items 
      SET inventory_category = inventorycategory 
      WHERE inventory_category IS NULL AND inventorycategory IS NOT NULL;
    `);
    console.log("   ✅ Added: item_code, item_type, inventory_category, supplier_id, drug_id");

    // 4. inventory_stock
    console.log("\n📊 Updating inventory_stock...");
    await pool.query(`
      ALTER TABLE inventory_stock 
      ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    `);
    console.log("   ✅ Added: last_updated");

    console.log("\n✅ All missing columns added successfully!");
    console.log("\n📝 Summary:");
    console.log("   - warehouse_sections: +6 columns");
    console.log("   - warehouses: +3 columns");
    console.log("   - items: +5 columns");
    console.log("   - inventory_stock: +1 column");
    console.log("\n🎉 Database schema is now up to date!\n");

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

addMissingColumns();
