import 'dotenv/config';
import { db } from '../lib/db/index';
import { testReferenceRanges, labTestCatalog } from '../lib/db/schema';
import { eq, notInArray, sql } from 'drizzle-orm';

async function checkMissingRanges() {
  const workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
  
  console.log('Checking for tests without reference ranges...\n');
  
  // Get all test codes from catalog
  const allTests = await db
    .select({
      testcode: labTestCatalog.testcode,
      testname: labTestCatalog.testname,
      testcategory: labTestCatalog.testcategory,
    })
    .from(labTestCatalog)
    .where(eq(labTestCatalog.workspaceid, workspaceid));
  
  console.log(`Total tests in catalog: ${allTests.length}\n`);
  
  // Get all test codes that have reference ranges
  const testsWithRanges = await db
    .select({
      testcode: testReferenceRanges.testcode,
    })
    .from(testReferenceRanges)
    .where(eq(testReferenceRanges.workspaceid, workspaceid));
  
  const codesWithRanges = new Set(testsWithRanges.map(t => t.testcode));
  
  console.log(`Tests with reference ranges: ${codesWithRanges.size}\n`);
  
  // Find tests without ranges
  const testsWithoutRanges = allTests.filter(test => !codesWithRanges.has(test.testcode));
  
  console.log(`Tests WITHOUT reference ranges: ${testsWithoutRanges.length}\n`);
  
  if (testsWithoutRanges.length > 0) {
    console.log('Missing reference ranges for:');
    testsWithoutRanges.forEach(test => {
      console.log(`  - ${test.testcode}: ${test.testname} (${test.testcategory})`);
    });
  }
}

checkMissingRanges()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
