import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function findMismatched() {
  const query = `
    SELECT 
      i.id,
      i.name,
      i.generic_name,
      COALESCE(SUM(ist.quantity), 0) as stock_qty,
      COALESCE(SUM(ib.quantity), 0) as batch_qty
    FROM items i
    LEFT JOIN inventory_stock ist ON ist.item_id = i.id
    LEFT JOIN item_batches ib ON ib.item_id = i.id
    GROUP BY i.id, i.name, i.generic_name
    HAVING COALESCE(SUM(ist.quantity), 0) != COALESCE(SUM(ib.quantity), 0)
  `;
  
  const result = await pool.query(query);
  console.log('Mismatched items:');
  result.rows.forEach(row => {
    console.log(`- ${row.name} (${row.id}): Stock=${row.stock_qty}, Batch=${row.batch_qty}`);
  });
  
  await pool.end();
}

findMismatched().catch(console.error);
