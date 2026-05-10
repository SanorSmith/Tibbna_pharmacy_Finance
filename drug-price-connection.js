const { Client } = require('pg');

async function showDrugPriceConnection() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  });

  try {
    await client.connect();
    
    const drugId = '48b3de80-c1d5-4309-9284-ae49e00b397c';
    
    console.log('Drug ID to Price Connection Analysis');
    console.log('=====================================');
    console.log('Drug ID:', drugId);
    
    // Step 1: Get the drug record
    console.log('\n=== STEP 1: Drug Record (Pharmacy Schema) ===');
    const drugQuery = 'SELECT * FROM drugs WHERE drugid = $1';
    const drugResult = await client.query(drugQuery, [drugId]);
    
    if (drugResult.rows.length > 0) {
      const drug = drugResult.rows[0];
      console.log('Drug Record:');
      console.log('  drugid:', drug.drugid);
      console.log('  name:', drug.name);
      console.log('  workspaceid:', drug.workspaceid);
      
      // Step 2: Show pharmacy order items
      console.log('\n=== STEP 2: Pharmacy Order Items (Pharmacy Schema) ===');
      const orderQuery = 'SELECT * FROM pharmacy_order_items WHERE drugid = $1';
      const orderResult = await client.query(orderQuery, [drugId]);
      
      if (orderResult.rows.length > 0) {
        console.log('Connected Pharmacy Order Items:');
        orderResult.rows.forEach((row, index) => {
          console.log(`  ${index + 1}. itemid: ${row.itemid}`);
          console.log(`     orderid: ${row.orderid}`);
          console.log(`     drugname: ${row.drugname}`);
          console.log(`     unitprice: ${row.unitprice} (NULL - no price stored here)`);
        });
      }
      
      // Step 3: Show inventory system connection
      console.log('\n=== STEP 3: Inventory System Connection (by name) ===');
      console.log('Drug Name Bridge:', drug.name);
      
      const itemsQuery = 'SELECT * FROM items WHERE name = $1';
      const itemsResult = await client.query(itemsQuery, [drug.name]);
      
      if (itemsResult.rows.length > 0) {
        console.log('Connected Items Records:');
        for (const row of itemsResult.rows) {
          console.log(`  item_id: ${row.id}`);
          console.log(`  name: ${row.name}`);
          
          // Step 4: Show price connection
          console.log(`\n=== STEP 4: Price Records (item_batches) ===`);
          const batchQuery = 'SELECT * FROM item_batches WHERE item_id = $1';
          const batchResult = await client.query(batchQuery, [row.id]);
          
          if (batchResult.rows.length > 0) {
            console.log(`  Price Records for item ${row.id}:`);
            batchResult.rows.forEach((batch, batchIndex) => {
              console.log(`    ${batchIndex + 1}. batch_id: ${batch.id}`);
              console.log(`       selling_price: ${batch.selling_price} (THE PRICE!)`);
              console.log(`       quantity: ${batch.quantity}`);
              console.log(`       warehouse_id: ${batch.warehouse_id}`);
            });
          }
        }
      }
    }
    
    // Step 5: Show why pharmacy schema prices are NULL
    console.log('\n=== STEP 5: Why Pharmacy Schema Prices are NULL ===');
    const drugBatchesQuery = 'SELECT * FROM drug_batches WHERE drugid = $1';
    const drugBatchesResult = await client.query(drugBatchesQuery, [drugId]);
    
    if (drugBatchesResult.rows.length === 0) {
      console.log('❌ drug_batches table is EMPTY for this drug');
      console.log('❌ This is why bestBatchPrice and sellingprice are NULL');
    }
    
    console.log('\n=== CONNECTION SUMMARY ===');
    console.log('Drug ID (pharmacy.drugs) → Drug Name');
    console.log('Drug Name → Items ID (inventory.items)');
    console.log('Items ID → Selling Price (inventory.item_batches)');
    console.log('');
    console.log('The price is stored in inventory.item_batches, NOT pharmacy.drug_batches');
    console.log('This is why we need the inventorySellingPrice bridge in the APIs');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

showDrugPriceConnection();
