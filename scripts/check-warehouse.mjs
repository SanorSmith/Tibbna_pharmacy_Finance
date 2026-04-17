import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') 
    ? { rejectUnauthorized: false } 
    : false,
});

async function checkWarehouse() {
  try {
    const result = await pool.query(`
      SELECT id, name, warehouse_type, is_active 
      FROM warehouses 
      WHERE warehouse_type = 'pharmacy'
    `);
    
    console.log("\n📦 Pharmacy Warehouses:");
    result.rows.forEach(w => {
      console.log(`  - ${w.id}: ${w.name} (${w.warehouse_type}) - Active: ${w.is_active}`);
    });
    
    if (result.rows.length === 0) {
      console.log("\n⚠️  No pharmacy warehouses found!");
      console.log("   Creating pharmacy warehouse...\n");
      
      await pool.query(`
        INSERT INTO warehouses (id, name, warehouse_type, is_active)
        VALUES ('22222222-0000-0000-0000-000000000002', 'Pharmacy Main Store', 'pharmacy', true)
        ON CONFLICT (id) DO NOTHING
      `);
      
      console.log("✅ Created pharmacy warehouse!");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkWarehouse();
