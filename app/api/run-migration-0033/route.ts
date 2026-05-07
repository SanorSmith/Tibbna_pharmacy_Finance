import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    console.log("Running migration 0033: Drop FK constraint on pos_sale_items.batchid");
    
    await db.execute(sql`
      ALTER TABLE pos_sale_items DROP CONSTRAINT IF EXISTS pos_sale_items_batchid_drug_batches_batchid_fk
    `);
    
    console.log("✓ Migration completed successfully");
    return NextResponse.json({ success: true, message: "Migration completed successfully" });
  } catch (error) {
    console.error("✗ Migration failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
