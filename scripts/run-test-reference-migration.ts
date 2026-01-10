import { db } from "../lib/db/index";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

async function runMigration() {
  try {
    console.log("Running test_reference_ranges migration...");
    
    const migrationPath = path.join(__dirname, "../lib/db/migrations/0028_create_test_reference_ranges.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");
    
    await db.execute(sql.raw(migrationSQL));
    
    console.log("✅ Migration applied successfully!");
    console.log("Table test_reference_ranges created.");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
