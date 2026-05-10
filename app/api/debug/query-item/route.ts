import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const itemId = searchParams.get("itemId");
  
  if (!itemId) {
    return NextResponse.json({ error: "itemId parameter required" }, { status: 400 });
  }
  
  try {
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
        ib.lot_number,
        ib.expiry_date
      FROM inventory_stock ist
      JOIN items i ON i.id = ist.item_id
      LEFT JOIN item_batches ib ON ib.id = ist.batch_id
      WHERE ist.item_id = ${itemId}
    `);
    
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Query error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
