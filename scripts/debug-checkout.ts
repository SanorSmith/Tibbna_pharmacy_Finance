import { db } from "../lib/db";
import { sql } from "drizzle-orm";

async function debugCheckout() {
  try {
    // Check last POS sale
    const lastSale = await db.execute(sql`
      SELECT * FROM pos_sales ORDER BY createdat DESC LIMIT 1
    `);
    console.log("Last POS sale:");
    console.log(JSON.stringify(lastSale, null, 2));

    // Check last POS sale items
    const lastSaleItems = await db.execute(sql`
      SELECT * FROM pos_sale_items ORDER BY createdat DESC LIMIT 5
    `);
    console.log("\nLast POS sale items:");
    console.log(JSON.stringify(lastSaleItems, null, 2));

    // Check inventory stock for the item
    const inventoryStock = await db.execute(sql`
      SELECT item_id, batch_id, warehouse_id, quantity, last_updated 
      FROM inventory_stock 
      WHERE item_id = '10826e5e-371c-4b98-9c72-eb7ff890fdd5'
      ORDER BY last_updated DESC 
      LIMIT 5
    `);
    console.log("\nInventory stock for item 10826e5e-371c-4b98-9c72-eb7ff890fdd5:");
    console.log(JSON.stringify(inventoryStock, null, 2));

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
  process.exit(0);
}

debugCheckout();
