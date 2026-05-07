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

async function checkTableConnections() {
  const sql = postgres(DATABASE_URL, { ssl: 'require' });

  try {
    console.log('=== CHECKING TABLE CONNECTIONS ===\n');

    // 1. Check drugs table structure
    console.log('--- DRUGS TABLE STRUCTURE ---');
    const drugsColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'drugs'
      ORDER BY ordinal_position
    `;
    console.log('Drugs table columns:');
    console.log(drugsColumns);
    
    const drugsCount = await sql`SELECT COUNT(*) as count FROM drugs`;
    console.log(`\nTotal drugs: ${drugsCount[0].count}`);
    
    // 2. Check items table
    console.log('\n--- ITEMS TABLE ---');
    const itemsCount = await sql`SELECT COUNT(*) as count FROM items`;
    console.log(`Total items: ${itemsCount[0].count}`);
    
    const itemsByType = await sql`
      SELECT item_type, COUNT(*) as count FROM items GROUP BY item_type
    `;
    console.log('\nItems by type:');
    console.log(itemsByType);
    
    // 3. Check items table structure
    console.log('\n--- ITEMS TABLE STRUCTURE ---');
    const itemsColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'items'
      ORDER BY ordinal_position
    `;
    console.log('Items table columns:');
    console.log(itemsColumns);
    
    // 4. Check connection: items -> drugs (ONE-WAY connection)
    console.log('\n--- ITEMS → DRUGS CONNECTION (ONE-WAY) ---');
    const itemsWithDrugId = await sql`
      SELECT COUNT(*) as count FROM items WHERE drug_id IS NOT NULL
    `;
    console.log(`Items with drug_id (linked to drugs): ${itemsWithDrugId[0].count}`);
    
    const itemsWithoutDrugId = await sql`
      SELECT COUNT(*) as count FROM items WHERE drug_id IS NULL
    `;
    console.log(`Items without drug_id (standalone): ${itemsWithoutDrugId[0].count}`);
    
    // 5. Check if drugs table has item_id (it doesn't based on schema)
    console.log('\n--- DRUGS → ITEMS CONNECTION ---');
    console.log('❌ drugs table does NOT have item_id column');
    console.log('❌ Connection is ONE-WAY only: items → drugs via items.drug_id');
    
    // 5. Check item_batches
    console.log('\n--- ITEM_BATCHES TABLE ---');
    const batchesCount = await sql`SELECT COUNT(*) as count FROM item_batches`;
    console.log(`Total item_batches: ${batchesCount[0].count}`);
    
    const batchesWithItem = await sql`
      SELECT COUNT(*) as count FROM item_batches WHERE item_id IS NOT NULL
    `;
    console.log(`Batches linked to items: ${batchesWithItem[0].count}`);
    
    // 6. Check inventory_stock
    console.log('\n--- INVENTORY_STOCK TABLE ---');
    const stockCount = await sql`SELECT COUNT(*) as count FROM inventory_stock`;
    console.log(`Total inventory_stock records: ${stockCount[0].count}`);
    
    const stockWithItem = await sql`
      SELECT COUNT(*) as count FROM inventory_stock WHERE item_id IS NOT NULL
    `;
    console.log(`Stock records linked to items: ${stockWithItem[0].count}`);
    
    const stockWithBatch = await sql`
      SELECT COUNT(*) as count FROM inventory_stock WHERE batch_id IS NOT NULL
    `;
    console.log(`Stock records linked to batches: ${stockWithBatch[0].count}`);
    
    const stockWithoutBatch = await sql`
      SELECT COUNT(*) as count FROM inventory_stock WHERE batch_id IS NULL
    `;
    console.log(`Stock records WITHOUT batch (null): ${stockWithoutBatch[0].count}`);
    
    // 7. Check orphan records (items without batches, batches without stock, etc.)
    console.log('\n--- ORPHAN RECORDS CHECK ---');
    
    const itemsWithoutBatches = await sql`
      SELECT COUNT(*) as count 
      FROM items i 
      LEFT JOIN item_batches ib ON i.id = ib.item_id 
      WHERE ib.id IS NULL
    `;
    console.log(`Items without any batches: ${itemsWithoutBatches[0].count}`);
    
    const batchesWithoutStock = await sql`
      SELECT COUNT(*) as count 
      FROM item_batches ib 
      LEFT JOIN inventory_stock inv_stock ON ib.id = inv_stock.batch_id 
      WHERE inv_stock.id IS NULL
    `;
    console.log(`Batches without inventory_stock: ${batchesWithoutStock[0].count}`);
    
    const stockWithoutWarehouse = await sql`
      SELECT COUNT(*) as count FROM inventory_stock WHERE warehouse_id IS NULL
    `;
    console.log(`Stock records without warehouse: ${stockWithoutWarehouse[0].count}`);
    
    // 8. Check sample data flow
    console.log('\n--- SAMPLE DATA FLOW ---');
    const sampleFlow = await sql`
      SELECT 
        i.id as item_id,
        i.name as item_name,
        i.item_type,
        i.drug_id,
        d.name as drug_name,
        d.drugid as drug_drugid,
        ib.id as batch_id,
        ib.batch_number,
        inv_stock.id as stock_id,
        inv_stock.quantity,
        inv_stock.warehouse_id
      FROM items i
      LEFT JOIN drugs d ON i.drug_id = d.drugid
      LEFT JOIN item_batches ib ON i.id = ib.item_id
      LEFT JOIN inventory_stock inv_stock ON ib.id = inv_stock.batch_id
      WHERE i.drug_id IS NOT NULL
      LIMIT 3
    `;
    console.log('Sample data flow (items → drugs, items → batches → stock):');
    console.log(sampleFlow);
    
    // 9. Check POS API dependencies
    console.log('\n--- POS API DEPENDENCIES ---');
    console.log('POS search API uses:');
    console.log('- items table (main)');
    console.log('- item_batches (for batch info)');
    console.log('- inventory_stock (for quantity)');
    console.log('- drugs table (via drug_id for enrichment)');
    
    // 10. Summary
    console.log('\n=== CONNECTION SUMMARY ===');
    console.log('✓ drugs → items: via drug_id field');
    console.log('✓ items → item_batches: via item_id foreign key');
    console.log('✓ item_batches → inventory_stock: via batch_id foreign key');
    console.log('⚠️  inventory_stock can have null batch_id (items without batches)');
    console.log('⚠️  Some drugs may not have drug_id (not migrated to unified system)');
    console.log('⚠️  Some items may not have batches (new items without stock)');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

checkTableConnections();
