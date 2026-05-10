import { Pool } from "pg";

const pool = new Pool({ connectionString: "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require" });

async function main() {
  // Add missing columns to pharmacy_purchase_orders
  const poAlters = [
    "ALTER TABLE pharmacy_purchase_orders ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE",
    "ALTER TABLE pharmacy_purchase_orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT",
  ];

  // Add missing columns to pharmacy_goods_receipt
  const grAlters = [
    "ALTER TABLE pharmacy_goods_receipt ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE",
    "ALTER TABLE pharmacy_goods_receipt ADD COLUMN IF NOT EXISTS correction_of UUID",
    "ALTER TABLE pharmacy_goods_receipt ADD COLUMN IF NOT EXISTS correction_reason TEXT",
    "ALTER TABLE pharmacy_goods_receipt ADD COLUMN IF NOT EXISTS corrected_by VARCHAR(120)",
    "ALTER TABLE pharmacy_goods_receipt ADD COLUMN IF NOT EXISTS correction_type VARCHAR(20)",
  ];

  for (const sql of [...poAlters, ...grAlters]) {
    await pool.query(sql);
    console.log("OK:", sql.slice(0, 80));
  }

  // Verify
  for (const tbl of ["pharmacy_purchase_orders", "pharmacy_goods_receipt"]) {
    const r = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${tbl}' ORDER BY ordinal_position`);
    console.log(`\n${tbl}: ${r.rows.map((r: any) => r.column_name).join(", ")}`);
  }

  console.log("\nDone!");
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
