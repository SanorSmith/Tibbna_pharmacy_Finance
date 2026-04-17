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

async function checkAddedDrugs() {
  try {
    console.log("\n🔍 Checking recently added drugs and items...\n");

    // Check drugs table
    const drugsResult = await pool.query(`
      SELECT drugid, name, form, strength, createdat 
      FROM drugs 
      ORDER BY createdat DESC 
      LIMIT 5
    `);
    
    console.log("📊 Recent drugs in drugs table:");
    drugsResult.rows.forEach(drug => {
      console.log(`  - ${drug.name} (${drug.form} ${drug.strength}) - ${drug.createdat}`);
    });
    console.log(`  Total drugs: ${drugsResult.rowCount}\n`);

    // Check items table
    const itemsResult = await pool.query(`
      SELECT id, name, itemcode, item_code, created_at 
      FROM items 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log("📦 Recent items in items table:");
    itemsResult.rows.forEach(item => {
      console.log(`  - ${item.name} (code: ${item.item_code || item.itemcode}) - ${item.created_at}`);
    });
    
    // Count total items
    const countResult = await pool.query(`SELECT COUNT(*) as total FROM items`);
    console.log(`  Total items: ${countResult.rows[0].total}\n`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkAddedDrugs();
