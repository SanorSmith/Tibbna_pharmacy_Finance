import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables manually
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

const dbUrlLine = envContent
  .split('\n')
  .find(line => line.startsWith('DATABASE_URL='));

if (!dbUrlLine) {
  console.error('DATABASE_URL not found in .env file');
  process.exit(1);
}

const DATABASE_URL = dbUrlLine.split('=')[1]?.trim();

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in .env file');
  process.exit(1);
}

async function checkInventoryStock() {
  const sql = postgres(DATABASE_URL, { ssl: 'require' });

  try {
    console.log('Checking inventory_stock table...');
    
    // Count total records
    const countResult = await sql`SELECT COUNT(*) as count FROM inventory_stock`;
    console.log(`Total records: ${countResult[0].count}`);
    
    // Check if any records have quantity > 0
    const nonZeroResult = await sql`SELECT COUNT(*) as count FROM inventory_stock WHERE quantity > 0`;
    console.log(`Records with quantity > 0: ${nonZeroResult[0].count}`);
    
    // Show sample records
    const sampleResult = await sql`SELECT * FROM inventory_stock LIMIT 5`;
    console.log('\nSample records:');
    console.log(sampleResult);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

checkInventoryStock();
