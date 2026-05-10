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

async function listLinkedItems() {
  const sql = postgres(DATABASE_URL, { ssl: 'require' });

  try {
    console.log('=== ITEMS LINKED TO DRUGS ===\n');
    
    const linkedItems = await sql`
      SELECT 
        i.id as item_id,
        i.name as item_name,
        i.item_type,
        i.drug_id,
        d.name as drug_name,
        d.drugid as drug_drugid
      FROM items i
      INNER JOIN drugs d ON i.drug_id = d.drugid
      ORDER BY i.name
    `;
    
    console.log(`Total linked items: ${linkedItems.length}\n`);
    
    linkedItems.forEach((item, index) => {
      console.log(`${index + 1}. Item: ${item.item_name}`);
      console.log(`   Type: ${item.item_type}`);
      console.log(`   Drug: ${item.drug_name}`);
      console.log(`   Item ID: ${item.item_id}`);
      console.log(`   Drug ID: ${item.drug_id}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

listLinkedItems();
