import { Pool } from 'pg';
import { randomUUID } from 'crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createMissingStock() {
  console.log('=== CREATING MISSING INVENTORY_STOCK RECORDS ===\n');

  // Get batches without inventory_stock
  const query = `
    SELECT 
      ib.id as batch_id,
      ib.item_id,
      ib.warehouse_id,
      ib.quantity
    FROM item_batches ib
    WHERE NOT EXISTS (
      SELECT 1 FROM inventory_stock ist 
      WHERE ist.batch_id = ib.id
    )
  `;
  
  const batches = await pool.query(query);
  console.log(`Found ${batches.rows.length} batches without inventory_stock`);
  
  for (const batch of batches.rows) {
    const stockId = randomUUID();
    const insertQuery = `
      INSERT INTO inventory_stock (id, item_id, batch_id, warehouse_id, quantity, reserved_quantity)
      VALUES ($1, $2, $3, $4, $5, 0)
    `;
    await pool.query(insertQuery, [
      stockId,
      batch.item_id,
      batch.batch_id,
      batch.warehouse_id,
      batch.quantity
    ]);
    console.log(`Created inventory_stock for batch ${batch.batch_id}, quantity ${batch.quantity}`);
  }
  
  console.log('\n=== COMPLETE ===');
  await pool.end();
}

createMissingStock().catch(console.error);
