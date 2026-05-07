import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runChecks() {
  try {
    console.log('=== INVENTORY STATUS CHECK ===\n');

    // 1. Check inventory_stock table status
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

    // 2. Check item_batches table status
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

    // 3. Check Paracetamol specifically
    console.log('\n3. PARACETAMOL items:');
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

    // 4. Check data consistency
    console.log('\n4. DATA CONSISTENCY:');
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

    console.log('\n=== CHECK COMPLETE ===');
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

runChecks();
