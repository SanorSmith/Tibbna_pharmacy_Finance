/**
 * Seed Procurement Demo Data
 *
 * Usage: npx tsx scripts/seed-procurement-demo.ts
 *
 * This script:
 * 1. Finds the first workspace in the database
 * 2. Queries existing items, suppliers, vendors
 * 3. Generates 40 purchase orders with mixed statuses
 * 4. Creates 40 goods receipts (25 linked to orders, 15 standalone)
 * 5. Spans the last 30 days with realistic data
 */
import "dotenv/config";
import postgres from "postgres";

// ── Configuration ────────────────────────────────────────────────────────────
const ORDER_COUNT = 40;
const RECEIPT_COUNT = 40;
const LINKED_RECEIPTS = 25;
const STANDALONE_RECEIPTS = 15;
const DAYS_SPAN = 30;

// ── Status Distribution ────────────────────────────────────────────────────────
const ORDER_STATUSES = ["PENDING", "PARTIALLY_DELIVERED", "DELIVERED", "CANCELLED"];
const ORDER_STATUS_WEIGHTS = [10, 10, 15, 5]; // 10 PENDING, 10 PARTIAL, 15 DELIVERED, 5 CANCELLED

const RECEIPT_STATUSES = ["PENDING", "PARTIAL", "COMPLETE", "CORRECTION"];
const RECEIPT_STATUS_WEIGHTS = [10, 10, 15, 5]; // 10 PENDING, 10 PARTIAL, 15 COMPLETE, 5 CORRECTION

// ── Utility Functions ─────────────────────────────────────────────────────────
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomChoice<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

function weightedRandomChoice<T>(array: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < array.length; i++) {
    random -= weights[i];
    if (random <= 0) return array[i];
  }
  return array[array.length - 1];
}

function generateOrderNumber(date: Date, index: number): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(index).padStart(4, '0');
  return `PO-${year}${month}${day}-${seq}`;
}

function generateReceiptNumber(date: Date, index: number): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(index).padStart(4, '0');
  return `GRN-${year}${month}${day}-${seq}`;
}

