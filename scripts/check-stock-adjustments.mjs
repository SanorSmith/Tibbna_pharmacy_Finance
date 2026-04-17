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

async function checkStockAdjustments() {
  try {
    console.log("\n🔍 Checking stock_adjustments table columns...\n");

    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'stock_adjustments'
      ORDER BY ordinal_position
    `);

    if (result.rows.length === 0) {
      console.log("❌ Table 'stock_adjustments' does not exist!\n");
    } else {
      console.log("📊 Columns in stock_adjustments table:");
      result.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      console.log();
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkStockAdjustments();
