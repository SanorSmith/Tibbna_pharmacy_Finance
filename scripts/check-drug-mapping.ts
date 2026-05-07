import { db } from "../lib/db";
import { sql } from "drizzle-orm";

async function checkDrugMapping() {
  try {
    // Check if items table has drug_id column
    const columns = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'items' AND column_name = 'drug_id'
    `);
    console.log("drug_id column exists in items table:", (columns as any).length > 0);

    // Check the ILoprost drug in old drugs table
    const drug = await db.execute(sql`
      SELECT drugid, name FROM drugs WHERE drugid = '0dfd76f1-7e6e-4397-a9b8-84d98b35c364'
    `);
    console.log("\nDrug in old drugs table:");
    console.log(JSON.stringify(drug, null, 2));

    // Check if there's an item with drug_id matching
    const itemByDrugId = await db.execute(sql`
      SELECT id, name, drug_id FROM items WHERE drug_id = '0dfd76f1-7e6e-4397-a9b8-84d98b35c364'
    `);
    console.log("\nItem in items table with matching drug_id:");
    console.log(JSON.stringify(itemByDrugId, null, 2));

    // Check all items with drug_id
    const itemsWithDrugId = await db.execute(sql`
      SELECT id, name, drug_id FROM items WHERE drug_id IS NOT NULL LIMIT 10
    `);
    console.log("\nAll items with drug_id:");
    console.log(JSON.stringify(itemsWithDrugId, null, 2));

    // Check the ILoprost item by name
    const itemByName = await db.execute(sql`
      SELECT id, name, drug_id FROM items WHERE name ILIKE '%ILoprost%'
    `);
    console.log("\nItem in items table by name:");
    console.log(JSON.stringify(itemByName, null, 2));

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
  process.exit(0);
}

checkDrugMapping();
