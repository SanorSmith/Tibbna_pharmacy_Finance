require('dotenv').config();
const postgres = require('postgres');

async function checkSampleOrder() {
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
  
  try {
    console.log('=== Checking Sample SMP-2026-0005 ===\n');
    
    const sample = await sql`
      SELECT sampleid, samplenumber, orderid, sampletype, 
             collectiondate
      FROM accession_samples
      WHERE samplenumber = 'SMP-2026-0005'
    `;
    
    if (sample.length > 0) {
      console.log('Sample Details:');
      console.log(JSON.stringify(sample[0], null, 2));
      
      // Check if there are worklist items for this sample
      console.log('\n=== Worklist Items ===\n');
      const worklistItems = await sql`
        SELECT wi.worklistid, wi.sampleid, w.worklistname, w.status
        FROM worklist_items wi
        LEFT JOIN worklists w ON wi.worklistid = w.worklistid
        WHERE wi.sampleid = ${sample[0].sampleid}
      `;
      
      console.log('Worklist Items:');
      worklistItems.forEach(item => {
        console.log(`  Worklist: ${item.worklistname}`);
        console.log(`  Worklist ID: ${item.worklistid}`);
        console.log(`  Status: ${item.status}\n`);
      });
      
      // Check test results for this sample
      console.log('=== Test Results ===\n');
      const results = await sql`
        SELECT testname, resultvalue, status, createdat
        FROM test_results
        WHERE sampleid = ${sample[0].sampleid}
        ORDER BY createdat DESC
      `;
      
      console.log('Test Results:');
      results.forEach(r => {
        console.log(`  Test: ${r.testname}`);
        console.log(`  Value: ${r.resultvalue}`);
        console.log(`  Status: ${r.status}`);
        console.log(`  Created: ${r.createdat}\n`);
      });
    } else {
      console.log('Sample not found!');
    }
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkSampleOrder();
