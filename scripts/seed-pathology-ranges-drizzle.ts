/**
 * Seed Pathology Reference Ranges using Drizzle ORM
 * Run with: npm run tsx scripts/seed-pathology-ranges-drizzle.ts
 */

import 'dotenv/config';
import { db } from '../lib/db/index';
import { testReferenceRanges, users } from '../lib/db/schema';
import { eq, and } from 'drizzle-orm';

async function seedPathologyReferenceRanges() {
  console.log('Starting to seed pathology reference ranges...\n');
  
  const workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
  
  // Get a user ID
  const [user] = await db.select().from(users).limit(1);
  
  if (!user) {
    throw new Error('No users found in database');
  }
  
  const referenceRanges = [
    {
      testcode: 'BIOPSY',
      testname: 'Biopsy Examination',
      category: 'Pathology',
      unit: 'N/A',
      referencetext: 'Normal tissue architecture with no evidence of malignancy',
      notes: 'Descriptive pathology report required'
    },
    {
      testcode: 'PAP_SMEAR',
      testname: 'Cervical Cancer Screening (Pap Smear)',
      category: 'Cytology',
      unit: 'N/A',
      referencetext: 'Negative for intraepithelial lesion or malignancy (NILM)',
      notes: 'Bethesda System classification'
    },
    {
      testcode: 'FNAC',
      testname: 'FNAC',
      category: 'Cytology',
      unit: 'N/A',
      referencetext: 'Benign cytology with no evidence of malignancy',
      notes: 'Fine Needle Aspiration Cytology - descriptive report'
    }
  ];
  
  for (const range of referenceRanges) {
    try {
      // Check if already exists
      const existing = await db
        .select()
        .from(testReferenceRanges)
        .where(
          and(
            eq(testReferenceRanges.testcode, range.testcode),
            eq(testReferenceRanges.workspaceid, workspaceid)
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        console.log(`✓ Reference range for ${range.testname} already exists`);
        continue;
      }
      
      // Insert new reference range
      await db.insert(testReferenceRanges).values({
        workspaceid: workspaceid,
        testcode: range.testcode,
        testname: range.testname,
        category: range.category,
        unit: range.unit,
        agegroup: 'ALL',
        sex: 'ANY',
        referencetext: range.referencetext,
        notes: range.notes,
        isactive: 'Y',
        createdby: user.userid,
      });
      
      console.log(`✓ Added reference range for ${range.testname}`);
    } catch (error) {
      console.error(`✗ Error adding reference range for ${range.testname}:`, error);
    }
  }
  
  console.log('\n✅ Pathology reference ranges seeding completed!\n');
  
  // Verify
  const verifyResult = await db
    .select({
      testcode: testReferenceRanges.testcode,
      testname: testReferenceRanges.testname,
      unit: testReferenceRanges.unit,
      referencetext: testReferenceRanges.referencetext,
    })
    .from(testReferenceRanges)
    .where(eq(testReferenceRanges.workspaceid, workspaceid));
  
  console.log('Verification - All reference ranges in workspace:');
  verifyResult.forEach(row => {
    console.log(`  - ${row.testname}: ${row.unit} | ${row.referencetext}`);
  });
}

seedPathologyReferenceRanges()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
