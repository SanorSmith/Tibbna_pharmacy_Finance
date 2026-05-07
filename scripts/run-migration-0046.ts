import "dotenv/config";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const pool = new Pool({ connectionString: url });

  const migrationPath = path.join(__dirname, "../lib/db/migrations/0046_recreate_vendors_table.sql");
  const migrationSql = fs.readFileSync(migrationPath, "utf8");

  console.log("Executing migration SQL...");
  await pool.query(migrationSql);

  console.log("\n✅ Migration 0046 completed!");
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
