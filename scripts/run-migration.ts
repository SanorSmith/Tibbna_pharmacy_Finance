/**
 * Run Drizzle migrations against the database.
 * Usage: npx tsx scripts/run-migration.ts
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const client = postgres(`${url}?sslmode=require`, { max: 1 });
  const db = drizzle(client);

  console.log("Running migrations from lib/db/migrations...");
  await migrate(db, { migrationsFolder: "./lib/db/migrations" });

  console.log("✅ Migrations applied successfully!");
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
