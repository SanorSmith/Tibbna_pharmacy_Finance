import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function syncInventoryStock() {
  console.log('=== SYNCING INVENTORY_STOCK WITH ITEM_BATCHES ===\n');

  try {
    // Update inventory_stock to match item_batches quantities
    const updateQuery = `
      UPDATE inventory_stock ist
      SET quantity = (
        SELECT SUM(ib.quantity)
        FROM item_batches ib
        WHERE ib.id = ist.batch_id
      )
      WHERE ist.batch_id IS NOT NULL
    `;
    
    const result = await pool.query(updateQuery);
    console.log(`Updated ${result.rowCount} inventory_stock records`);

    // Verify the sync
    const verifyQuery = `
      SELECT 
        COUNT(*) as mismatched_items
      FROM (
        SELECT 
          i.id,
          COALESCE(SUM(ist.quantity), 0) as stock_qty,
          COALESCE(SUM(ib.quantity), 0) as batch_qty
        FROM items i
        LEFT JOIN inventory_stock ist ON ist.item_id = i.id
        LEFT JOIN item_batches ib ON ib.item_id = i.id
        GROUP BY i.id
      ) t
      WHERE stock_qty != batch_qty
    `;
    
    const verify = await pool.query(verifyQuery);
    console.log(`Remaining mismatched items: ${verify.rows[0].mismatched_items}`);

    console.log('\n=== SYNC COMPLETE ===');
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

syncInventoryStock();
