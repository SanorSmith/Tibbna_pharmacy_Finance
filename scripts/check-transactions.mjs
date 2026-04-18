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

async function checkTransactions() {
  try {
    console.log("\n📊 Checking stock_transactions table...\n");

    // Check all transactions
    const allResult = await pool.query(`
      SELECT 
        st.transaction_type,
        COUNT(*) as count
      FROM stock_transactions st
      GROUP BY st.transaction_type
      ORDER BY count DESC
    `);

    console.log("Transaction types:");
    if (allResult.rows.length === 0) {
      console.log("  ❌ No transactions found in database!\n");
    } else {
      allResult.rows.forEach(row => {
        console.log(`  - ${row.transaction_type}: ${row.count} records`);
      });
      console.log();
    }

    // Show recent transactions
    const recentResult = await pool.query(`
      SELECT 
        st.id,
        st.transaction_type,
        st.quantity,
        st.notes,
        st.created_by,
        st.created_at,
        i.name as item_name
      FROM stock_transactions st
      JOIN items i ON i.id = st.item_id
      ORDER BY st.created_at DESC
      LIMIT 10
    `);

    console.log("Recent transactions:");
    if (recentResult.rows.length === 0) {
      console.log("  ❌ No transactions found!\n");
    } else {
      recentResult.rows.forEach(row => {
        console.log(`  - ${row.created_at.toISOString().split('T')[0]} | ${row.transaction_type} | ${row.item_name} | Qty: ${row.quantity} | ${row.notes || 'No notes'}`);
      });
      console.log();
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkTransactions();
