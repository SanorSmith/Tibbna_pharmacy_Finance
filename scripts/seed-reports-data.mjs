import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const WS = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";
const PHARMACY_WH = "22222222-0000-0000-0000-000000000002";

async function seedReportsData() {
  try {
    console.log("🌱 Seeding pharmacy reports data...\n");

    // Add some sample items with stock for reports
    const items = [
      { id: crypto.randomUUID(), name: 'Paracetamol 500mg', code: 'PAR500', category: 'pharmacy', reorder: 100 },
      { id: crypto.randomUUID(), name: 'Ibuprofen 400mg', code: 'IBU400', category: 'pharmacy', reorder: 50 },
      { id: crypto.randomUUID(), name: 'Amoxicillin 250mg', code: 'AMX250', category: 'pharmacy', reorder: 75 },
      { id: crypto.randomUUID(), name: 'Omeprazole 20mg', code: 'OMP20', category: 'pharmacy', reorder: 60 },
      { id: crypto.randomUUID(), name: 'Metformin 500mg', code: 'MET500', category: 'pharmacy', reorder: 80 },
    ];

    console.log("Adding items...");
    for (const item of items) {
      await pool.query(`
        INSERT INTO items (id, name, itemcode, itemtype, inventorycategory, reorder_level, is_active, workspace_id, uom)
        VALUES ($1, $2, $3, 'drug', $4, $5, true, $6, 'tablets')
        ON CONFLICT (id) DO NOTHING
      `, [item.id, item.name, item.code, item.category, item.reorder, WS]);
    }
    console.log(`✓ Added ${items.length} items\n`);

    // Add inventory stock for each item
    console.log("Adding inventory stock...");
    const stockData = [
      { item: items[0], qty: 500, reserved: 0 },
      { item: items[1], qty: 150, reserved: 10 },
      { item: items[2], qty: 200, reserved: 5 },
      { item: items[3], qty: 300, reserved: 0 },
      { item: items[4], qty: 400, reserved: 20 },
    ];

    for (const stock of stockData) {
      await pool.query(`
        INSERT INTO inventory_stock (id, item_id, warehouse_id, quantity, reserved_quantity)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [crypto.randomUUID(), stock.item.id, PHARMACY_WH, stock.qty, stock.reserved]);
    }
    console.log(`✓ Added ${stockData.length} stock records\n`);

    // Add some stock transactions for consumption report
    console.log("Adding stock transactions...");
    const transactions = [
      { item: items[0], type: 'STOCK_IN', qty: 100 },
      { item: items[0], type: 'STOCK_OUT', qty: -20 },
      { item: items[1], type: 'STOCK_IN', qty: 50 },
      { item: items[1], type: 'DISPENSE', qty: -10 },
      { item: items[2], type: 'STOCK_IN', qty: 75 },
      { item: items[2], type: 'WASTAGE', qty: -5 },
      { item: items[3], type: 'STOCK_IN', qty: 100 },
      { item: items[4], type: 'STOCK_IN', qty: 150 },
      { item: items[4], type: 'ADJUSTMENT', qty: -30 },
    ];

    for (const tx of transactions) {
      await pool.query(`
        INSERT INTO stock_transactions (id, item_id, warehouse_id, transaction_type, quantity, notes, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, 'Test transaction', 'System', NOW())
      `, [crypto.randomUUID(), tx.item.id, PHARMACY_WH, tx.type, tx.qty]);
    }
    console.log(`✓ Added ${transactions.length} transactions\n`);

    console.log("✅ Reports data seeding complete!");
    console.log(`  ${items.length} items`);
    console.log(`  ${stockData.length} stock records`);
    console.log(`  ${transactions.length} transactions`);

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

seedReportsData();
