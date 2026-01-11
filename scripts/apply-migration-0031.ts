/**
 * Script to apply migration 0031: Make worklist_items.orderid nullable
 * This migration allows adding samples to worklists without an orderid
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
    const migrationPath = join(__dirname, "../lib/db/migrations/0031_make_worklist_orderid_nullable.sql");
    const migrationSQL = readFileSync(migrationPath, "utf-8");
    
    console.log("Applying migration 0031...");
    
    // Execute the migration
    await sql.unsafe(migrationSQL);
    
    console.log("✓ Migration 0031 applied successfully!");
    console.log("  - Made worklist_items.orderid nullable");
    
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applyMigration();
