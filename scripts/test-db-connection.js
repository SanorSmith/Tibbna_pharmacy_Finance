require('dotenv').config();
const postgres = require('postgres');

async function testConnection() {
  console.log('DATABASE_URL from .env:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  console.log('Connection string (masked):', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
  
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
  
  try {
    // Test basic connection
    const result = await sql`SELECT current_database(), current_schema()`;
    console.log('\nConnected to database:', result[0].current_database);
    console.log('Current schema:', result[0].current_schema);
    
    // Check if table exists
    const tableCheck = await sql`
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE tablename = 'test_reference_ranges'
    `;
    console.log('\nTable search results:', tableCheck);
    
    // List all tables in public schema
    const allTables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `;
    console.log('\nAll tables in public schema:', allTables.map(t => t.tablename));
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Connection error:', error);
    await sql.end();
    process.exit(1);
  }
}

testConnection();
