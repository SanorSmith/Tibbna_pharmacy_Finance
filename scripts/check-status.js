require('dotenv').config();
const postgres = require('postgres');

async function checkStatus() {
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
  
  try {
    console.log('=== Checking Sample Status ===\n');
    
    // Check validation states
    const validationStates = await sql`
      SELECT vs.sampleid, vs.currentstate, vs.updatedat,
             acs.samplenumber, acs.orderid
      FROM validation_states vs
      LEFT JOIN accession_samples acs ON vs.sampleid = acs.sampleid
      ORDER BY vs.updatedat DESC
      LIMIT 10
    `;
    
    console.log('Recent Validation States:');
    validationStates.forEach(v => {
      console.log(`  Sample: ${v.samplenumber || v.sampleid}`);
      console.log(`  State: ${v.currentstate}`);
      console.log(`  Order ID: ${v.orderid}`);
      console.log(`  Updated: ${v.updatedat}\n`);
    });
    
    console.log('\n=== Checking Order Status ===\n');
    
    // Check lims_orders status
    const orders = await sql`
      SELECT orderid, status, updatedat
      FROM lims_orders
      ORDER BY updatedat DESC
      LIMIT 10
    `;
    
    console.log('Recent Orders:');
    orders.forEach(o => {
      console.log(`  Order ID: ${o.orderid}`);
      console.log(`  Status: ${o.status}`);
      console.log(`  Updated: ${o.updatedat}\n`);
    });
    
    console.log('\n=== Checking Worklist Status ===\n');
    
    // Check worklists status
    const worklists = await sql`
      SELECT worklistid, worklistname, status, updatedat
      FROM worklists
      ORDER BY updatedat DESC
      LIMIT 10
    `;
    
    console.log('Recent Worklists:');
    worklists.forEach(w => {
      console.log(`  Worklist: ${w.worklistname} (${w.worklistid})`);
      console.log(`  Status: ${w.status}`);
      console.log(`  Updated: ${w.updatedat}\n`);
    });
    
    console.log('\n=== Checking Test Results ===\n');
    
    // Check test results
    const results = await sql`
      SELECT tr.sampleid, tr.testname, tr.status, tr.createdat,
             acs.samplenumber, acs.orderid
      FROM test_results tr
      LEFT JOIN accession_samples acs ON tr.sampleid = acs.sampleid
      ORDER BY tr.createdat DESC
      LIMIT 10
    `;
    
    console.log('Recent Test Results:');
    results.forEach(r => {
      console.log(`  Sample: ${r.samplenumber || r.sampleid}`);
      console.log(`  Test: ${r.testname}`);
      console.log(`  Status: ${r.status}`);
      console.log(`  Order ID: ${r.orderid}`);
      console.log(`  Created: ${r.createdat}\n`);
    });
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkStatus();
