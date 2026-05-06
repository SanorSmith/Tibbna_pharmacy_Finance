/**
 * Admin API: Cleanup items with zero stock
 * GET - Preview items that will be deleted
 * DELETE - Actually delete the items
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, itemBatches, inventoryStock } from "@/lib/db/schema";
import { eq, and, notExists, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find items with no stock (either no batches/stock records, or all batches have 0 quantity)
    const zeroStockItems = await db.execute(sql`
      SELECT 
        i.id,
        i.name,
        i.itemcode,
        i.item_type,
        i.inventory_category,
        i.created_at,
        i.workspace_id
      FROM items i
      WHERE (i.inventory_category = 'pharmacy' OR i.inventorycategory = 'pharmacy')
        AND i.is_active = true
        AND (
          -- No batches or stock records at all
          (
            NOT EXISTS (SELECT 1 FROM item_batches ib WHERE ib.item_id = i.id)
            AND NOT EXISTS (SELECT 1 FROM inventory_stock ist WHERE ist.item_id = i.id)
          )
          OR
          -- Has stock records but total quantity is 0
          (
            EXISTS (SELECT 1 FROM inventory_stock ist WHERE ist.item_id = i.id)
            AND NOT EXISTS (
              SELECT 1 FROM inventory_stock ist2 
              WHERE ist2.item_id = i.id AND ist2.quantity > 0
            )
          )
        )
      ORDER BY i.created_at DESC
    `);

    return NextResponse.json({
      count: zeroStockItems.length,
      items: zeroStockItems,
      message: `Found ${zeroStockItems.length} items with no stock history`
    });
  } catch (error) {
    console.error("Error finding zero-stock items:", error);
    return NextResponse.json(
      { error: "Failed to find zero-stock items" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete items with no stock (either no batches/stock records, or all batches have 0 quantity)
    const result = await db.execute(sql`
      DELETE FROM items
      WHERE id IN (
        SELECT i.id
        FROM items i
        WHERE (i.inventory_category = 'pharmacy' OR i.inventorycategory = 'pharmacy')
          AND i.is_active = true
          AND (
            -- No batches or stock records at all
            (
              NOT EXISTS (SELECT 1 FROM item_batches ib WHERE ib.item_id = i.id)
              AND NOT EXISTS (SELECT 1 FROM inventory_stock ist WHERE ist.item_id = i.id)
            )
            OR
            -- Has stock records but total quantity is 0
            (
              EXISTS (SELECT 1 FROM inventory_stock ist WHERE ist.item_id = i.id)
              AND NOT EXISTS (
                SELECT 1 FROM inventory_stock ist2 
                WHERE ist2.item_id = i.id AND ist2.quantity > 0
              )
            )
          )
      )
    `);

    return NextResponse.json({
      success: true,
      deletedCount: result.rowCount || 0,
      message: `Deleted ${result.rowCount || 0} items with no stock history`
    });
  } catch (error) {
    console.error("Error deleting zero-stock items:", error);
    return NextResponse.json(
      { error: "Failed to delete zero-stock items" },
      { status: 500 }
    );
  }
}
