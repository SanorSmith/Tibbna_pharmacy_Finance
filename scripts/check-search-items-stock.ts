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

// Items from search results for "para"
const searchItems = [
  'Abaloparatide / ml 2000mcg',
  'Paracetamol + Acetylsalicylic acid + Caffeine 65 mg',
  'Para-amino salicylic acid (PAS) m/',
  'Paracetamol',
  'Paracetamol Suppository',
  'paracetamol + codeine phosphate hemihydrate 30 mg',
  'Paracetamol + Codeine phosphate 8 mg + Caffeine 50mg',
  'Prifinium Bromide + Paracetamol 325mg',
  'Paracetamol +PseudoephedrineHydrochloride 30mg',
  'Chlorpheniramine maleate +Paracetamol 350mg',
  'Paracetamol + Chlorpheniramine maleate 2mg/5 ml',
  'Ibuprofen + paracetamol 325 mg',
  'Paracetamol + phenylephrine Hydrochloride 5mg',
  'Paracetamol 350 + Homatropine methylbromide',
  'Paracetamol +Pseudoephedrine Hydrochloride 30mg+Chlorpheniramine maleate 4mg',
  'Paracetamol + Phenylephrine Hydrochloride 5mg +Caffeine 25 mg'
];

async function checkSearchItemsStock() {
  const sql = postgres(DATABASE_URL, { ssl: 'require' });

  try {
    console.log('=== CHECKING STOCK FOR SEARCH RESULT ITEMS ===\n');

    for (const itemName of searchItems) {
      console.log(`--- ${itemName} ---`);
      
      // Get item info
      const itemResult = await sql`
        SELECT id, name, item_type, drug_id
        FROM items
        WHERE name = ${itemName}
        LIMIT 1
      `;
      
      if (itemResult.length === 0) {
        console.log('❌ Item NOT found in items table\n');
        continue;
      }
      
      const item = itemResult[0];
      console.log(`Item ID: ${item.id}`);
      console.log(`Item Type: ${item.item_type}`);
      console.log(`Drug ID: ${item.drug_id || 'null'}`);
      
      // Check batches
      const batches = await sql`
        SELECT id, batch_number, selling_price, unit_cost, expiry_date
        FROM item_batches
        WHERE item_id = ${item.id}
      `;
      
      console.log(`Batches: ${batches.length}`);
      if (batches.length > 0) {
        batches.forEach((b, i) => {
          console.log(`  Batch ${i + 1}: ${b.batch_number} | Price: ${b.selling_price || 'null'} | Cost: ${b.unit_cost || 'null'} | Expiry: ${b.expiry_date || 'null'}`);
        });
      }
      
      // Check inventory_stock
      const stockRecords = await sql`
        SELECT id, warehouse_id, batch_id, quantity, reserved_quantity
        FROM inventory_stock
        WHERE item_id = ${item.id}
      `;
      
      console.log(`Stock Records: ${stockRecords.length}`);
      if (stockRecords.length > 0) {
        stockRecords.forEach((s, i) => {
          console.log(`  Stock ${i + 1}: Qty: ${s.quantity} | Reserved: ${s.reserved_quantity} | Batch ID: ${s.batch_id || 'null'} | Warehouse: ${s.warehouse_id}`);
        });
      }
      
      // Calculate total stock
      const totalStock = await sql`
        SELECT COALESCE(SUM(quantity), 0) as total
        FROM inventory_stock
        WHERE item_id = ${item.id}
      `;
      
      console.log(`Total Stock: ${totalStock[0].total}\n`);
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

checkSearchItemsStock();
