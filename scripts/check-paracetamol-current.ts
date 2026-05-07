import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkParacetamolStock() {
  console.log("Checking Paracetamol items in database...\n");

  const results = await pool.query(`
    SELECT 
      i.id as "itemId",
      i.name as "name",
      i.generic_name as "genericName",
      COALESCE(SUM(ist.quantity), 0) as "totalStock",
      (SELECT SUM(ib.quantity) FROM item_batches ib WHERE ib.item_id = i.id) as "batchQuantity"
    FROM items i
    LEFT JOIN inventory_stock ist ON ist.item_id = i.id
    WHERE i.name ILIKE '%Paracetamol%' 
       OR i.generic_name ILIKE '%Paracetamol%'
    GROUP BY i.id, i.name, i.generic_name
    ORDER BY "totalStock" DESC
  `);

  console.log("Paracetamol items:");
  console.table(results.rows);

  // Also check the specific item with 1000 stock
  const item1000 = await pool.query(`
    SELECT 
      i.id,
      i.name,
      i.generic_name,
      ib.id as "batchId",
      ib.quantity as "batchQuantity",
      ib.expiry_date,
      ist.quantity as "stockQuantity"
    FROM items i
    LEFT JOIN item_batches ib ON ib.item_id = i.id
    LEFT JOIN inventory_stock ist ON ist.batch_id = ib.id
    WHERE i.id = '37a59302-f0b7-4aa1-bfad-7fd53ae13b6b'
  `);

  console.log("\nItem with supposed 1000 stock:");
  console.table(item1000.rows);

  await pool.end();
}

checkParacetamolStock()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
