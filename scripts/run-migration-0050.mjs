import postgres from 'postgres';
import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sql = postgres(process.env.DATABASE_URL);

async function runMigration() {
  try {
    console.log('Running migration 0050: Add correction_of_item_id...');
    
    const migrationSQL = readFileSync(
      join(__dirname, '../lib/db/migrations/0050_add_correction_of_item_id.sql'),
      'utf-8'
    );
    
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migration 0050 completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await sql.end();
  }
}

runMigration();
