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

async function checkInventoryStockConstraints() {
  try {
    console.log("\n🔍 Checking inventory_stock table constraints...\n");

    // Check unique constraints
    const result = await pool.query(`
      SELECT 
        con.conname AS constraint_name,
        con.contype AS constraint_type,
        pg_get_constraintdef(con.oid) AS constraint_definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'inventory_stock'
      ORDER BY con.conname
    `);

    if (result.rows.length === 0) {
      console.log("❌ No constraints found on inventory_stock table\n");
    } else {
      console.log("📊 Constraints on inventory_stock:");
      result.rows.forEach(row => {
        const type = row.constraint_type === 'p' ? 'PRIMARY KEY' : 
                     row.constraint_type === 'u' ? 'UNIQUE' :
                     row.constraint_type === 'f' ? 'FOREIGN KEY' :
                     row.constraint_type;
        console.log(`  - ${row.constraint_name} (${type})`);
        console.log(`    ${row.constraint_definition}\n`);
      });
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkInventoryStockConstraints();
