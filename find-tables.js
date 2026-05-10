const { Client } = require('pg');

async function checkMigrationReadiness() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  });

  try {
    await client.connect();
    
    console.log('=== POS Migration Readiness Check ===\n');
    
    // 1. Count items with drug_id link
    console.log('--- items table (with drug_id link) ---');
    const itemsWithDrug = await client.query(`
      SELECT COUNT(*) as total, 
             COUNT(drug_id) as with_drug_id,
             COUNT(*) - COUNT(drug_id) as without_drug_id
      FROM items
    `);
    console.log('Items:', itemsWithDrug.rows[0]);
    
    // 2. Count drugs without items link
    console.log('\n--- drugs without items link ---');
    const drugsWithoutItems = await client.query(`
      SELECT COUNT(*) as drugs_without_items
      FROM drugs d
      WHERE NOT EXISTS (SELECT 1 FROM items i WHERE i.drug_id = d.drugid)
    `);
    console.log('Drugs without items:', drugsWithoutItems.rows[0]);
    
    // 3. Count drugs with items link (name match)
    const drugsWithItemsByName = await client.query(`
      SELECT COUNT(*) as drugs_with_items_by_name
      FROM drugs d
      WHERE EXISTS (SELECT 1 FROM items i WHERE i.name = d.name)
    `);
    console.log('Drugs with items (by name match):', drugsWithItemsByName.rows[0]);
    
    // 4. item_batches data
    console.log('\n--- item_batches ---');
    const itemBatches = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(selling_price) as with_selling_price,
             COUNT(unit_cost) as with_unit_cost
      FROM item_batches
    `);
    console.log('Item batches:', itemBatches.rows[0]);
    
    // 5. inventory_stock data
    console.log('\n--- inventory_stock ---');
    const invStock = await client.query(`
      SELECT COUNT(*) as total,
             SUM(quantity) as total_quantity
      FROM inventory_stock
    `);
    console.log('Inventory stock:', invStock.rows[0]);
    
    // 6. stock_transactions data
    console.log('\n--- stock_transactions ---');
    const stockTx = await client.query(`
      SELECT COUNT(*) as total
      FROM stock_transactions
    `);
    console.log('Stock transactions:', stockTx.rows[0]);
    
    // 7. warehouses
    console.log('\n--- warehouses ---');
    const warehouses = await client.query(`
      SELECT id, name, warehouse_type, is_active
      FROM warehouses
      ORDER BY name
    `);
    console.log('Warehouses:', warehouses.rows);
    
    // 8. Compare OLD vs NEW system counts
    console.log('\n--- OLD SYSTEM (drug_batches + pharmacy_stock_levels) ---');
    const oldSystem = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM drug_batches) as drug_batches_count,
        (SELECT COUNT(*) FROM pharmacy_stock_levels) as stock_levels_count,
        (SELECT COALESCE(SUM(quantity), 0) FROM pharmacy_stock_levels) as old_total_stock
    `);
    console.log('Old system:', oldSystem.rows[0]);
    
    console.log('\n--- NEW SYSTEM (item_batches + inventory_stock) ---');
    const newSystem = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM item_batches) as item_batches_count,
        (SELECT COUNT(*) FROM inventory_stock) as inv_stock_count,
        (SELECT COALESCE(SUM(quantity), 0) FROM inventory_stock) as new_total_stock
    `);
    console.log('New system:', newSystem.rows[0]);
    
    // 9. Sample items with drug_id, batch, and stock
    console.log('\n--- Sample items with full chain (items → item_batches → inventory_stock) ---');
    const sampleItems = await client.query(`
      SELECT i.id, i.name, i.drug_id, i.item_type,
             ib.selling_price, ib.unit_cost, ib.batch_number, ib.quantity as batch_qty,
             COALESCE(ist.quantity, 0) as inv_stock_qty
      FROM items i
      LEFT JOIN item_batches ib ON ib.item_id = i.id
      LEFT JOIN inventory_stock ist ON ist.item_id = i.id AND ist.batch_id = ib.id
      LIMIT 10
    `);
    sampleItems.rows.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.name} | drug_id: ${row.drug_id} | price: ${row.selling_price} | batch_qty: ${row.batch_qty} | inv_stock: ${row.inv_stock_qty}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkMigrationReadiness();
