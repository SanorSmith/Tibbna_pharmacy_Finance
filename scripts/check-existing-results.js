require('dotenv').config();
const postgres = require('postgres');

async function checkExistingResults() {
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
  
  try {
    const sampleId = 'b5822be2-9f4c-429f-ab1a-093583abd9e2';
    
    console.log('=== Checking Existing Results for Sample ===\n');
    
    // Check validation state
    const validationState = await sql`
      SELECT * FROM validation_states
      WHERE sampleid = ${sampleId}
    `;
    
    console.log('Validation State:');
    if (validationState.length > 0) {
      console.log(`  Current State: ${validationState[0].currentstate}`);
      console.log(`  Created: ${validationState[0].createdat}`);
    } else {
      console.log('  No validation state found');
    }
    
    // Check test results
    const testResults = await sql`
      SELECT testcode, testname, resultvalue, resultnumeric, unit
      FROM test_results
      WHERE sampleid = ${sampleId}
      ORDER BY createdat
    `;
    
    console.log(`\nTest Results: ${testResults.length} found`);
    testResults.forEach(r => {
      console.log(`  ${r.testcode}: ${r.resultvalue} ${r.unit || ''}`);
    });
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkExistingResults();
