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

async function checkAllColumns() {
  try {
    console.log("Checking items table columns:");
    const items = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'items' 
      ORDER BY ordinal_position
    `);
    
    items.rows.forEach(r => {
      const nullable = r.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  - ${r.column_name} (${r.data_type}) ${nullable}`);
    });

    console.log("\nChecking inventory_stock table columns:");
    const stock = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'inventory_stock' 
      ORDER BY ordinal_position
    `);
    
    stock.rows.forEach(r => {
      const nullable = r.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  - ${r.column_name} (${r.data_type}) ${nullable}`);
    });

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkAllColumns();
