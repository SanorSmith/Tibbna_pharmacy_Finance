import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkParacetamol() {
  console.log('=== Checking Paracetamol items and stock ===\n');

  // 1. Find all Paracetamol items
  const itemsQuery = `
    SELECT id, name, generic_name, item_type, drug_id
    FROM items
    WHERE name ILIKE '%paracetamol%'
    ORDER BY name
  `;
  const items = await pool.query(itemsQuery);
  console.log(`Found ${items.rows.length} Paracetamol items:`);
  items.rows.forEach(item => {
    console.log(`  - ID: ${item.id}, Name: ${item.name}, Generic: ${item.generic_name}, DrugID: ${item.drug_id}`);
  });

  // 2. Check batches and stock for each item
  for (const item of items.rows) {
    console.log(`\n--- Item: ${item.name} (${item.id}) ---`);
    
    // Check batches
    const batchesQuery = `
      SELECT id, batch_number, expiry_date, is_quarantined, unit_cost, selling_price, quantity
      FROM item_batches
      WHERE item_id = $1
      ORDER BY expiry_date ASC NULLS LAST
    `;
    const batches = await pool.query(batchesQuery, [item.id]);
    console.log(`  Batches: ${batches.rows.length}`);
    batches.rows.forEach(b => {
      console.log(`    - Batch: ${b.batch_number || b.id}, Exp: ${b.expiry_date}, Quarantined: ${b.is_quarantined}, Qty: ${b.quantity}, Cost: ${b.unit_cost}, Price: ${b.selling_price}`);
    });

    // Check inventory_stock
    const stockQuery = `
      SELECT batch_id, quantity, reserved_quantity
      FROM inventory_stock
      WHERE item_id = $1
    `;
    const stock = await pool.query(stockQuery, [item.id]);
    console.log(`  Inventory Stock records: ${stock.rows.length}`);
    stock.rows.forEach(s => {
      console.log(`    - BatchID: ${s.batch_id}, Qty: ${s.quantity}, Reserved: ${s.reserved_quantity}`);
    });

    // Calculate what the POS API would return
    const availableStockQuery = `
      SELECT COALESCE(SUM(ist.quantity), 0) as availablestock
      FROM inventory_stock ist
      LEFT JOIN item_batches ib ON ib.id = ist.batch_id AND ib.item_id = ist.item_id
      WHERE ist.item_id = $1
        AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP OR ib.id IS NULL)
        AND (ib.is_quarantined = false OR ib.id IS NULL)
        AND ist.quantity > 0
    `;
    const availableStock = await pool.query(availableStockQuery, [item.id]);
    console.log(`  POS API availablestock: ${availableStock.rows[0].availablestock}`);

    // Get selling price from API logic
    const priceQuery = `
      SELECT ib.selling_price
      FROM item_batches ib
      WHERE ib.item_id = $1
        AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP)
        AND ib.is_quarantined = false
      ORDER BY ib.expiry_date ASC NULLS LAST
      LIMIT 1
    `;
    const price = await pool.query(priceQuery, [item.id]);
    console.log(`  POS API sellingprice: ${price.rows[0]?.selling_price || 'NULL'}`);
  }

  await pool.end();
}

checkParacetamol().catch(console.error);
