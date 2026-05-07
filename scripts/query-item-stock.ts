import { db } from "../lib/db";
import { sql } from "drizzle-orm";

async function queryItemStock() {
  try {
    // Find the item by name
    const item = await db.execute(sql`
      SELECT id, name, generic_name FROM items 
      WHERE name ILIKE '%ILoprost%' OR generic_name ILIKE '%ILoprost%'
      LIMIT 1
    `);
    
    if (!item || (item as any).length === 0) {
      console.log("Item not found");
      process.exit(0);
    }
    
    const itemId = (item as any)[0].id;
    const itemName = (item as any)[0].name;
    console.log(`Item found: ${itemName} (ID: ${itemId})`);
    
    // Get inventory stock for this item
    const stock = await db.execute(sql`
      SELECT ist.item_id, ist.batch_id, ist.warehouse_id, ist.quantity, ist.last_updated,
             ib.batch_number, ib.expiry_date,
             w.name as warehouse_name
      FROM inventory_stock ist
      JOIN item_batches ib ON ib.id = ist.batch_id AND ib.item_id = ist.item_id
      LEFT JOIN warehouses w ON w.id = ist.warehouse_id
      WHERE ist.item_id = ${itemId}
      ORDER BY ib.expiry_date ASC NULLS LAST
    `);
    
    console.log("\nInventory stock:");
    console.log(JSON.stringify(stock, null, 2));
    
    // Calculate total stock
    const totalStock = await db.execute(sql`
      SELECT SUM(quantity) as total FROM inventory_stock WHERE item_id = ${itemId}
    `);
    console.log(`\nTotal stock: ${(totalStock as any)[0]?.total || 0}`);
    
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
  process.exit(0);
}

queryItemStock();
