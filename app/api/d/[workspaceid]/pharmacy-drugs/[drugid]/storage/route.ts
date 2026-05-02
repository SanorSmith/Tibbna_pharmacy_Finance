/**
 * Pharmacy Drug Storage API
 * GET - fetch storage location and batch information for a specific drug
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Pool } from "pg";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; drugid: string }> }
) {
  try {
    const { workspaceid, drugid } = await params;

    console.log('[Drug Storage API] Fetching storage for:', { drugid, workspaceid });

    // Use raw pg pool for complex queries
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
      // First, get the drug name
      const drugQuery = `SELECT drugid, name, form, strength FROM drugs WHERE drugid = $1 AND workspaceid = $2`;
      const drugResult = await pool.query(drugQuery, [drugid, workspaceid]);

      if (drugResult.rows.length === 0) {
        console.log('[Drug Storage API] Drug not found');
        return NextResponse.json(
          { error: "Drug not found" },
          { status: 404 }
        );
      }

      const drug = drugResult.rows[0];
      console.log('[Drug Storage API] Found drug:', drug.name);

      // Query to get storage information - search by both drug_id AND drug name
      // This handles cases where items aren't properly linked to drugs
      const query = `
        SELECT 
          i.id as itemid,
          i.item_code,
          i.name as item_name,
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
        WHERE (i.drug_id = $1 OR i.name ILIKE $2)
          AND i.workspace_id = $3
          AND i.is_active = true
        ORDER BY ib.expiry_date ASC NULLS LAST
      `;

      const result = await pool.query(query, [drugid, `%${drug.name}%`, workspaceid]);
      const rows = result.rows;

      console.log('[Drug Storage API] Found rows:', rows.length);

      if (rows.length === 0) {
        return NextResponse.json(
          { error: "Drug not found or no storage information available" },
          { status: 404 }
        );
      }

      // Group batches
      const drugInfo = {
        drugid: drug.drugid,
        drugname: drug.name,
        form: drug.form,
        strength: drug.strength,
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

      console.log('[Drug Storage API] Returning:', { 
        drugname: drugInfo.drugname, 
        storage: drugInfo.storageLocation,
        batchCount: drugInfo.batches.length 
      });

      return NextResponse.json(drugInfo);
    } finally {
      await pool.end();
    }
  } catch (error: any) {
    console.error("[Pharmacy Drug Storage GET]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch drug storage information" },
      { status: 500 }
    );
  }
}
