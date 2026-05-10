import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const sql = postgres(envVars.DATABASE_URL);

async function checkDrugMapping() {
  const drugId = '0dfd76f1-7e6e-4397-a9b8-84d98b35c364';
  
  const itemByDrugId = await sql`
    SELECT id, name, drug_id FROM items WHERE drug_id = ${drugId}
  `;
  console.log('Item by drug_id:', JSON.stringify(itemByDrugId, null, 2));
  
  const itemByName = await sql`
    SELECT id, name, drug_id FROM items WHERE name ILIKE '%ILoprost%'
  `;
  console.log('\nItem by name:', JSON.stringify(itemByName, null, 2));
  
  await sql.end();
}

checkDrugMapping().catch(console.error);
