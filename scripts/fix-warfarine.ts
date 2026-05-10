import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixWarfarine() {
  const itemId = 'c22576ec-12e7-4437-9b58-bade78425057';
  
  // Get the correct quantity from item_batches
  const batchQuery = `
    SELECT SUM(quantity) as total_batch_qty
    FROM item_batches
    WHERE item_id = $1
  `;
  const batchResult = await pool.query(batchQuery, [itemId]);
  const correctQty = batchResult.rows[0].total_batch_qty;
  
  console.log(`Warfarine sodium: Correct batch quantity = ${correctQty}`);
  
  // Update inventory_stock to match
  const updateQuery = `
    UPDATE inventory_stock
    SET quantity = $1
    WHERE item_id = $2
  `;
  const updateResult = await pool.query(updateQuery, [correctQty, itemId]);
  console.log(`Updated ${updateResult.rowCount} inventory_stock records`);
  
  await pool.end();
}

fixWarfarine().catch(console.error);
