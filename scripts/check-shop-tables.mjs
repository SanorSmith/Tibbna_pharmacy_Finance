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

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%shop%' OR table_name LIKE '%order%'
      ORDER BY table_name
    `);

    console.log("\n📋 Tables with 'shop' or 'order' in name:\n");
    result.rows.forEach(r => {
      console.log(`  - ${r.table_name}`);
    });
    console.log();

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
