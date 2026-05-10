import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);

async function fixGRNEnum() {
  try {
    console.log("Adding CORRECTION to pharmacy_grn_status_enum...");
    
    await sql`
      ALTER TYPE pharmacy_grn_status_enum 
      ADD VALUE IF NOT EXISTS 'CORRECTION'
    `;
    
    console.log("✓ Enum updated successfully");
    
    // Verify the update
    const enumValues = await sql`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'pharmacy_grn_status_enum'
      )
      ORDER BY enumsortorder
    `;
    console.log("Updated enum values:", enumValues.map(e => e.enumlabel));
    
  } catch (error) {
    console.error("✗ Failed:", error.message);
    throw error;
  } finally {
    await sql.end();
  }
}

fixGRNEnum();
