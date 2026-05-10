import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkSearchOrdering() {
  console.log("Simulating POS search for 'para'...\n");

  // This mimics the POS search API query
  const results = await pool.query(`
    SELECT
      i.id as "itemId",
      i.name as "name",
      i.generic_name as "genericName",
      i.barcode as "barcode",
      i.item_type as "itemType",
      -- Best batch selling price (show even if stock is 0)
      (
        SELECT ib.selling_price
        FROM item_batches ib
        WHERE ib.item_id = i.id
          AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP)
          AND ib.is_quarantined = false
        ORDER BY ib.expiry_date ASC NULLS LAST
        LIMIT 1
      ) as "sellingprice",
      -- Total available stock (including items without batches)
      COALESCE((
        SELECT SUM(ist.quantity)
        FROM inventory_stock ist
        LEFT JOIN item_batches ib ON ib.id = ist.batch_id AND ib.item_id = ist.item_id
        WHERE ist.item_id = i.id
          AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP OR ib.id IS NULL)
          AND (ib.is_quarantined = false OR ib.id IS NULL)
          AND ist.quantity > 0
      ), 0) as "availablestock"
    FROM items i
    WHERE i.item_type = 'drug'
      AND (i.name ILIKE '%para%'
           OR i.generic_name ILIKE '%para%'
           OR i.barcode = 'para')
    LIMIT 20
  `);

  console.log("Top 20 search results for 'para':");
  console.table(results.rows);

  // Check if the 1000 stock item appears
  const item1000InResults = results.rows.find((r: any) => r.itemId === '37a59302-f0b7-4aa1-bfad-7fd53ae13b6b');
  console.log(`\nItem with 1000 stock in search results: ${item1000InResults ? 'YES' : 'NO'}`);

  // Check all Paracetamol items with their positions
  const allParacetamol = await pool.query(`
    SELECT
      i.id as "itemId",
      i.name as "name",
      COALESCE((
        SELECT SUM(ist.quantity)
        FROM inventory_stock ist
        LEFT JOIN item_batches ib ON ib.id = ist.batch_id AND ib.item_id = ist.item_id
        WHERE ist.item_id = i.id
          AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP OR ib.id IS NULL)
          AND (ib.is_quarantined = false OR ib.id IS NULL)
          AND ist.quantity > 0
      ), 0) as "availablestock"
    FROM items i
    WHERE i.item_type = 'drug'
      AND (i.name ILIKE '%Paracetamol%'
           OR i.generic_name ILIKE '%Paracetamol%')
    ORDER BY "availablestock" DESC
  `);

  console.log("\nAll Paracetamol items ordered by stock:");
  console.table(allParacetamol.rows);

  await pool.end();
}

checkSearchOrdering()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
