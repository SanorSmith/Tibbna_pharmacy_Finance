import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);

async function runMigration() {
  try {
    console.log("Adding patient_ref column to stock_transactions table...");
    
    await sql`
      ALTER TABLE stock_transactions 
      ADD COLUMN IF NOT EXISTS patient_ref TEXT
    `;
    
    await sql`
      COMMENT ON COLUMN stock_transactions.patient_ref IS 'Reference to patient ID for patient-related transactions (e.g., dispense)'
    `;
    
    console.log("✓ Migration completed successfully");
  } catch (error) {
    console.error("✗ Migration failed:", error.message);
    throw error;
  } finally {
    await sql.end();
  }
}

runMigration();
