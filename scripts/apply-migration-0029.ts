/**
 * Script to apply migration 0029: Fix accession_samples.orderid type
 * This migration changes orderid from text to uuid and adds foreign key constraint
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
    const migrationPath = join(__dirname, "../lib/db/migrations/0029_fix_accession_orderid_type.sql");
    const migrationSQL = readFileSync(migrationPath, "utf-8");
    
    console.log("Applying migration 0029...");
    console.log("WARNING: This will truncate accession_samples table and related data!");
    
    // Execute the migration
    await sql.unsafe(migrationSQL);
    
    console.log("✓ Migration 0029 applied successfully!");
    console.log("  - Truncated accession_samples table");
    console.log("  - Changed orderid column from text to uuid");
    console.log("  - Added foreign key constraint to lims_orders");
    
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applyMigration();
