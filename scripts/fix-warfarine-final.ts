import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixWarfarineFinal() {
  const batchId = 'a21abc49-d40f-44e1-a7c8-4cd77fd1a1a9';
  const correctQty = 40;
  
  const updateQuery = `
    UPDATE inventory_stock
    SET quantity = $1
    WHERE batch_id = $2
  `;
  
  const result = await pool.query(updateQuery, [correctQty, batchId]);
  console.log(`Updated inventory_stock for batch ${batchId} to quantity ${correctQty}`);
  console.log(`Rows affected: ${result.rowCount}`);
  
  await pool.end();
}

fixWarfarineFinal().catch(console.error);
