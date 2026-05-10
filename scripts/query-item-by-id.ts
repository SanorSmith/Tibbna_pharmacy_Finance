import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

async function queryItem() {
  const itemId = "202a55a8-ba27-40b2-93b9-cd7f6777f444";
  
  const result = await db.execute(sql`
    SELECT 
      i.id,
      i.name,
      i.drug_id,
      i.item_type,
      i.manufacturer,
      ist.quantity,
      ist.reserved_quantity,
      ist.batch_id,
      ib.batch_number,
      ib.expiry_date
    FROM inventory_stock ist
    JOIN items i ON i.id = ist.item_id
    LEFT JOIN item_batches ib ON ib.id = ist.batch_id
    WHERE ist.item_id = ${itemId}
  `);
  
  console.log("Result:", result);
}

queryItem().catch(console.error);
