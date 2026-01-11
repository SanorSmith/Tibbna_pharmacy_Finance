require('dotenv').config();
const postgres = require('postgres');

async function checkOpenEHRRequest() {
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
  
  try {
    console.log('=== Checking OpenEHR Request for SMP-2026-0005 ===\n');
    
    const sample = await sql`
      SELECT sampleid, samplenumber, orderid, openehrrequestid, 
             ehrid, patientid, tests
      FROM accession_samples
      WHERE samplenumber = 'SMP-2026-0005'
    `;
    
    if (sample.length > 0) {
      console.log('Sample Details:');
      console.log(`  Sample Number: ${sample[0].samplenumber}`);
      console.log(`  Sample ID: ${sample[0].sampleid}`);
      console.log(`  Order ID: ${sample[0].orderid || 'NULL'}`);
      console.log(`  OpenEHR Request ID: ${sample[0].openehrrequestid || 'NULL'}`);
      console.log(`  EHR ID: ${sample[0].ehrid || 'NULL'}`);
      console.log(`  Patient ID: ${sample[0].patientid || 'NULL'}`);
      console.log(`  Tests: ${JSON.stringify(sample[0].tests)}`);
      
      if (sample[0].openehrrequestid) {
        console.log('\n=== Other samples with same OpenEHR Request ===\n');
        const relatedSamples = await sql`
          SELECT samplenumber, sampletype, currentstatus
          FROM accession_samples
          WHERE openehrrequestid = ${sample[0].openehrrequestid}
        `;
        
        relatedSamples.forEach(s => {
          console.log(`  ${s.samplenumber} (${s.sampletype}) - ${s.currentstatus}`);
        });
      }
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

checkOpenEHRRequest();
