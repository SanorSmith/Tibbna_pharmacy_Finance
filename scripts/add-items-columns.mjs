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

async function addItemsColumns() {
  try {
    console.log("\n🔧 Adding missing columns to items table...\n");

    await pool.query(`
      ALTER TABLE items 
      ADD COLUMN IF NOT EXISTS secondary_uom TEXT,
      ADD COLUMN IF NOT EXISTS tertiary_uom TEXT,
      ADD COLUMN IF NOT EXISTS batch_tracking BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS serial_tracking BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS expiry_tracking BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS single_use BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS sterile BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS asset_category TEXT,
      ADD COLUMN IF NOT EXISTS serial_number TEXT,
      ADD COLUMN IF NOT EXISTS contrast_type TEXT,
      ADD COLUMN IF NOT EXISTS analyzer_compat TEXT,
      ADD COLUMN IF NOT EXISTS critical_reagent BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
    `);

    console.log("✅ Successfully added missing columns to items table!");
    console.log("   - secondary_uom, tertiary_uom");
    console.log("   - batch_tracking, serial_tracking, expiry_tracking");
    console.log("   - single_use, sterile");
    console.log("   - asset_category, serial_number");
    console.log("   - contrast_type, analyzer_compat");
    console.log("   - critical_reagent, metadata\n");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

addItemsColumns();
