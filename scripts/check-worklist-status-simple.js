require('dotenv').config();
const postgres = require('postgres');

async function checkWorklistStatus() {
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
  
  try {
    const worklistId = 'a8bb57af-0901-46fa-bdc4-32f6314ec295';
    
    console.log('=== Checking Worklist Status ===\n');
    
    // Get worklist details
    const worklist = await sql`
      SELECT worklistid, worklistname, status, priority
      FROM worklists
      WHERE worklistid = ${worklistId}
    `;
    
    if (worklist.length > 0) {
      console.log(`Worklist: ${worklist[0].worklistname}`);
      console.log(`Status: ${worklist[0].status}`);
      console.log(`Priority: ${worklist[0].priority}\n`);
    }
    
    // Get all samples in worklist with their validation states
    const samples = await sql`
      SELECT 
        wi.sampleid,
        s.samplenumber,
        vs.currentstate
      FROM worklist_items wi
      LEFT JOIN accession_samples s ON wi.sampleid = s.sampleid
      LEFT JOIN validation_states vs ON wi.sampleid = vs.sampleid
      WHERE wi.worklistid = ${worklistId}
    `;
    
    console.log(`Samples in worklist: ${samples.length}\n`);
    
    let analyzedCount = 0;
    samples.forEach(s => {
      const state = s.currentstate || 'NONE';
      console.log(`  ${s.samplenumber}: ${state}`);
      if (state === 'ANALYZED') analyzedCount++;
    });
    
    console.log(`\n${analyzedCount}/${samples.length} samples analyzed`);
    
    if (analyzedCount === samples.length && samples.length > 0) {
      console.log('\n✅ All samples analyzed - worklist should be COMPLETED');
    } else {
      console.log('\n⏳ Not all samples analyzed - worklist should remain PENDING/IN_PROGRESS');
    }
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkWorklistStatus();
