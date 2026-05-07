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

async function zeroInventoryStock() {
  const sql = postgres(DATABASE_URL, { ssl: 'require' });

  try {
    console.log('Setting all inventory stock quantities to 0...');
    await sql`UPDATE inventory_stock SET quantity = 0, reserved_quantity = 0`;
    console.log('✓ All inventory stock quantities set to 0');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

zeroInventoryStock();
