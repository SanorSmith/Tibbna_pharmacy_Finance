import { db } from "../lib/db";
import { sql } from "drizzle-orm";

async function runMigration() {
  console.log("Running migration 0033: Drop FK constraint on pos_sale_items.batchid");
  
  try {
    await db.execute(sql`
      ALTER TABLE pos_sale_items DROP CONSTRAINT IF EXISTS pos_sale_items_batchid_drug_batches_batchid_fk
    `);
    console.log("✓ Migration completed successfully");
  } catch (error) {
    console.error("✗ Migration failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

runMigration();
