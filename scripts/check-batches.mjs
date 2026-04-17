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

async function checkBatches() {
  try {
    console.log("\n🔍 Checking item batches...\n");

    // Check batches for specific items
    const itemIds = [
      '0d18bef8-19af-4fdf-a58c-172da929a7de',
      'a1000001-0000-0000-0000-000000000003'
    ];

    for (const itemId of itemIds) {
      const result = await pool.query(`
        SELECT 
          i.name as item_name,
          ib.batch_number,
          ib.quantity,
          ib.unit_cost,
          ib.selling_price,
          ib.expiry_date
        FROM item_batches ib
        JOIN items i ON i.id = ib.item_id
        WHERE ib.item_id = $1
      `, [itemId]);

      console.log(`📦 Item: ${itemId}`);
      if (result.rows.length > 0) {
        result.rows.forEach(batch => {
          console.log(`  - ${batch.item_name}`);
          console.log(`    Batch: ${batch.batch_number}`);
          console.log(`    Qty: ${batch.quantity}, Cost: $${batch.unit_cost}, Price: $${batch.selling_price}`);
          console.log(`    Expiry: ${batch.expiry_date || 'N/A'}\n`);
        });
      } else {
        console.log(`  ⚠️  No batches found\n`);
      }
    }

    // Count total batches
    const totalResult = await pool.query(`SELECT COUNT(*) as total FROM item_batches`);
    console.log(`\n📊 Total batches in database: ${totalResult.rows[0].total}\n`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkBatches();
