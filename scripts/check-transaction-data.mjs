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

async function checkData() {
  try {
    // Get one transaction
    const trans = await pool.query('SELECT * FROM stock_transactions LIMIT 1');
    console.log("\n📋 Sample transaction:");
    console.log(JSON.stringify(trans.rows[0], null, 2));
    
    // Try the JOIN query
    const joined = await pool.query(`
      SELECT 
        st.id,
        st.transaction_type,
        st.quantity,
        st.item_id,
        st.warehouse_id,
        st.batch_id,
        i.name as item_name,
        i.itemcode as item_code,
        w.name as warehouse_name
      FROM stock_transactions st
      LEFT JOIN items i ON i.id = st.item_id
      LEFT JOIN warehouses w ON w.id = st.warehouse_id
      LIMIT 1
    `);
    
    console.log("\n📋 Joined query result:");
    console.log(JSON.stringify(joined.rows[0], null, 2));

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

checkData();
