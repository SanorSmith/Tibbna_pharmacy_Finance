import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);

async function checkGRNEnum() {
  try {
    console.log("Checking GRN status enum in database...");
    
    // Check what enum types exist
    const enumTypes = await sql`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e' 
      AND typname LIKE '%grn%'
    `;
    console.log("GRN-related enum types:", enumTypes);
    
    // Check the values of each enum
    for (const enumType of enumTypes) {
      const enumValues = await sql`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (
          SELECT oid FROM pg_type WHERE typname = ${enumType.typname}
        )
        ORDER BY enumsortorder
      `;
      console.log(`\n${enumType.typname} values:`, enumValues.map(e => e.enumlabel));
    }
    
    // Check the actual column type in pharmacy_goods_receipt table
    const columnInfo = await sql`
      SELECT 
        column_name,
        data_type,
        udt_name
      FROM information_schema.columns
      WHERE table_name = 'pharmacy_goods_receipt'
      AND column_name = 'status'
    `;
    console.log("\npharmacy_goods_receipt.status column:", columnInfo);
    
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await sql.end();
  }
}

checkGRNEnum();
