/**
 * Check GRN Stock Updates
 * Run with: node scripts/check-grn-stock.mjs
 */
import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function checkGRNStock() {
  console.log("============================================");
  console.log("CHECKING GRN STOCK UPDATES");
  console.log("============================================\n");

  try {
    // 1. Check inventory_stock table status
    console.log("1. INVENTORY_STOCK STATUS:");
    const stockStatus = await sql`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN quantity > 0 THEN 1 END) as records_with_stock,
        COUNT(CASE WHEN quantity = 0 THEN 1 END) as records_zero_stock,
        SUM(quantity) as total_quantity,
        SUM(reserved_quantity) as total_reserved
      FROM inventory_stock
    `;
    console.table(stockStatus);

    // 2. Check item_batches table status
    console.log("\n2. ITEM_BATCHES STATUS:");
    const batchStatus = await sql`
      SELECT 
        COUNT(*) as total_batches,
        COUNT(CASE WHEN quantity > 0 THEN 1 END) as batches_with_stock,
        COUNT(CASE WHEN quantity = 0 THEN 1 END) as batches_zero_stock,
        SUM(quantity) as total_batch_quantity,
        COUNT(CASE WHEN is_quarantined = true THEN 1 END) as quarantined_batches,
        COUNT(CASE WHEN expiry_date < CURRENT_TIMESTAMP THEN 1 END) as expired_batches
      FROM item_batches
    `;
    console.table(batchStatus);

    // 3. Check the specific GRN
    console.log("\n3. GRN DETAILS (047c575f-d9b2-4aa2-ba8c-c4d87106ef3f):");
    const grnDetails = await sql`
      SELECT
        id,
        receipt_number,
        status,
        order_id,
        receipt_date,
        notes
      FROM pharmacy_goods_receipt
      WHERE id = '047c575f-d9b2-4aa2-ba8c-c4d87106ef3f'
    `;
    console.table(grnDetails);

    // 4. Check the GRN items
    console.log("\n4. GRN ITEMS:");
    const grnItems = await sql`
      SELECT
        gri.id,
        gri.item_id,
        i.name as item_name,
        gri.received_qty,
        gri.unit_cost,
        gri.batch_number,
        gri.expiry_date,
        gri.lot_number
      FROM pharmacy_goods_receipt_items gri
      JOIN items i ON i.id = gri.item_id
      WHERE gri.receipt_id = '047c575f-d9b2-4aa2-ba8c-c4d87106ef3f'
    `;
    console.table(grnItems);

    // 5. Check inventory_stock for the received item
    console.log("\n5. INVENTORY_STOCK FOR 'PENTA' ITEM:");
    const stockCheck = await sql`
      SELECT
        ist.id,
        ist.item_id,
        i.name as item_name,
        ist.warehouse_id,
        w.name as warehouse_name,
        ist.quantity,
        ist.reserved_quantity,
        ist.batch_id,
        ib.batch_number
      FROM inventory_stock ist
      JOIN items i ON i.id = ist.item_id
      JOIN warehouses w ON w.id = ist.warehouse_id
      LEFT JOIN item_batches ib ON ib.id = ist.batch_id
      WHERE i.name ILIKE '%penta%'
      LIMIT 10
    `;
    console.table(stockCheck);

    // 6. Check item_batches for the received item
    console.log("\n6. ITEM_BATCHES FOR 'PENTA' ITEM:");
    const batchCheck = await sql`
      SELECT
        ib.id,
        ib.item_id,
        i.name as item_name,
        ib.batch_number,
        ib.quantity,
        ib.unit_cost,
        ib.expiry_date,
        ib.is_quarantined
      FROM item_batches ib
      JOIN items i ON i.id = ib.item_id
      WHERE i.name ILIKE '%penta%'
      LIMIT 10
    `;
    console.table(batchCheck);

    // 7. Check stock_transactions for the GRN
    console.log("\n7. STOCK_TRANSACTIONS FOR GRN:");
    const transactions = await sql`
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
        st.created_at,
        st.notes
      FROM stock_transactions st
      JOIN items i ON i.id = st.item_id
      WHERE st.reference_id = '047c575f-d9b2-4aa2-ba8c-c4d87106ef3f'
      ORDER BY st.created_at DESC
    `;
    console.table(transactions);

    // 8. Check if global_drugs table exists
    console.log("\n8. CHECK GLOBAL_DRUGS TABLE:");
    const globalDrugsCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'global_drugs'
      ) as exists
    `;
    console.table(globalDrugsCheck);

    // 9. Count global_drugs records
    console.log("\n9. GLOBAL_DRUGS RECORD COUNT:");
    const globalDrugsCount = await sql`
      SELECT COUNT(*) as count FROM global_drugs
    `;
    console.table(globalDrugsCount);

    // 10. Check global_drugs column names
    console.log("\n10. GLOBAL_DRUGS COLUMN NAMES:");
    const globalDrugsColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'global_drugs'
      ORDER BY ordinal_position
    `;
    console.table(globalDrugsColumns);

    // 11. Test search query
    console.log("\n11. TEST SEARCH QUERY FOR 'pen':");
    const testSearch = await sql`
      SELECT drugid, name, genericname, form, strength
      FROM global_drugs
      WHERE isactive = true
        AND (name ILIKE '%pen%' OR genericname ILIKE '%pen%')
      LIMIT 5
    `;
    console.table(testSearch);

    console.log("\n============================================");
    console.log("CHECK COMPLETE");
    console.log("============================================");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await sql.end();
  }
}

checkGRNStock();
