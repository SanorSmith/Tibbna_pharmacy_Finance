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

async function checkNotNullColumns() {
  try {
    console.log("\n🔍 Checking NOT NULL columns in suppliers table...\n");

    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'suppliers'
        AND is_nullable = 'NO'
      ORDER BY ordinal_position
    `);

    console.log("NOT NULL columns:");
    result.rows.forEach(row => {
      const hasDefault = row.column_default ? `(default: ${row.column_default})` : '(NO DEFAULT)';
      console.log(`  ❌ ${row.column_name} (${row.data_type}) ${hasDefault}`);
    });
    console.log();

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkNotNullColumns();
