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

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, ordinal_position, is_nullable, data_type
      FROM information_schema.columns 
      WHERE table_name = 'shop_orders'
      ORDER BY ordinal_position
    `);

    console.log("\n📋 shop_orders columns:\n");
    result.rows.forEach(r => {
      const nullable = r.is_nullable === 'YES' ? '✅ nullable' : '❌ NOT NULL';
      console.log(`${r.ordinal_position}. ${r.column_name} (${r.data_type}) ${nullable}`);
    });
    console.log();

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
