require('dotenv').config();
const postgres = require('postgres');

async function removeDuplicates() {
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
  
  try {
    console.log('Removing duplicate Stool Tests records...');
    
    // Keep only one record, delete the rest
    await sql`
      DELETE FROM test_reference_ranges
      WHERE rangeid IN (
        SELECT rangeid
        FROM (
          SELECT rangeid, 
                 ROW_NUMBER() OVER (
                   PARTITION BY testcode, agegroup, sex, workspaceid 
                   ORDER BY createdat
                 ) as rn
          FROM test_reference_ranges
          WHERE testcode = 'Stool Tests'
        ) t
        WHERE t.rn > 1
      )
    `;
    
    console.log('✅ Duplicates removed');
    
    const remaining = await sql`
      SELECT COUNT(*) as count
      FROM test_reference_ranges
      WHERE testcode = 'Stool Tests'
    `;
    
    console.log(`Remaining Stool Tests records: ${remaining[0].count}`);
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

removeDuplicates();
