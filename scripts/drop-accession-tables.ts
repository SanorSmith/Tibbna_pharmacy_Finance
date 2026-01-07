/**
 * Drop accessioning tables to fix migration
 */
import postgres from 'postgres';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env
config({ path: resolve(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  console.error('Make sure .env exists with DATABASE_URL');
  process.exit(1);
}

// Add SSL mode to connection URL
const connectionUrl = `${DATABASE_URL}${DATABASE_URL.includes('?') ? '&' : '?'}sslmode=require`;
const sql = postgres(connectionUrl);

async function dropTables() {
  try {
    console.log('Dropping accessioning tables...');
    
    await sql`DROP TABLE IF EXISTS sample_accession_audit_log CASCADE`;
    console.log('✓ Dropped sample_accession_audit_log');
    
    await sql`DROP TABLE IF EXISTS sample_status_history CASCADE`;
    console.log('✓ Dropped sample_status_history');
    
    await sql`DROP TABLE IF EXISTS accession_samples CASCADE`;
    console.log('✓ Dropped accession_samples');
    
    console.log('\n✅ All accessioning tables dropped successfully');
    console.log('Now run: npx drizzle-kit push');
    
  } catch (error) {
    console.error('Error dropping tables:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

dropTables();
