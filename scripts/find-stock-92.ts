import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function findStock92() {
  console.log('=== FINDING ITEM WITH STOCK 92 ===\n');

  // Find items with stock close to 92
  const query = `
    SELECT 
      i.id,
      i.name,
      i.generic_name,
      COALESCE(SUM(ist.quantity), 0) as stock_quantity,
      COALESCE(SUM(ib.quantity), 0) as batch_quantity,
      (SELECT ib2.selling_price FROM item_batches ib2
        WHERE ib2.item_id = i.id
          AND (ib2.expiry_date IS NULL OR ib2.expiry_date > CURRENT_TIMESTAMP)
          AND ib2.is_quarantined = false
        ORDER BY ib2.expiry_date ASC NULLS LAST
        LIMIT 1) as selling_price
    FROM items i
    LEFT JOIN inventory_stock ist ON ist.item_id = i.id
    LEFT JOIN item_batches ib ON ib.item_id = i.id
    WHERE i.name ILIKE '%paracetamol%'
    GROUP BY i.id, i.name, i.generic_name
    HAVING COALESCE(SUM(ist.quantity), 0) > 0
    ORDER BY stock_quantity DESC
  `;
  
  const result = await pool.query(query);
  console.log(`Found ${result.rows.length} Paracetamol items with stock:`);
  result.rows.forEach(row => {
    console.log(`- ${row.name} (${row.id}):`);
    console.log(`  Generic: ${row.generic_name}`);
    console.log(`  Stock: ${row.stock_quantity}`);
    console.log(`  Batch: ${row.batch_quantity}`);
    console.log(`  Price: ${row.selling_price}`);
  });
  
  await pool.end();
}

findStock92().catch(console.error);
