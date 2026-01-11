require('dotenv').config();
const postgres = require('postgres');

async function checkOpenEHROrderFields() {
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
  
  try {
    console.log('=== Checking OpenEHR Order Fields ===\n');
    
    // Check what fields are available for OpenEHR orders
    const samples = await sql`
      SELECT samplenumber, openehrrequestid, openehrcompositionuid
      FROM accession_samples
      WHERE openehrrequestid IS NOT NULL
      LIMIT 5
    `;
    
    console.log('Sample OpenEHR order data:');
    samples.forEach(s => {
      console.log(`\nSample: ${s.samplenumber}`);
      console.log(`  openehrrequestid: ${s.openehrrequestid}`);
      console.log(`  openehrcompositionuid: ${s.openehrcompositionuid}`);
    });
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkOpenEHROrderFields();
