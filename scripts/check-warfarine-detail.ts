import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkWarfarineDetail() {
  const itemId = 'c22576ec-12e7-4437-9b58-bade78425057';
  
  console.log(`=== WARFARINE SODIUM DETAIL (${itemId}) ===\n`);
  
  // Check item_batches
  const batchesQuery = `
    SELECT id, batch_number, quantity, expiry_date, is_quarantined
    FROM item_batches
    WHERE item_id = $1
  `;
  const batches = await pool.query(batchesQuery, [itemId]);
  console.log('item_batches records:');
  batches.rows.forEach(b => {
    console.log(`  - ID: ${b.id}, Batch: ${b.batch_number}, Qty: ${b.quantity}, Exp: ${b.expiry_date}, Quarantined: ${b.is_quarantined}`);
  });
  console.log(`Total batch quantity: ${batches.rows.reduce((sum, b) => sum + Number(b.quantity), 0)}`);
  
  // Check inventory_stock
  const stockQuery = `
    SELECT id, batch_id, quantity, reserved_quantity
    FROM inventory_stock
    WHERE item_id = $1
  `;
  const stock = await pool.query(stockQuery, [itemId]);
  console.log('\ninventory_stock records:');
  stock.rows.forEach(s => {
    console.log(`  - ID: ${s.id}, BatchID: ${s.batch_id}, Qty: ${s.quantity}, Reserved: ${s.reserved_quantity}`);
  });
  console.log(`Total stock quantity: ${stock.rows.reduce((sum, s) => sum + Number(s.quantity), 0)}`);
  
  await pool.end();
}

checkWarfarineDetail().catch(console.error);
