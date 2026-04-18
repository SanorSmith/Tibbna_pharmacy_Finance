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

async function fixTransactionTypes() {
  try {
    console.log("\n🔧 Updating transaction types from ADJUSTMENT to STOCK_IN...\n");

    const result = await pool.query(`
      UPDATE stock_transactions
      SET transaction_type = 'STOCK_IN'
      WHERE transaction_type = 'ADJUSTMENT'
      RETURNING id, transaction_type, quantity
    `);

    console.log(`✅ Updated ${result.rowCount} transactions to STOCK_IN\n`);

    // Verify
    const checkResult = await pool.query(`
      SELECT transaction_type, COUNT(*) as count
      FROM stock_transactions
      GROUP BY transaction_type
    `);

    console.log("Current transaction types:");
    checkResult.rows.forEach(row => {
      console.log(`  - ${row.transaction_type}: ${row.count} records`);
    });
    console.log();

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

fixTransactionTypes();
