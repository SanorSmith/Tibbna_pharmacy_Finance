import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const stockTransaction = await db.execute(sql`
      SELECT * FROM stock_transactions ORDER BY created_at DESC LIMIT 1
    `);
    
    const inventoryStock = await db.execute(sql`
      SELECT item_id, batch_id, warehouse_id, quantity, last_updated 
      FROM inventory_stock 
      ORDER BY last_updated DESC 
      LIMIT 5
    `);
    
    const specificItem = await db.execute(sql`
      SELECT 
        i.id,
        i.name,
        i.drug_id,
        i.item_type,
        i.manufacturer,
        ist.quantity,
        ist.reserved_quantity,
        ist.batch_id,
        ib.lot_number,
        ib.expiry_date
      FROM inventory_stock ist
      JOIN items i ON i.id = ist.item_id
      LEFT JOIN item_batches ib ON ib.id = ist.batch_id
      WHERE ist.item_id = '202a55a8-ba27-40b2-93b9-cd7f6777f444'
    `);
    
    return NextResponse.json({ 
      success: true, 
      stockTransaction,
      inventoryStock,
      specificItem
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
