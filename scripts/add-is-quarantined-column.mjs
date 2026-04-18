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

async function addIsQuarantinedColumn() {
  try {
    console.log("\n🔧 Adding is_quarantined column to item_batches table...\n");

    await pool.query(`
      ALTER TABLE item_batches 
      ADD COLUMN IF NOT EXISTS is_quarantined BOOLEAN DEFAULT false
    `);

    console.log("✅ Column added successfully!\n");

    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'item_batches' AND column_name = 'is_quarantined'
    `);

    if (result.rows.length > 0) {
      console.log("📊 Column details:");
      console.log(`  - Name: ${result.rows[0].column_name}`);
      console.log(`  - Type: ${result.rows[0].data_type}`);
      console.log(`  - Default: ${result.rows[0].column_default}\n`);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

addIsQuarantinedColumn();
