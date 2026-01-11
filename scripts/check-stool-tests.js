require('dotenv').config();
const postgres = require('postgres');

async function checkStoolTests() {
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
  
  try {
    console.log('Checking Stool Tests records...\n');
    
    const results = await sql`
      SELECT testcode, testname, unit, referencetext, agegroup, sex
      FROM test_reference_ranges
      WHERE testcode LIKE '%Stool%'
      ORDER BY testcode, agegroup, sex
    `;
    
    console.log('Found records:', results.length);
    results.forEach((r, i) => {
      console.log(`\n${i + 1}. testcode: "${r.testcode}"`);
      console.log(`   testname: "${r.testname}"`);
      console.log(`   unit: "${r.unit}"`);
      console.log(`   referencetext: "${r.referencetext}"`);
      console.log(`   agegroup: "${r.agegroup}", sex: "${r.sex}"`);
    });
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkStoolTests();
