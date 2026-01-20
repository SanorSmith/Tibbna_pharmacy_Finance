import 'dotenv/config';
import { db } from '../lib/db/index';
import { testReferenceRanges, labTestCatalog } from '../lib/db/schema';
import { eq, ilike, or } from 'drizzle-orm';

async function checkTestCodes() {
  const workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
  
  console.log('Checking for Bacteremia and Fungemia tests...\n');
  
  // Check in test catalog
  console.log('=== Lab Test Catalog ===');
  const catalogTests = await db
    .select()
    .from(labTestCatalog)
    .where(
      or(
        ilike(labTestCatalog.testname, '%bacteremia%'),
        ilike(labTestCatalog.testname, '%fungemia%'),
        ilike(labTestCatalog.testcode, '%bacteremia%'),
        ilike(labTestCatalog.testcode, '%fungemia%')
      )
    );
  
  if (catalogTests.length > 0) {
    catalogTests.forEach(test => {
      console.log(`  Code: ${test.testcode} | Name: ${test.testname} | Category: ${test.testcategory}`);
    });
  } else {
    console.log('  No matching tests found in catalog');
  }
  
  // Check in reference ranges
  console.log('\n=== Test Reference Ranges ===');
  const refRanges = await db
    .select()
    .from(testReferenceRanges)
    .where(
      or(
        ilike(testReferenceRanges.testname, '%bacteremia%'),
        ilike(testReferenceRanges.testname, '%fungemia%'),
        ilike(testReferenceRanges.testcode, '%bacteremia%'),
        ilike(testReferenceRanges.testcode, '%fungemia%')
      )
    );
  
  if (refRanges.length > 0) {
    refRanges.forEach(range => {
      console.log(`  Code: ${range.testcode} | Name: ${range.testname} | Unit: ${range.unit} | Ref: ${range.referencetext || `${range.referencemin}-${range.referencemax}`}`);
    });
  } else {
    console.log('  No matching reference ranges found');
  }
  
  // Show sample of all reference ranges
  console.log('\n=== Sample of All Reference Ranges (first 20) ===');
  const allRanges = await db
    .select({
      testcode: testReferenceRanges.testcode,
      testname: testReferenceRanges.testname,
      unit: testReferenceRanges.unit,
    })
    .from(testReferenceRanges)
    .where(eq(testReferenceRanges.workspaceid, workspaceid))
    .limit(20);
  
  allRanges.forEach(range => {
    console.log(`  ${range.testcode} - ${range.testname} (${range.unit})`);
  });
  
  console.log(`\nTotal reference ranges in workspace: ${allRanges.length}`);
}

checkTestCodes()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
