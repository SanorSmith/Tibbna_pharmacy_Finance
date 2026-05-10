/**
 * Run migration 0044: Update GRN status enum
 * Usage: npx dotenv -e .env.local -- npx tsx scripts/run-migration-0044.ts
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const client = postgres(`${url}?sslmode=require`, { max: 1 });
  const db = drizzle(client);

  const migrationPath = path.join(
    __dirname,
    "../lib/db/migrations/0044_update_grn_status_enum.sql"
  );
  const migrationSql = fs.readFileSync(migrationPath, "utf8");

  console.log("Executing migration SQL...");
  await client.unsafe(migrationSql);

  console.log("\n✅ Migration 0044 completed!");
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
