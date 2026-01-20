import 'dotenv/config';
import { db } from '../lib/db/index';
import { testReferenceRanges, users } from '../lib/db/schema';
import { eq, and } from 'drizzle-orm';

async function seedMicrobiologyReferenceRanges() {
  console.log('Starting to seed microbiology reference ranges...\n');
  
  const workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
  
  const [user] = await db.select().from(users).limit(1);
  
  if (!user) {
    throw new Error('No users found in database');
  }
  
  const referenceRanges = [
    {
      testcode: 'BACT',
      testname: 'Bacteremia',
      category: 'Microbiology',
      unit: 'N/A',
      referencetext: 'No growth / Negative',
      notes: 'Blood culture for bacterial infection'
    },
    {
      testcode: 'FUNG',
      testname: 'Fungemia',
      category: 'Microbiology',
      unit: 'N/A',
      referencetext: 'No growth / Negative',
      notes: 'Blood culture for fungal infection'
    }
  ];
  
  for (const range of referenceRanges) {
    try {
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
  
  console.log('\n✅ Microbiology reference ranges seeding completed!\n');
  
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
  console.log(`Total: ${verifyResult.length} reference ranges`);
  console.log('\nMicrobiology tests:');
  verifyResult
    .filter(r => r.testcode === 'BACT' || r.testcode === 'FUNG')
    .forEach(row => {
      console.log(`  - ${row.testname} (${row.testcode}): ${row.unit} | ${row.referencetext}`);
    });
}

seedMicrobiologyReferenceRanges()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
