require('dotenv').config();
const postgres = require('postgres');

async function checkSampleTests() {
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
  
  try {
    console.log('=== Checking Sample Tests ===\n');
    
    // Get recent samples with CBC
    const samples = await sql`
      SELECT samplenumber, sampleid, tests, sampletype
      FROM accession_samples
      WHERE tests::text ILIKE '%CBC%' OR tests::text ILIKE '%Complete Blood Count%'
      ORDER BY createdat DESC
      LIMIT 5
    `;
    
    console.log(`Found ${samples.length} samples with CBC:\n`);
    
    samples.forEach(s => {
      console.log(`Sample: ${s.samplenumber}`);
      console.log(`  Type: ${s.sampletype}`);
      console.log(`  Tests (raw): ${s.tests}`);
      
      // Try to parse if it's JSON
      try {
        const parsed = typeof s.tests === 'string' ? JSON.parse(s.tests) : s.tests;
        console.log(`  Tests (parsed):`, parsed);
      } catch (e) {
        console.log(`  Tests (not JSON):`, s.tests);
      }
      console.log('');
    });
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkSampleTests();
