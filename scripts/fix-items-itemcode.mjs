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

async function fixItemsItemcode() {
  try {
    console.log("\n🔧 Fixing items table itemcode columns...\n");

    // Copy data from item_code to itemcode for existing rows
    await pool.query(`
      UPDATE items 
      SET itemcode = item_code 
      WHERE itemcode IS NULL AND item_code IS NOT NULL;
    `);

    // Drop NOT NULL constraint from old itemcode column
    await pool.query(`
      ALTER TABLE items 
      ALTER COLUMN itemcode DROP NOT NULL;
    `);

    console.log("✅ Successfully fixed itemcode columns!");
    console.log("   - Copied item_code values to itemcode");
    console.log("   - Removed NOT NULL constraint from itemcode");
    console.log("   - New items will use item_code column\n");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

fixItemsItemcode();
