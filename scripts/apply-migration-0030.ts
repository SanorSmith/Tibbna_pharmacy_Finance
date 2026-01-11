/**
 * Script to apply migration 0030: Add openehrrequestid field
 * This migration adds support for OpenEHR orders in sample accessioning
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
    const migrationPath = join(__dirname, "../lib/db/migrations/0030_add_openehr_request_id.sql");
    const migrationSQL = readFileSync(migrationPath, "utf-8");
    
    console.log("Applying migration 0030...");
    
    // Execute the migration
    await sql.unsafe(migrationSQL);
    
    console.log("✓ Migration 0030 applied successfully!");
    console.log("  - Made orderid nullable");
    console.log("  - Added openehrrequestid column");
    console.log("  - Added index on openehrrequestid");
    
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applyMigration();
