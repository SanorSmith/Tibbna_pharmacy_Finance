require('dotenv').config();
const postgres = require('postgres');

async function updateOpenEHROrderStatus() {
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
  
  try {
    const openehrrequestid = 'testreq-1766929331085';
    
    console.log(`=== Updating OpenEHR Order Status for ${openehrrequestid} ===\n`);
    
    // Get all samples for this OpenEHR request
    const samples = await sql`
      SELECT sampleid, samplenumber, currentstatus
      FROM accession_samples
      WHERE openehrrequestid = ${openehrrequestid}
    `;
    
    console.log(`Total samples: ${samples.length}\n`);
    
    // Check validation states for each sample
    let analyzedCount = 0;
    for (const sample of samples) {
      const validationState = await sql`
        SELECT currentstate
        FROM validation_states
        WHERE sampleid = ${sample.sampleid}
      `;
      
      const state = validationState.length > 0 ? validationState[0].currentstate : 'NONE';
      console.log(`  ${sample.samplenumber}: ${state}`);
      
      if (state === 'ANALYZED') {
        analyzedCount++;
      }
    }
    
    console.log(`\n${analyzedCount}/${samples.length} samples analyzed\n`);
    
    // Determine order status
    let orderStatus;
    if (analyzedCount === 0) {
      orderStatus = 'REQUESTED';
    } else if (analyzedCount === samples.length) {
      orderStatus = 'COMPLETED';
    } else {
      orderStatus = 'IN_PROGRESS';
    }
    
    console.log(`Order status should be: ${orderStatus}`);
    
    // Note: For OpenEHR orders, we don't have a lims_orders entry
    // The status is tracked through the samples' validation states
    // In a real implementation, you would update the OpenEHR composition here
    
    console.log('\n✅ Status check complete');
    console.log('Note: OpenEHR orders are tracked via sample validation states, not lims_orders table');
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
    process.exit(1);
  }
}

updateOpenEHROrderStatus();
