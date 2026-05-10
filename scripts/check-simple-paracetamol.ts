import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkSimpleParacetamol() {
  console.log('=== CHECKING SIMPLE PARACETAMOL ===\n');

  // Find simple Paracetamol (not combinations)
  const query = `
    SELECT 
      i.id,
      i.name,
      i.generic_name,
      COALESCE(SUM(ist.quantity), 0) as stock_quantity,
      COALESCE(SUM(ib.quantity), 0) as batch_quantity
    FROM items i
    LEFT JOIN inventory_stock ist ON ist.item_id = i.id
    LEFT JOIN item_batches ib ON ib.item_id = i.id
    WHERE i.name = 'Paracetamol'
       OR i.name ILIKE 'paracetamol'
    GROUP BY i.id, i.name, i.generic_name
    ORDER BY i.name
  `;
  
  const result = await pool.query(query);
  console.log(`Found ${result.rows.length} simple Paracetamol items:`);
  result.rows.forEach(row => {
    console.log(`- ${row.name} (${row.id}):`);
    console.log(`  Generic: ${row.generic_name}`);
    console.log(`  Stock quantity: ${row.stock_quantity}`);
    console.log(`  Batch quantity: ${row.batch_quantity}`);
  });
  
  await pool.end();
}

checkSimpleParacetamol().catch(console.error);
