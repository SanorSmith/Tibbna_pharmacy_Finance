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

async function addBatchIdColumn() {
  try {
    console.log("\n🔧 Adding batch_id column to inventory_stock table...\n");

    // Check if column already exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'inventory_stock' 
      AND column_name = 'batch_id'
    `);

    if (checkColumn.rows.length > 0) {
      console.log("✓ batch_id column already exists!");
      return;
    }

    // Add the column
    await pool.query(`
      ALTER TABLE inventory_stock 
      ADD COLUMN batch_id UUID REFERENCES item_batches(id)
    `);

    console.log("✅ Successfully added batch_id column!");
    console.log("   - Column: batch_id");
    console.log("   - Type: UUID");
    console.log("   - References: item_batches(id)");
    console.log("\n✓ You can now run the seed script to populate inventory_stock data!\n");

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

addBatchIdColumn();
