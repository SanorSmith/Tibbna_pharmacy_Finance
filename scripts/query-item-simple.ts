import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

// Load .env file manually
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const DATABASE_URL = envVars.DATABASE_URL;

async function queryItem() {
  const sql = postgres(DATABASE_URL);
  
  const itemId = '202a55a8-ba27-40b2-93b9-cd7f6777f444';
  
  const result = await sql`
    SELECT 
      i.id,
      i.name,
      i.drug_id,
      i.item_type,
      i.manufacturer,
      ist.quantity,
      ist.reserved_quantity,
      ist.batch_id,
      ib.batch_number,
      ib.expiry_date
    FROM inventory_stock ist
    JOIN items i ON i.id = ist.item_id
    LEFT JOIN item_batches ib ON ib.id = ist.batch_id
    WHERE ist.item_id = ${itemId}
  `;
  
  console.log('Result:', JSON.stringify(result, null, 2));
  await sql.end();
}

queryItem().catch(console.error);
