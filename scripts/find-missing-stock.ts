import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function findMissingStock() {
  console.log('=== FINDING ITEM_BATCHES WITHOUT INVENTORY_STOCK ===\n');

  const query = `
    SELECT 
      ib.id as batch_id,
      ib.item_id,
      i.name,
      ib.batch_number,
      ib.quantity as batch_quantity
    FROM item_batches ib
    JOIN items i ON i.id = ib.item_id
    WHERE NOT EXISTS (
      SELECT 1 FROM inventory_stock ist 
      WHERE ist.batch_id = ib.id
    )
  `;
  
  const result = await pool.query(query);
  console.log(`item_batches without inventory_stock: ${result.rows.length}`);
  result.rows.forEach(row => {
    console.log(`  - ${row.name}: Batch=${row.batch_number || row.batch_id}, Qty=${row.batch_quantity}`);
  });
  
  const totalMissing = result.rows.reduce((sum, row) => sum + Number(row.batch_quantity), 0);
  console.log(`\nTotal missing quantity: ${totalMissing}`);
  
  await pool.end();
}

findMissingStock().catch(console.error);
