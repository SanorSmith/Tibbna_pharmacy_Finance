import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkNullBatches() {
  console.log('=== CHECKING INVENTORY_STOCK WITH NULL BATCH_ID ===\n');

  // Find inventory_stock records with null batch_id
  const nullBatchQuery = `
    SELECT 
      ist.id,
      ist.item_id,
      i.name,
      ist.quantity,
      ist.batch_id
    FROM inventory_stock ist
    JOIN items i ON i.id = ist.item_id
    WHERE ist.batch_id IS NULL
  `;
  const nullBatches = await pool.query(nullBatchQuery);
  console.log(`inventory_stock records with NULL batch_id: ${nullBatches.rows.length}`);
  nullBatches.rows.forEach(row => {
    console.log(`  - ${row.name} (${row.item_id}): Qty=${row.quantity}, BatchID=${row.batch_id}`);
  });

  // Calculate total quantity in inventory_stock without batch_id
  const totalNullQuery = `
    SELECT SUM(quantity) as total
    FROM inventory_stock
    WHERE batch_id IS NULL
  `;
  const totalNull = await pool.query(totalNullQuery);
  console.log(`\nTotal quantity without batch_id: ${totalNull.rows[0].total}`);

  // Find items that have inventory_stock but their batch_id doesn't match any item_batches
  const orphanedQuery = `
    SELECT 
      ist.id,
      ist.item_id,
      i.name,
      ist.quantity,
      ist.batch_id
    FROM inventory_stock ist
    JOIN items i ON i.id = ist.item_id
    WHERE ist.batch_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM item_batches ib 
        WHERE ib.id = ist.batch_id
      )
  `;
  const orphaned = await pool.query(orphanedQuery);
  console.log(`\ninventory_stock records with invalid batch_id: ${orphaned.rows.length}`);
  orphaned.rows.forEach(row => {
    console.log(`  - ${row.name} (${row.item_id}): Qty=${row.quantity}, BatchID=${row.batch_id}`);
  });

  await pool.end();
}

checkNullBatches().catch(console.error);
