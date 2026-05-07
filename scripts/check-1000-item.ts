import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check1000Item() {
  console.log("Checking if item with 1000 stock appears in search...\n");

  // Get the 1000 stock item details
  const item1000 = await pool.query(`
    SELECT
      i.id as "itemId",
      i.name as "name",
      i.generic_name as "genericName",
      i.item_type as "itemType",
      COALESCE((
        SELECT SUM(ist.quantity)
        FROM inventory_stock ist
        LEFT JOIN item_batches ib ON ib.id = ist.batch_id AND ib.item_id = ist.item_id
        WHERE ist.item_id = i.id
          AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP OR ib.id IS NULL)
          AND (ib.is_quarantined = false OR ib.id IS NULL)
          AND ist.quantity > 0
      ), 0) as "availablestock",
      (
        SELECT ib.selling_price
        FROM item_batches ib
        WHERE ib.item_id = i.id
          AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP)
          AND ib.is_quarantined = false
        ORDER BY ib.expiry_date ASC NULLS LAST
        LIMIT 1
      ) as "sellingprice"
    FROM items i
    WHERE i.id = '37a59302-f0b7-4aa1-bfad-7fd53ae13b6b'
  `);

  console.log("Item with 1000 stock:");
  console.table(item1000.rows);

  // Check if it matches search criteria
  const searchMatch = await pool.query(`
    SELECT
      i.id as "itemId",
      i.name as "name",
      i.item_type as "itemType",
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
      AND i.id = '37a59302-f0b7-4aa1-bfad-7fd53ae13b6b'
  `);

  console.log("\nDoes it match search criteria for 'para'?");
  console.table(searchMatch.rows);

  // Get top 5 search results
  const top5 = await pool.query(`
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
      AND (i.name ILIKE '%para%'
           OR i.generic_name ILIKE '%para%'
           OR i.barcode = 'para')
    ORDER BY i.name
    LIMIT 5
  `);

  console.log("\nTop 5 search results ordered by name:");
  console.table(top5.rows);

  await pool.end();
}

check1000Item()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
