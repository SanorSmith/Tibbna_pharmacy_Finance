import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function findOrphans() {
  console.log('=== CHECKING ORPHANED RECORDS ===\n');

  // Items with inventory_stock but no item_batches
  const stockOrphansQuery = `
    SELECT 
      i.id,
      i.name,
      SUM(ist.quantity) as stock_qty
    FROM inventory_stock ist
    JOIN items i ON i.id = ist.item_id
    WHERE NOT EXISTS (
      SELECT 1 FROM item_batches ib WHERE ib.item_id = i.id
    )
    GROUP BY i.id, i.name
  `;
  const stockOrphans = await pool.query(stockOrphansQuery);
  console.log(`Items with inventory_stock but NO item_batches: ${stockOrphans.rows.length}`);
  stockOrphans.rows.forEach(row => {
    console.log(`  - ${row.name} (${row.id}): Stock=${row.stock_qty}`);
  });

  // Items with item_batches but no inventory_stock
  const batchOrphansQuery = `
    SELECT 
      i.id,
      i.name,
      SUM(ib.quantity) as batch_qty
    FROM item_batches ib
    JOIN items i ON i.id = ib.item_id
    WHERE NOT EXISTS (
      SELECT 1 FROM inventory_stock ist WHERE ist.item_id = i.id
    )
    GROUP BY i.id, i.name
  `;
  const batchOrphans = await pool.query(batchOrphansQuery);
  console.log(`\nItems with item_batches but NO inventory_stock: ${batchOrphans.rows.length}`);
  batchOrphans.rows.forEach(row => {
    console.log(`  - ${row.name} (${row.id}): Batch=${row.batch_qty}`);
  });

  // Check the remaining mismatch
  const mismatchQuery = `
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
  const mismatch = await pool.query(mismatchQuery);
  console.log(`\nRemaining mismatched item:`);
  mismatch.rows.forEach(row => {
    console.log(`  - ${row.name} (${row.id}): Stock=${row.stock_qty}, Batch=${row.batch_qty}`);
  });

  await pool.end();
}

findOrphans().catch(console.error);
