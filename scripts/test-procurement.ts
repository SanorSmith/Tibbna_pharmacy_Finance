import { Pool } from "pg";

const pool = new Pool({ connectionString: "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require" });

async function main() {
  console.log("=== Pharmacy Procurement DB Test ===\n");

  // 1. Check tables exist
  const tables = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'pharmacy_purchase%' OR table_name LIKE 'pharmacy_goods%' OR table_name LIKE 'pharmacy_claim%' ORDER BY table_name`
  );
  console.log("Tables created:", tables.rows.map((r: any) => r.table_name));

  // 2. Check enums
  const enums = await pool.query(
    `SELECT typname, array_agg(enumlabel ORDER BY enumsortorder) as values FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE typname IN ('pharmacy_po_status','pharmacy_grn_status') GROUP BY typname`
  );
  console.log("\nEnums:");
  enums.rows.forEach((r: any) => console.log(`  ${r.typname}: ${Array.isArray(r.values) ? r.values.join(", ") : r.values}`));

  // 3. Check columns on each table
  for (const tbl of ["pharmacy_purchase_orders", "pharmacy_purchase_order_items", "pharmacy_goods_receipt", "pharmacy_goods_receipt_items", "pharmacy_claim_damage"]) {
    const cols = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tbl}' ORDER BY ordinal_position`
    );
    console.log(`\n${tbl} (${cols.rows.length} columns):`);
    cols.rows.forEach((r: any) => console.log(`  ${r.column_name} [${r.data_type}]`));
  }

  // 4. Check indexes
  const indexes = await pool.query(
    `SELECT indexname FROM pg_indexes WHERE tablename LIKE 'pharmacy_purchase%' OR tablename LIKE 'pharmacy_goods%' OR tablename LIKE 'pharmacy_claim%' ORDER BY indexname`
  );
  console.log("\nIndexes:", indexes.rows.map((r: any) => r.indexname));

  // 5. Quick insert/select test
  console.log("\n=== Quick Insert/Select Test ===");
  const ws = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";
  
  // Insert a test order
  const orderResult = await pool.query(
    `INSERT INTO pharmacy_purchase_orders (workspace_id, order_number, ordered_by, status, total_amount) VALUES ($1, $2, $3, 'PENDING', 100.00) RETURNING id, order_number, status`,
    [ws, `TEST-PPO-${Date.now()}`, "Test User"]
  );
  console.log("Inserted order:", orderResult.rows[0]);

  // Insert a test order item
  const orderId = orderResult.rows[0].id;
  await pool.query(
    `INSERT INTO pharmacy_purchase_order_items (order_id, item_name, uom, ordered_qty, unit_cost, total_cost) VALUES ($1, 'Test Item', 'piece', 10, 5.00, 50.00)`,
    [orderId]
  );
  console.log("Inserted order item");

  // Select order with item count
  const orders = await pool.query(
    `SELECT o.*, (SELECT COUNT(*) FROM pharmacy_purchase_order_items WHERE order_id = o.id)::int AS item_count FROM pharmacy_purchase_orders o WHERE o.workspace_id = $1 ORDER BY o.createdat DESC LIMIT 5`,
    [ws]
  );
  console.log("Orders:", orders.rows.map((r: any) => `${r.order_number} [${r.status}] ${r.item_count} items`));

  // Insert a test GRN
  const grnResult = await pool.query(
    `INSERT INTO pharmacy_goods_receipt (workspace_id, receipt_number, order_id, order_number, received_by, status) VALUES ($1, $2, $3, $4, $5, 'COMPLETE') RETURNING id, receipt_number, status`,
    [ws, `TEST-PGRN-${Date.now()}`, orderId, orderResult.rows[0].order_number, "Test Receiver"]
  );
  console.log("Inserted GRN:", grnResult.rows[0]);

  // Insert a test GRN item
  await pool.query(
    `INSERT INTO pharmacy_goods_receipt_items (receipt_id, item_name, uom, ordered_qty, received_qty) VALUES ($1, 'Test Item', 'piece', 10, 10)`,
    [grnResult.rows[0].id]
  );
  console.log("Inserted GRN item");

  // Insert a test claim
  await pool.query(
    `INSERT INTO pharmacy_claim_damage (receipt_id, item_name, quantity, note) VALUES ($1, 'Test Item', 2, 'Damaged in transit')`,
    [grnResult.rows[0].id]
  );
  console.log("Inserted claim/damage");

  // Verify GRN with items
  const grns = await pool.query(
    `SELECT gr.*, (SELECT COUNT(*) FROM pharmacy_goods_receipt_items WHERE receipt_id = gr.id)::int AS item_count FROM pharmacy_goods_receipt gr WHERE gr.workspace_id = $1 ORDER BY gr.createdat DESC LIMIT 5`,
    [ws]
  );
  console.log("GRNs:", grns.rows.map((r: any) => `${r.receipt_number} [${r.status}] ${r.item_count} items`));

  // Verify claims
  const claims = await pool.query(
    `SELECT * FROM pharmacy_claim_damage WHERE receipt_id = $1`,
    [grnResult.rows[0].id]
  );
  console.log("Claims:", claims.rows.map((r: any) => `${r.item_name}: ${r.quantity} - ${r.note}`));

  // Clean up test data (respect FK order: claims/items → grn → order items → order)
  await pool.query(`DELETE FROM pharmacy_claim_damage WHERE receipt_id = $1`, [grnResult.rows[0].id]);
  await pool.query(`DELETE FROM pharmacy_goods_receipt_items WHERE receipt_id = $1`, [grnResult.rows[0].id]);
  await pool.query(`DELETE FROM pharmacy_goods_receipt WHERE id = $1`, [grnResult.rows[0].id]);
  await pool.query(`DELETE FROM pharmacy_purchase_order_items WHERE order_id = $1`, [orderId]);
  await pool.query(`DELETE FROM pharmacy_purchase_orders WHERE id = $1`, [orderId]);
  console.log("\nTest data cleaned up");

  console.log("\n=== ALL TESTS PASSED ===");
  await pool.end();
}

main().catch(e => { console.error("FAIL:", e.message); process.exit(1); });
