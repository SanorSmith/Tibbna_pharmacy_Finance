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

// Expected columns based on schema
const expectedColumns = {
  warehouse_sections: [
    'id', 'warehouse_id', 'section_name', 'section_type', 
    'bin_location', 'shelf', 'description', 'temperature_controlled', 'created_at'
  ],
  warehouses: [
    'id', 'name', 'code', 'warehouse_type', 'location', 'manager', 
    'capacity', 'is_active', 'created_at', 'updated_at'
  ],
  items: [
    'id', 'workspace_id', 'item_code', 'name', 'generic_name', 'item_type',
    'inventory_category', 'uom', 'min_level', 'reorder_level', 'max_level',
    'controlled', 'manufacturer', 'is_active', 'description', 'barcode',
    'supplier_id', 'drug_id', 'created_at', 'updated_at'
  ],
  inventory_stock: [
    'id', 'item_id', 'warehouse_id', 'batch_id', 'quantity', 
    'reserved_quantity', 'last_updated'
  ],
  manufacturers: [
    'id', 'workspace_id', 'name', 'code', 'country', 'contactname',
    'phone', 'email', 'address', 'website', 'license_number',
    'product_types', 'notes', 'isactive', 'createdat', 'updatedat'
  ]
};

async function findMissingColumns() {
  try {
    console.log("\n🔍 Checking for missing columns...\n");

    for (const [tableName, expectedCols] of Object.entries(expectedColumns)) {
      // Get actual columns
      const result = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      const actualCols = result.rows.map(r => r.column_name);
      const missing = expectedCols.filter(col => !actualCols.includes(col));

      if (missing.length > 0) {
        console.log(`❌ ${tableName}:`);
        console.log(`   Missing columns: ${missing.join(', ')}`);
      } else {
        console.log(`✅ ${tableName}: All columns present`);
      }
    }

    console.log("\n");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

findMissingColumns();
