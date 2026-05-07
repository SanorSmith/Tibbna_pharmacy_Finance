const { Client } = require('pg');

async function testAPIPrice() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  });

  try {
    await client.connect();
    
    const orderId = 'a14271a3-ff11-417b-bf5c-d15dd77c8d29';
    console.log('Testing API Price Query for Order:', orderId);
    
    // This is the exact query from the POS API
    const query = `
      SELECT 
        poi.itemid,
        poi.drugid,
        poi.drugname,
        poi.quantity,
        poi.quantitydispensed,
        poi.unitprice,
        poi.status,
        d.form,
        d.strength,
        -- Best available batch selling price
        (
          SELECT db.sellingprice
          FROM drug_batches db
          WHERE db.drugid = poi.drugid
            AND db.expirydate > CURRENT_DATE
            AND db.batchid IN (
              SELECT psl.batchid FROM pharmacy_stock_levels psl
              WHERE psl.drugid = poi.drugid AND psl.quantity > 0
            )
          ORDER BY db.expirydate ASC
          LIMIT 1
        ) as "bestBatchPrice",
        -- Fallback: find price by drug NAME
        (
          SELECT db.sellingprice
          FROM drugs d2
          JOIN drug_batches db ON db.drugid = d2.drugid
          JOIN pharmacy_stock_levels psl ON psl.batchid = db.batchid AND psl.drugid = d2.drugid
          WHERE d2.name = poi.drugname
            AND db.expirydate > CURRENT_DATE
            AND psl.quantity > 0
            AND db.sellingprice IS NOT NULL
          ORDER BY db.expirydate ASC
          LIMIT 1
        ) as "nameBasedPrice",
        -- Fallback: selling price from item_batches (inventory system)
        (
          SELECT ib.selling_price
          FROM items i
          JOIN item_batches ib ON ib.item_id = i.id
          WHERE i.name = poi.drugname
            AND ib.selling_price IS NOT NULL
          ORDER BY ib.created_at DESC
          LIMIT 1
        ) as "inventorySellingPrice"
      FROM pharmacy_order_items poi
      LEFT JOIN drugs d ON poi.drugid = d.drugid
      WHERE poi.orderid = $1
    `;
    
    const result = await client.query(query, [orderId]);
    
    console.log('\nAPI Query Results:');
    if (result.rows.length > 0) {
      result.rows.forEach((row, index) => {
        console.log(`\nItem ${index + 1}:`);
        console.log(`  Drug Name: ${row.drugname}`);
        console.log(`  Unit Price: ${row.unitprice}`);
        console.log(`  Best Batch Price: ${row.bestBatchPrice}`);
        console.log(`  Name Based Price: ${row.nameBasedPrice}`);
        console.log(`  ✅ Inventory Selling Price: ${row.inventorySellingPrice}`);
        
        // Simulate the price resolution logic
        let finalPrice = 0;
        if (row.unitprice && parseFloat(row.unitprice) > 0) finalPrice = parseFloat(row.unitprice);
        else if (row.bestBatchPrice && parseFloat(row.bestBatchPrice) > 0) finalPrice = parseFloat(row.bestBatchPrice);
        else if (row.nameBasedPrice && parseFloat(row.nameBasedPrice) > 0) finalPrice = parseFloat(row.nameBasedPrice);
        else if (row.inventorySellingPrice && parseFloat(row.inventorySellingPrice) > 0) finalPrice = parseFloat(row.inventorySellingPrice);
        else {
          const form = row.form?.toLowerCase() || '';
          if (form.includes('syrup') || form.includes('suspension')) finalPrice = 5000;
          else finalPrice = 10000;
        }
        
        console.log(`  🎯 Final Price: ${finalPrice.toLocaleString()} IQD`);
      });
    } else {
      console.log('No items found for this order');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

testAPIPrice();
