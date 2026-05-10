import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkInventoryStatus() {
  console.log('=== Checking Inventory Status ===\n');

  // 1. Check inventory_stock table
  console.log('1. INVENTORY_STOCK table:');
  const stockQuery = `
    SELECT 
      COUNT(*) as total_records,
      COUNT(CASE WHEN quantity > 0 THEN 1 END) as records_with_stock,
      COUNT(CASE WHEN quantity = 0 THEN 1 END) as records_zero_stock,
      SUM(quantity) as total_quantity,
      SUM(reserved_quantity) as total_reserved
    FROM inventory_stock
  `;
  const stockStatus = await pool.query(stockQuery);
  console.log(`   Total records: ${stockStatus.rows[0].total_records}`);
  console.log(`   Records with stock > 0: ${stockStatus.rows[0].records_with_stock}`);
  console.log(`   Records with stock = 0: ${stockStatus.rows[0].records_zero_stock}`);
  console.log(`   Total quantity: ${stockStatus.rows[0].total_quantity}`);
  console.log(`   Total reserved: ${stockStatus.rows[0].total_reserved}`);

  // 2. Check item_batches table
  console.log('\n2. ITEM_BATCHES table:');
  const batchesQuery = `
    SELECT 
      COUNT(*) as total_batches,
      COUNT(CASE WHEN quantity > 0 THEN 1 END) as batches_with_stock,
      COUNT(CASE WHEN quantity = 0 THEN 1 END) as batches_zero_stock,
      SUM(quantity) as total_batch_quantity,
      COUNT(CASE WHEN is_quarantined = true THEN 1 END) as quarantined_batches,
      COUNT(CASE WHEN expiry_date < CURRENT_TIMESTAMP THEN 1 END) as expired_batches
    FROM item_batches
  `;
  const batchesStatus = await pool.query(batchesQuery);
  console.log(`   Total batches: ${batchesStatus.rows[0].total_batches}`);
  console.log(`   Batches with stock > 0: ${batchesStatus.rows[0].batches_with_stock}`);
  console.log(`   Batches with stock = 0: ${batchesStatus.rows[0].batches_zero_stock}`);
  console.log(`   Total batch quantity: ${batchesStatus.rows[0].total_batch_quantity}`);
  console.log(`   Quarantined batches: ${batchesStatus.rows[0].quarantined_batches}`);
  console.log(`   Expired batches: ${batchesStatus.rows[0].expired_batches}`);

  // 3. Check relationship between inventory_stock and item_batches
  console.log('\n3. RELATIONSHIP: inventory_stock vs item_batches');
  const relationQuery = `
    SELECT 
      COUNT(DISTINCT ist.item_id) as items_in_stock,
      COUNT(DISTINCT ib.item_id) as items_in_batches,
      COUNT(DISTINCT CASE WHEN ist.batch_id IS NOT NULL THEN ist.item_id END) as items_with_batch_link,
      COUNT(DISTINCT CASE WHEN ist.batch_id IS NULL THEN ist.item_id END) as items_without_batch_link
    FROM inventory_stock ist
    FULL OUTER JOIN item_batches ib ON ib.id = ist.batch_id
  `;
  const relation = await pool.query(relationQuery);
  console.log(`   Items in inventory_stock: ${relation.rows[0].items_in_stock}`);
  console.log(`   Items in item_batches: ${relation.rows[0].items_in_batches}`);
  console.log(`   Items with batch link: ${relation.rows[0].items_with_batch_link}`);
  console.log(`   Items without batch link: ${relation.rows[0].items_without_batch_link}`);

  // 4. Check specific sample - Paracetamol
  console.log('\n4. SAMPLE: Paracetamol items');
  const sampleQuery = `
    SELECT 
      i.id,
      i.name,
      i.generic_name,
      COALESCE(SUM(ist.quantity), 0) as stock_quantity,
      COALESCE(SUM(ib.quantity), 0) as batch_quantity
    FROM items i
    LEFT JOIN inventory_stock ist ON ist.item_id = i.id
    LEFT JOIN item_batches ib ON ib.item_id = i.id
    WHERE i.name ILIKE '%paracetamol%'
    GROUP BY i.id, i.name, i.generic_name
    ORDER BY i.name
    LIMIT 5
  `;
  const sample = await pool.query(sampleQuery);
  console.log(`   Found ${sample.rows.length} Paracetamol items:`);
  sample.rows.forEach(row => {
    console.log(`   - ${row.name} (${row.id}):`);
    console.log(`     Stock quantity: ${row.stock_quantity}`);
    console.log(`     Batch quantity: ${row.batch_quantity}`);
    console.log(`     Match: ${row.stock_quantity === row.batch_quantity ? 'YES' : 'NO'}`);
  });

  // 5. Check if inventory_stock matches item_batches
  console.log('\n5. DATA CONSISTENCY CHECK:');
  const consistencyQuery = `
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
  const consistency = await pool.query(consistencyQuery);
  console.log(`   Items with mismatched stock/batch quantities: ${consistency.rows[0].mismatched_items}`);

  await pool.end();
}

checkInventoryStatus().catch(console.error);