function generateBatchNumber(year: number, index: number): string {
  const seq = String(index).padStart(4, '0');
  return `BATCH-${year}-${seq}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

// ── Main Function ─────────────────────────────────────────────────────────────
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = postgres(url + "?sslmode=require", { max: 1 });

  try {
    // ── 1. Find workspace ──────────────────────────────────────────────
    const workspaces = await sql`SELECT workspaceid, name FROM workspaces LIMIT 5`;
    if (workspaces.length === 0) {
      console.error("No workspaces found in the database");
      await sql.end();
      process.exit(1);
    }

    console.log("Available workspaces:");
    for (const ws of workspaces) {
      console.log(`  - ${ws.workspaceid}  ${ws.name}`);
    }

    const workspace = workspaces[0];
    const wsid = workspace.workspaceid;
    console.log(`\nUsing workspace: ${workspace.name} (${wsid})\n`);

    // ── 2. Find a user for audit trail ────────────────────────────────
    const users = await sql`SELECT userid, name FROM users LIMIT 1`;
    if (users.length === 0) {
      console.error("No users found in the database");
      await sql.end();
      process.exit(1);
    }
    const userid = users[0].userid;
    console.log(`Using user: ${users[0].name} (${userid})`);

    // ── 3. Query suppliers/vendors ────────────────────────────────────
    const suppliers = await sql`
      SELECT id, name, email, phone 
      FROM vendors 
      WHERE name IS NOT NULL 
      LIMIT 10
    `;
    if (suppliers.length === 0) {
      console.error("No suppliers/vendors found in the database");
      await sql.end();
      process.exit(1);
    }
    console.log(`Found ${suppliers.length} suppliers/vendors`);

    // ── 4. Query items ─────────────────────────────────────────────────
    const items = await sql`
      SELECT id, name, uom 
      FROM items 
      WHERE name IS NOT NULL 
      LIMIT 30
    `;
    if (items.length === 0) {
      console.error("No items found in the database");
      await sql.end();
      process.exit(1);
    }
    console.log(`Found ${items.length} items`);

    // ── 5. Generate purchase orders ────────────────────────────────────
    console.log(`\n📦 Generating ${ORDER_COUNT} purchase orders...`);
    const orders: any[] = [];
    const orderItemsMap = new Map<number, any[]>(); // Map order index to its items
    const today = new Date();
    const startDate = addDays(today, -DAYS_SPAN);

    for (let i = 0; i < ORDER_COUNT; i++) {
      const orderDate = new Date(startDate.getTime() + Math.random() * (today.getTime() - startDate.getTime()));
      const expectedDate = addDays(orderDate, randomInt(5, 15));
      const status = weightedRandomChoice(ORDER_STATUSES, ORDER_STATUS_WEIGHTS);
      const supplier = randomChoice(suppliers);
      const orderNumber = generateOrderNumber(orderDate, i + 1);

      // Generate 3-7 items per order
      const itemCount = randomInt(3, 7);
      const selectedItems = [];
      const itemPool = [...items];
      const currentOrderItems: any[] = [];
      
      let totalAmount = 0;
      for (let j = 0; j < itemCount; j++) {
        if (itemPool.length === 0) break;
        const itemIndex = randomInt(0, itemPool.length - 1);
        const item = itemPool.splice(itemIndex, 1)[0];
        selectedItems.push(item);
        
        const orderedQty = randomInt(10, 100);
        const unitCost = randomFloat(5, 200);
        const totalCost = orderedQty * unitCost;
        totalAmount += totalCost;

        currentOrderItems.push({
          item_id: item.id,
          item_name: item.name,
          uom: item.uom || 'PCS',
          ordered_qty: orderedQty,
          unit_cost: unitCost.toFixed(2),
          total_cost: totalCost.toFixed(2),
        });
      }

      // Store items for this order
      orderItemsMap.set(i, currentOrderItems);

      orders.push({
        workspace_id: wsid,
        order_number: orderNumber,
        ordered_by: users[0].name,
        order_date: orderDate,
        expected_date: expectedDate,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        supplier_email: supplier.email,
        supplier_phone: supplier.phone,
        status: status,
        notes: status === 'CANCELLED' ? 'Cancelled due to supplier stock issue' : null,
        total_amount: totalAmount.toFixed(2),
        is_edited: false,
        createdat: orderDate,
        updatedat: orderDate,
      });

      if ((i + 1) % 10 === 0) {
        console.log(`  Generated ${i + 1}/${ORDER_COUNT} orders`);
      }
    }

    // Insert orders
    console.log("\n💾 Inserting purchase orders...");
    for (const order of orders) {
      const result = await sql`
        INSERT INTO pharmacy_purchase_orders (
          workspace_id, order_number, ordered_by, order_date, expected_date,
          supplier_id, supplier_name, supplier_email, supplier_phone, status,
          notes, total_amount, is_edited, createdat, updatedat
        )
        VALUES (
          ${order.workspace_id}, ${order.order_number}, ${order.ordered_by}, 
          ${order.order_date}, ${order.expected_date}, ${order.supplier_id},
          ${order.supplier_name}, ${order.supplier_email}, ${order.supplier_phone},
          ${order.status}, ${order.notes}, ${order.total_amount}, ${order.is_edited},
          ${order.createdat}, ${order.updatedat}
        )
        RETURNING id
      `;
      order.id = result[0].id;
    }
    console.log(`  ✅ Inserted ${orders.length} purchase orders`);

    // Insert order items
    console.log("💾 Inserting purchase order items...");
    let totalOrderItems = 0;
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const items = orderItemsMap.get(i) || [];
      for (const item of items) {
        await sql`
          INSERT INTO pharmacy_purchase_order_items (
            order_id, item_id, item_name, uom, ordered_qty, unit_cost, total_cost, createdat
          )
          VALUES (
            ${order.id}, ${item.item_id}, ${item.item_name}, ${item.uom},
            ${item.ordered_qty}, ${item.unit_cost}, ${item.total_cost}, ${order.createdat}
          )
        `;
        totalOrderItems++;
      }
    }
    console.log(`  ✅ Inserted ${totalOrderItems} purchase order items`);

    // ── 6. Generate goods receipts ────────────────────────────────────
    console.log(`\n📥 Generating ${RECEIPT_COUNT} goods receipts (${LINKED_RECEIPTS} linked, ${STANDALONE_RECEIPTS} standalone)...`);
    const receipts: any[] = [];
    const receiptItems: any[] = [];

    // Generate linked receipts
    for (let i = 0; i < LINKED_RECEIPTS; i++) {
      const order = orders[i];
      const receiptDate = addDays(order.order_date, randomInt(3, 20));
      const status = weightedRandomChoice(RECEIPT_STATUSES, RECEIPT_STATUS_WEIGHTS);
      const receiptNumber = generateReceiptNumber(receiptDate, i + 1);

      receipts.push({
        workspace_id: wsid,
        receipt_number: receiptNumber,
        order_id: order.id,
        order_number: order.order_number,
        delivery_note_number: `DN-${randomInt(1000, 9999)}`,
        received_by: users[0].name,
        receipt_date: receiptDate,
        supplier_name: order.supplier_name,
        supplier_email: order.supplier_email,
        status: status,
        notes: status === 'CORRECTION' ? 'Correction for delivery discrepancy' : null,
        is_reversal: false,
        createdat: receiptDate,
        updatedat: receiptDate,
      });

      // Generate receipt items linked to order
      const itemCount = randomInt(3, 5);
      for (let j = 0; j < itemCount; j++) {
        const item = randomChoice(items);
        const orderedQty = randomInt(10, 100);
        const receivedQty = status === 'PARTIAL' ? Math.floor(orderedQty * 0.7) : orderedQty;
        const unitCost = randomFloat(5, 200);
        const batchNumber = generateBatchNumber(receiptDate.getFullYear(), i * 10 + j);
        const expiryDate = addMonths(receiptDate, randomInt(12, 36));
        const manufactureDate = addMonths(receiptDate, -randomInt(1, 6));

        receiptItems.push({
          receipt_id: null, // Will be set after receipt insert
          item_id: item.id,
          item_name: item.name,
          uom: item.uom || 'PCS',
          ordered_qty: orderedQty,
          received_qty: receivedQty,
          delivered_total: status === 'COMPLETE' ? receivedQty : null,
          return_claim: status === 'PARTIAL' ? randomInt(1, 5) : 0,
          dn_reg_num: `DN-REG-${randomInt(100, 999)}`,
          unit_cost: unitCost.toFixed(2),
          batch_number: batchNumber,
          lot_number: `LOT-${randomInt(1000, 9999)}`,
          expiry_date: expiryDate,
          manufacture_date: manufactureDate,
          createdat: receiptDate,
        });
      }
    }

    // Generate standalone receipts
    for (let i = 0; i < STANDALONE_RECEIPTS; i++) {
      const receiptDate = new Date(startDate.getTime() + Math.random() * (today.getTime() - startDate.getTime()));
      const status = weightedRandomChoice(RECEIPT_STATUSES, RECEIPT_STATUS_WEIGHTS);
      const receiptNumber = generateReceiptNumber(receiptDate, LINKED_RECEIPTS + i + 1);
      const supplier = randomChoice(suppliers);

      receipts.push({
        workspace_id: wsid,
        receipt_number: receiptNumber,
        order_id: null,
        order_number: null,
        delivery_note_number: `DN-${randomInt(1000, 9999)}`,
        received_by: users[0].name,
        receipt_date: receiptDate,
        supplier_name: supplier.name,
        supplier_email: supplier.email,
        status: status,
        notes: status === 'CORRECTION' ? 'Correction for delivery discrepancy' : null,
        is_reversal: false,
        createdat: receiptDate,
        updatedat: receiptDate,
      });

      // Generate receipt items
      const itemCount = randomInt(3, 5);
      for (let j = 0; j < itemCount; j++) {
        const item = randomChoice(items);
        const orderedQty = randomInt(10, 100);
        const receivedQty = status === 'PARTIAL' ? Math.floor(orderedQty * 0.7) : orderedQty;
        const unitCost = randomFloat(5, 200);
        const batchNumber = generateBatchNumber(receiptDate.getFullYear(), (LINKED_RECEIPTS + i) * 10 + j);
        const expiryDate = addMonths(receiptDate, randomInt(12, 36));
        const manufactureDate = addMonths(receiptDate, -randomInt(1, 6));

        receiptItems.push({
          receipt_id: null,
          item_id: item.id,
          item_name: item.name,
          uom: item.uom || 'PCS',
          ordered_qty: orderedQty,
          received_qty: receivedQty,
          delivered_total: status === 'COMPLETE' ? receivedQty : null,
          return_claim: status === 'PARTIAL' ? randomInt(1, 5) : 0,
          dn_reg_num: `DN-REG-${randomInt(100, 999)}`,
          unit_cost: unitCost.toFixed(2),
          batch_number: batchNumber,
          lot_number: `LOT-${randomInt(1000, 9999)}`,
          expiry_date: expiryDate,
          manufacture_date: manufactureDate,
          createdat: receiptDate,
        });
      }
    }

    // Insert receipts
    console.log("\n💾 Inserting goods receipts...");
    let totalReceiptItems = 0;
    for (const receipt of receipts) {
      const result = await sql`
        INSERT INTO pharmacy_goods_receipt (
          workspace_id, receipt_number, order_id, order_number, delivery_note_number,
          received_by, receipt_date, supplier_name, supplier_email, status,
          notes, is_reversal, createdat, updatedat
        )
        VALUES (
          ${receipt.workspace_id}, ${receipt.receipt_number}, ${receipt.order_id},
          ${receipt.order_number}, ${receipt.delivery_note_number}, ${receipt.received_by},
          ${receipt.receipt_date}, ${receipt.supplier_name}, ${receipt.supplier_email},
          ${receipt.status}, ${receipt.notes}, ${receipt.is_reversal},
          ${receipt.createdat}, ${receipt.updatedat}
        )
        RETURNING id
      `;
      receipt.id = result[0].id;

      // Assign receipt items to this receipt
      const itemCount = randomInt(3, 5);
      for (let i = 0; i < itemCount && totalReceiptItems < receiptItems.length; i++) {
        const item = receiptItems[totalReceiptItems++];
        await sql`
          INSERT INTO pharmacy_goods_receipt_items (
            receipt_id, item_id, item_name, uom, ordered_qty,
            received_qty, delivered_total, return_claim, dn_reg_num,
            unit_cost, batch_number, lot_number, expiry_date,
            manufacture_date, createdat
          )
          VALUES (
            ${receipt.id}, ${item.item_id}, ${item.item_name}, ${item.uom},
            ${item.ordered_qty}, ${item.received_qty}, ${item.delivered_total},
            ${item.return_claim}, ${item.dn_reg_num}, ${item.unit_cost},
            ${item.batch_number}, ${item.lot_number}, ${item.expiry_date},
            ${item.manufacture_date}, ${item.createdat}
          )
        `;
      }
    }
    console.log(`  ✅ Inserted ${receipts.length} goods receipts`);
    console.log(`  ✅ Inserted ${totalReceiptItems} goods receipt items`);

    // ── 7. Summary ────────────────────────────────────────────────────────
    console.log("\n✅ Procurement demo data seed complete!");
    console.log(`  📦 Purchase Orders: ${orders.length}`);
    console.log(`  📦 Order Items: ${totalOrderItems}`);
    console.log(`  📥 Goods Receipts: ${receipts.length}`);
    console.log(`  📥 Receipt Items: ${totalReceiptItems}`);
    console.log(`  📅 Date Range: Last ${DAYS_SPAN} days`);

    await sql.end();
  } catch (error) {
    console.error("❌ Seed failed:", error);
    await sql.end();
    process.exit(1);
  }
}

main();
