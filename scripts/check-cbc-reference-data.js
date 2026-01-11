require('dotenv').config();
const postgres = require('postgres');

async function checkCBCReferenceData() {
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
  
  try {
    const workspaceId = 'fa9fb036-a7eb-49af-890c-54406dad139d';
    const cbcTests = ['HGB', 'RBC', 'WBC', 'HCT', 'MCV', 'MCH', 'MCHC', 'PLT', 'RDW'];
    
    console.log('=== Checking CBC Reference Data in Database ===\n');
    
    for (const testCode of cbcTests) {
      const results = await sql`
        SELECT testcode, testname, unit, referencemin, referencemax, 
               agegroup, sex, isactive
        FROM test_reference_ranges
        WHERE workspaceid = ${workspaceId}
          AND UPPER(testcode) = UPPER(${testCode})
          AND isactive = 'Y'
      `;
      
      console.log(`${testCode}:`);
      if (results.length > 0) {
        results.forEach(r => {
          console.log(`  ✓ ${r.testname} (${r.agegroup}/${r.sex})`);
          console.log(`    Unit: ${r.unit}`);
          console.log(`    Range: ${r.referencemin} - ${r.referencemax}`);
        });
      } else {
        console.log(`  ✗ No reference data found`);
      }
      console.log('');
    }
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkCBCReferenceData();
