const { Client } = require('pg');

async function testDirectPriceAPI() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  });

  try {
    await client.connect();
    
    const drugName = 'ILoprost (as trometamol) /1ml';
    console.log('Testing Direct Price API Query for:', drugName);
    
    // This is the exact query from the new API endpoint
    const query = `
      SELECT ib.selling_price as price
      FROM items i
      JOIN item_batches ib ON ib.item_id = i.id
      WHERE i.name = $1
        AND ib.selling_price IS NOT NULL
      ORDER BY ib.created_at DESC
      LIMIT 1
    `;
    
    const result = await client.query(query, [drugName]);
    
    console.log('\nDirect Price API Query Results:');
    if (result.rows.length > 0) {
      const price = parseFloat(result.rows[0].price);
      console.log(`✅ Found price: ${price.toLocaleString()} IQD for ${drugName}`);
      console.log('This should now appear in the prescription items table!');
    } else {
      console.log('❌ No price found for this drug');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

testDirectPriceAPI();
