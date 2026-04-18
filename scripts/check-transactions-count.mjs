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
    // Get pharmacy warehouses
    const whRes = await pool.query(
      `SELECT id, name FROM warehouses WHERE warehouse_type = 'pharmacy' AND is_active = true`
    );
    
    console.log("\n📦 Pharmacy warehouses:");
    whRes.rows.forEach(r => console.log(`  - ${r.name} (${r.id})`));
    
    // Get transaction count
    const countRes = await pool.query(
      `SELECT COUNT(*) as total FROM stock_transactions`
    );
    console.log(`\n📊 Total transactions in database: ${countRes.rows[0].total}`);
    
    // Get recent transactions
    const transRes = await pool.query(
      `SELECT 
        st.id,
        st.transaction_type,
        st.quantity,
        st.created_at,
        i.name as item_name,
        w.name as warehouse_name
      FROM stock_transactions st
      LEFT JOIN items i ON i.id = st.item_id
      LEFT JOIN warehouses w ON w.id = st.warehouse_id
      ORDER BY st.created_at DESC
      LIMIT 5`
    );
    
    console.log(`\n📝 Recent transactions:`);
    if (transRes.rows.length === 0) {
      console.log("  No transactions found!");
    } else {
      transRes.rows.forEach(r => {
        console.log(`  - ${r.transaction_type}: ${r.item_name} (${r.quantity}) in ${r.warehouse_name} at ${r.created_at}`);
      });
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkTransactions();
