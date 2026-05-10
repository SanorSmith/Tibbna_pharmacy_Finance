/**
 * Check GRN Stock Updates
 * Run with: npx tsx scripts/check-grn-stock.ts
 */
import "dotenv/config";
import { db } from "../lib/db";
import { sql } from "drizzle-orm";

async function checkGRNStock() {
  console.log("============================================");
  console.log("CHECKING GRN STOCK UPDATES");
  console.log("============================================\n");

  // 1. Check inventory_stock table status
  console.log("1. INVENTORY_STOCK STATUS:");
  const stockStatus = await db.execute(sql`
    SELECT
      COUNT(*) as total_records,
      COUNT(CASE WHEN quantity > 0 THEN 1 END) as records_with_stock,
      COUNT(CASE WHEN quantity = 0 THEN 1 END) as records_zero_stock,
      SUM(quantity) as total_quantity,
      SUM(reserved_quantity) as total_reserved
    FROM inventory_stock
  `);
  console.table(stockStatus);

  // 2. Check item_batches table status
  console.log("\n2. ITEM_BATCHES STATUS:");
  const batchStatus = await db.execute(sql`
    SELECT
      COUNT(*) as total_batches,
      COUNT(CASE WHEN quantity > 0 THEN 1 END) as batches_with_stock,
      COUNT(CASE WHEN quantity = 0 THEN 1 END) as batches_zero_stock,
      SUM(quantity) as total_batch_quantity,
      COUNT(CASE WHEN is_quarantined = true THEN 1 END) as quarantined_batches,
      COUNT(CASE WHEN expiry_date < CURRENT_TIMESTAMP THEN 1 END) as expired_batches
    FROM item_batches
  `);
  console.table(batchStatus);

  // 3. Check the specific GRN
  console.log("\n3. GRN DETAILS (047c575f-d9b2-4aa2-ba8c-c4d87106ef3f):");
  const grnDetails = await db.execute(sql`
    SELECT
      id,
      grn_number,
      status,
      order_id,
      warehouse_id,
      received_date,
      notes
    FROM pharmacy_goods_receipt
    WHERE id = '047c575f-d9b2-4aa2-ba8c-c4d87106ef3f'
  `);
  console.table(grnDetails);

  // 4. Check the GRN items
  console.log("\n4. GRN ITEMS:");
  const grnItems = await db.execute(sql`
    SELECT
      gri.id,
      gri.item_id,
      i.name as item_name,
      gri.quantity_received,
      gri.unit_cost,
      gri.batch_number,
      gri.expiry_date,
      gri.lot_number
    FROM pharmacy_goods_receipt_items gri
    JOIN items i ON i.id = gri.item_id
    WHERE gri.goods_receipt_id = '047c575f-d9b2-4aa2-ba8c-c4d87106ef3f'
  `);
  console.table(grnItems);

  // 5. Check inventory_stock for the received item
  console.log("\n5. INVENTORY_STOCK FOR 'PENTA' ITEM:");
  const stockCheck = await db.execute(sql`
    SELECT
      ist.id,
      ist.item_id,
      i.name as item_name,
      ist.warehouse_id,
      w.name as warehouse_name,
      ist.quantity,
      ist.reserved_quantity,
      ist.batch_id,
      ib.batch_number,
      ist.created_at
    FROM inventory_stock ist
    JOIN items i ON i.id = ist.item_id
    JOIN warehouses w ON w.id = ist.warehouse_id
    LEFT JOIN item_batches ib ON ib.id = ist.batch_id
    WHERE i.name ILIKE '%penta%'
    ORDER BY ist.created_at DESC
    LIMIT 10
  `);
  console.table(stockCheck);

  // 6. Check item_batches for the received item
  console.log("\n6. ITEM_BATCHES FOR 'PENTA' ITEM:");
  const batchCheck = await db.execute(sql`
    SELECT
      ib.id,
      ib.item_id,
      i.name as item_name,
      ib.batch_number,
      ib.quantity,
      ib.unit_cost,
      ib.expiry_date,
      ib.lot_number,
      ib.is_quarantined,
      ib.created_at
    FROM item_batches ib
    JOIN items i ON i.id = ib.item_id
    WHERE i.name ILIKE '%penta%'
    ORDER BY ib.created_at DESC
    LIMIT 10
  `);
  console.table(batchCheck);

  // 7. Check stock_transactions for the GRN
  console.log("\n7. STOCK_TRANSACTIONS FOR GRN:");
  const transactions = await db.execute(sql`
    SELECT
      st.id,
      st.item_id,
      i.name as item_name,
      st.transaction_type,
      st.quantity,
      st.warehouse_id,
      st.batch_id,
      st.reference_id,
      st.reference_type,
      st.transaction_date,
      st.notes
    FROM stock_transactions st
    JOIN items i ON i.id = st.item_id
    WHERE st.reference_id = '047c575f-d9b2-4aa2-ba8c-c4d87106ef3f'
    ORDER BY st.transaction_date DESC
  `);
  console.table(transactions);

  console.log("\n============================================");
  console.log("CHECK COMPLETE");
  console.log("============================================");
}

checkGRNStock().catch(console.error);
