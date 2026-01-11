require('dotenv').config();
const postgres = require('postgres');

async function checkWorklistSamples() {
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
  
  try {
    const worklistId = 'a8bb57af-0901-46fa-bdc4-32f6314ec295'; // Night shift
    
    console.log('=== Checking Worklist: Night shift ===\n');
    
    // Get all samples in this worklist
    const worklistItems = await sql`
      SELECT wi.sampleid, acs.samplenumber, acs.sampletype
      FROM worklist_items wi
      LEFT JOIN accession_samples acs ON wi.sampleid = acs.sampleid
      WHERE wi.worklistid = ${worklistId}::uuid
    `;
    
    console.log(`Total samples in worklist: ${worklistItems.length}\n`);
    
    for (const item of worklistItems) {
      console.log(`Sample: ${item.samplenumber || item.sampleid}`);
      console.log(`Type: ${item.sampletype}`);
      
      // Check validation state
      const validationState = await sql`
        SELECT currentstate, updatedat
        FROM validation_states
        WHERE sampleid = ${item.sampleid}
      `;
      
      if (validationState.length > 0) {
        console.log(`State: ${validationState[0].currentstate}`);
        console.log(`Updated: ${validationState[0].updatedat}`);
      } else {
        console.log('State: NO VALIDATION STATE');
      }
      
      // Check test results
      const results = await sql`
        SELECT COUNT(*) as count
        FROM test_results
        WHERE sampleid = ${item.sampleid}
      `;
      
      console.log(`Test Results: ${results[0].count}`);
      console.log('---\n');
    }
    
    // Check worklist status
    const worklist = await sql`
      SELECT status, updatedat
      FROM worklists
      WHERE worklistid = ${worklistId}::uuid
    `;
    
    console.log('\n=== Worklist Status ===');
    console.log(`Status: ${worklist[0].status}`);
    console.log(`Updated: ${worklist[0].updatedat}`);
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkWorklistSamples();
