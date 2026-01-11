require('dotenv').config();
const postgres = require('postgres');

async function verifyTable() {
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
  
  try {
    console.log('Checking if test_reference_ranges table exists...');
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'test_reference_ranges'
      );
    `;
    console.log('Table exists:', result[0].exists);
    
    if (result[0].exists) {
      console.log('\nChecking table structure...');
      const columns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'test_reference_ranges'
        ORDER BY ordinal_position;
      `;
      console.log('Columns:', columns);
      
      console.log('\nChecking row count...');
      const count = await sql`SELECT COUNT(*) FROM test_reference_ranges`;
      console.log('Row count:', count[0].count);
    }
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
    process.exit(1);
  }
}

verifyTable();
