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

async function fixItemsConstraints() {
  try {
    console.log("\n🔧 Fixing items table column constraints...\n");

    // Copy data from new columns to old columns for existing rows
    await pool.query(`
      UPDATE items 
      SET itemtype = item_type 
      WHERE itemtype IS NULL AND item_type IS NOT NULL;
      
      UPDATE items 
      SET inventorycategory = inventory_category 
      WHERE inventorycategory IS NULL AND inventory_category IS NOT NULL;
    `);

    // Drop NOT NULL constraints from old columns
    await pool.query(`
      ALTER TABLE items 
      ALTER COLUMN itemtype DROP NOT NULL,
      ALTER COLUMN inventorycategory DROP NOT NULL;
    `);

    console.log("✅ Successfully fixed items table constraints!");
    console.log("   - Copied item_type values to itemtype");
    console.log("   - Copied inventory_category values to inventorycategory");
    console.log("   - Removed NOT NULL constraints from old columns");
    console.log("   - New items will use snake_case columns\n");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

fixItemsConstraints();
