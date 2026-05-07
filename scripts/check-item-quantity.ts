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

async function checkItemQuantity() {
  const sql = postgres(DATABASE_URL, { ssl: 'require' });

  try {
    const itemName = 'Paracetamol 350 + Homatropine methylbromide';
    console.log(`Checking quantity for: ${itemName}`);
    
    // Find item by name
    const itemResult = await sql`
      SELECT id, name, item_type FROM items WHERE name = ${itemName}
    `;
    
    if (itemResult.length === 0) {
      console.log('Item not found in items table');
      return;
    }
    
    const item = itemResult[0];
    console.log(`\nItem ID: ${item.id}`);
    console.log(`Item Name: ${item.name}`);
    console.log(`Item Type: ${item.item_type}`);
    
    // Check inventory stock
    const stockResult = await sql`
      SELECT * FROM inventory_stock WHERE item_id = ${item.id}
    `;
    
    console.log(`\nInventory Stock Records: ${stockResult.length}`);
    
    if (stockResult.length > 0) {
      stockResult.forEach((stock, index) => {
        console.log(`\n--- Stock Record ${index + 1} ---`);
        console.log(`Warehouse ID: ${stock.warehouse_id}`);
        console.log(`Quantity: ${stock.quantity}`);
        console.log(`Reserved Quantity: ${stock.reserved_quantity}`);
        console.log(`Batch ID: ${stock.batch_id}`);
        console.log(`Updated At: ${stock.updated_at}`);
      });
    } else {
      console.log('No stock records found for this item');
    }
    
    // Check item batches
    const batchResult = await sql`
      SELECT * FROM item_batches WHERE item_id = ${item.id}
    `;
    
    console.log(`\nItem Batches: ${batchResult.length}`);
    
    if (batchResult.length > 0) {
      batchResult.forEach((batch, index) => {
        console.log(`\n--- Batch ${index + 1} ---`);
        console.log(`Batch ID: ${batch.id}`);
        console.log(`Batch Number: ${batch.batch_number}`);
        console.log(`Expiry Date: ${batch.expiry_date}`);
        console.log(`Selling Price: ${batch.selling_price}`);
        console.log(`Unit Cost: ${batch.unit_cost}`);
      });
    } else {
      console.log('No batches found for this item');
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

checkItemQuantity();
