/**
 * Script to apply migration 0032: Add tests field to accession_samples
 */

import "dotenv/config";
import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

async function applyMigration() {
  const sql = postgres(`${DATABASE_URL}?sslmode=require`);
  
  try {
    console.log("Reading migration file...");
    const migrationPath = join(__dirname, "../lib/db/migrations/0032_add_tests_to_accession_samples.sql");
    const migrationSQL = readFileSync(migrationPath, "utf-8");
    
    console.log("Applying migration 0032...");
    
    await sql.unsafe(migrationSQL);
    
    console.log("✓ Migration 0032 applied successfully!");
    console.log("  - Added tests column to accession_samples");
    
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applyMigration();
