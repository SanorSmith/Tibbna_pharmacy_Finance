/**
 * Item Storage API
 * GET - fetch storage location and batch information for a specific item
 */
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; itemid: string }> }
) {
  try {
    const { workspaceid, itemid } = await params;

    console.log('[Item Storage API] Fetching storage for:', { itemid, workspaceid });

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
      // First, check if this is an order item ID (from pharmacy_order_items)
      // If so, get the drug name and search by that
      const orderItemQuery = `
        SELECT drugname, drugid 
        FROM pharmacy_order_items 
        WHERE itemid = $1
      `;
      
      const orderItemResult = await pool.query(orderItemQuery, [itemid]);
      
      let searchQuery;
      let searchParams;
      
      if (orderItemResult.rows.length > 0) {
        // This is an order item - search by drug name
        const drugName = orderItemResult.rows[0].drugname;
        console.log('[Item Storage API] Order item found, searching by drug name:', drugName);
        
        searchQuery = `
          SELECT 
            i.id as itemid,
            i.name as drugname,
            i.item_code,
            i.generic_name,
            ws.sectionname as storage_location,
            ws.section_type as storage_type,
            ws.bin_location,
            ib.id as batchid,
            ib.batch_number,
            ib.quantity,
            ib.expiry_date,
            ib.unit_cost,
            ib.selling_price,
            w.name as warehouse_name,
            CASE 
              WHEN ib.quantity = 0 THEN 'Out of Stock'
              WHEN ib.quantity <= i.reorder_level THEN 'Low'
              ELSE 'In Stock'
            END as status
          FROM items i
          LEFT JOIN warehouse_sections ws ON ws.id = i.storage_location_id
          LEFT JOIN item_batches ib ON ib.item_id = i.id
          LEFT JOIN warehouses w ON w.id = ib.warehouse_id
          WHERE i.name ILIKE $1
            AND i.is_active = true
          ORDER BY ib.expiry_date ASC NULLS LAST
        `;
        searchParams = [`%${drugName}%`];
      } else {
        // This is a regular item ID
        searchQuery = `
          SELECT 
            i.id as itemid,
            i.name as drugname,
            i.item_code,
            i.generic_name,
            ws.sectionname as storage_location,
            ws.section_type as storage_type,
            ws.bin_location,
            ib.id as batchid,
            ib.batch_number,
            ib.quantity,
            ib.expiry_date,
            ib.unit_cost,
            ib.selling_price,
            w.name as warehouse_name,
            CASE 
              WHEN ib.quantity = 0 THEN 'Out of Stock'
              WHEN ib.quantity <= i.reorder_level THEN 'Low'
              ELSE 'In Stock'
            END as status
          FROM items i
          LEFT JOIN warehouse_sections ws ON ws.id = i.storage_location_id
          LEFT JOIN item_batches ib ON ib.item_id = i.id
          LEFT JOIN warehouses w ON w.id = ib.warehouse_id
          WHERE i.id = $1
            AND i.is_active = true
          ORDER BY ib.expiry_date ASC NULLS LAST
        `;
        searchParams = [itemid];
      }

      const result = await pool.query(searchQuery, searchParams);
      const rows = result.rows;

      if (rows.length === 0) {
        return NextResponse.json(
          { error: "Item not found or no storage information available" },
          { status: 404 }
        );
      }

      // Build response
      const itemInfo = {
        itemid: rows[0].itemid,
        drugname: rows[0].drugname,
        genericName: rows[0].generic_name,
        itemCode: rows[0].item_code,
        storageLocation: rows[0].storage_location,
        storageType: rows[0].storage_type,
        binLocation: rows[0].bin_location,
        warehouseName: rows[0].warehouse_name,
        batches: rows
          .filter(r => r.batchid)
          .map(r => ({
            batchid: r.batchid,
            batchNumber: r.batch_number,
            quantity: r.quantity,
            expiryDate: r.expiry_date,
            unitCost: r.unit_cost,
            sellingPrice: r.selling_price,
            status: r.status,
            location: r.storage_location,
            shelf: r.bin_location,
          }))
      };

      console.log('[Item Storage API] Returning:', { 
        drugname: itemInfo.drugname, 
        storage: itemInfo.storageLocation,
        batchCount: itemInfo.batches.length 
      });

      return NextResponse.json(itemInfo);
    } finally {
      await pool.end();
    }
  } catch (error: any) {
    console.error("[Item Storage GET]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch item storage information" },
      { status: 500 }
    );
  }
}
