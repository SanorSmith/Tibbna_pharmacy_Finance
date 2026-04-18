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

async function checkPK() {
  try {
    // Check items table primary key
    const itemsPK = await pool.query(`
      SELECT column_name
      FROM information_schema.key_column_usage
      WHERE table_name = 'items' 
        AND constraint_name LIKE '%pkey%'
    `);
    
    console.log("\n📋 items table primary key:");
    itemsPK.rows.forEach(r => console.log(`  - ${r.column_name}`));
    
    // Check warehouses table primary key
    const warehousesPK = await pool.query(`
      SELECT column_name
      FROM information_schema.key_column_usage
      WHERE table_name = 'warehouses' 
        AND constraint_name LIKE '%pkey%'
    `);
    
    console.log("\n📋 warehouses table primary key:");
    warehousesPK.rows.forEach(r => console.log(`  - ${r.column_name}`));
    
    // Check item_batches table primary key
    const batchesPK = await pool.query(`
      SELECT column_name
      FROM information_schema.key_column_usage
      WHERE table_name = 'item_batches' 
        AND constraint_name LIKE '%pkey%'
    `);
    
    console.log("\n📋 item_batches table primary key:");
    batchesPK.rows.forEach(r => console.log(`  - ${r.column_name}`));
    
    console.log();

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkPK();
