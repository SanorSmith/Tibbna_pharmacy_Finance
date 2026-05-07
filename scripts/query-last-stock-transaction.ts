import { db } from "../lib/db";
import { sql } from "drizzle-orm";

async function queryLastStockTransaction() {
  try {
    const result = await db.execute(sql`
      SELECT * FROM stock_transactions ORDER BY created_at DESC LIMIT 1
    `);
    console.log("Last stock transaction:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
  process.exit(0);
}

queryLastStockTransaction();
