import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);

async function checkPentaItem() {
  try {
    console.log("Searching for 'penta' item in database...\n");

    // Search in items table
    const itemsResult = await sql`
      SELECT id, name, itemcode, item_type, is_active, workspace_id
      FROM items
      WHERE name ILIKE '%penta%'
         OR itemcode ILIKE '%penta%'
         OR generic_name ILIKE '%penta%'
    `;
    console.log("Items table results:", itemsResult);

    // Search in global_drugs table
    const globalDrugsResult = await sql`
      SELECT drugid, name, genericname, isactive
      FROM global_drugs
      WHERE name ILIKE '%penta%'
         OR genericname ILIKE '%penta%'
    `;
    console.log("\nGlobal drugs table results:", globalDrugsResult);

    // Check if item exists but might be filtered out
    if (itemsResult.length > 0) {
      const itemId = itemsResult[0].id;
      console.log(`\nChecking item ${itemId} details...`);
      
      // Check if item has stock in pharmacy warehouse
      const stockResult = await sql`
        SELECT ist.quantity, ist.reserved_quantity, ib.warehouse_id, w.warehouse_type
        FROM inventory_stock ist
        JOIN item_batches ib ON ib.id = ist.batch_id
        JOIN warehouses w ON w.id = ib.warehouse_id
        WHERE ist.item_id = ${itemId}
      `;
      console.log("Stock in warehouses:", stockResult);

      // Check if item is in pharmacy warehouses
      const pharmacyWhResult = await sql`
        SELECT w.id, w.warehouse_type, w.is_active
        FROM warehouses w
        WHERE w.warehouse_type = 'pharmacy' AND w.is_active = true
      `;
      console.log("\nPharmacy warehouses:", pharmacyWhResult);
    }

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await sql.end();
  }
}

checkPentaItem();
