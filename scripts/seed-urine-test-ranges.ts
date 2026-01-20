import 'dotenv/config';
import { db } from '../lib/db/index';
import { testReferenceRanges, users } from '../lib/db/schema';
import { eq, and } from 'drizzle-orm';

async function seedUrineTestRanges() {
  console.log('Starting to seed urine test reference ranges...\n');
  
  const workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
  
  const [user] = await db.select().from(users).limit(1);
  
  if (!user) {
    throw new Error('No users found in database');
  }
  
  const referenceRanges = [
    {
      testcode: 'U-PROT',
      testname: 'Urine Protein',
      category: 'Biochemistry',
      unit: 'mg/dL',
      referencemin: 0,
      referencemax: 8,
      sex: 'ANY',
      agegroup: 'ADULT',
      notes: 'Normal: <10 mg/dL or Negative'
    },
    {
      testcode: 'U-GLU',
      testname: 'Urine Glucose',
      category: 'Biochemistry',
      unit: 'mg/dL',
      referencemin: 0,
      referencemax: 15,
      sex: 'ANY',
      agegroup: 'ADULT',
      notes: 'Normal: Negative'
    },
    {
      testcode: 'U-BLOOD',
      testname: 'Urine Blood',
      category: 'Biochemistry',
      unit: 'N/A',
      referencetext: 'Negative',
      sex: 'ANY',
      agegroup: 'ADULT'
    },
    {
      testcode: 'U-KET',
      testname: 'Urine Ketones',
      category: 'Biochemistry',
      unit: 'N/A',
      referencetext: 'Negative',
      sex: 'ANY',
      agegroup: 'ADULT'
    },
    {
      testcode: 'U-BILI',
      testname: 'Urine Bilirubin',
      category: 'Biochemistry',
      unit: 'N/A',
      referencetext: 'Negative',
      sex: 'ANY',
      agegroup: 'ADULT'
    },
    {
      testcode: 'U-NIT-LE',
      testname: 'Urine Nitrite & Leukocyte Esterase',
      category: 'Biochemistry',
      unit: 'N/A',
      referencetext: 'Negative',
      sex: 'ANY',
      agegroup: 'ADULT'
    },
  ];
  
  let added = 0;
  let skipped = 0;
  
  for (const range of referenceRanges) {
    try {
      const existing = await db
        .select()
        .from(testReferenceRanges)
        .where(
          and(
            eq(testReferenceRanges.testcode, range.testcode),
            eq(testReferenceRanges.workspaceid, workspaceid),
            eq(testReferenceRanges.sex, range.sex),
            eq(testReferenceRanges.agegroup, range.agegroup)
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        skipped++;
        console.log(`✓ ${range.testname} already exists`);
        continue;
      }
      
      await db.insert(testReferenceRanges).values({
        workspaceid: workspaceid,
        testcode: range.testcode,
        testname: range.testname,
        category: range.category,
        unit: range.unit,
        agegroup: range.agegroup,
        sex: range.sex,
        referencemin: range.referencemin?.toString() || null,
        referencemax: range.referencemax?.toString() || null,
        referencetext: range.referencetext || null,
        notes: range.notes || null,
        isactive: 'Y',
        createdby: user.userid,
      });
      
      added++;
      console.log(`✓ Added: ${range.testcode} - ${range.testname}`);
    } catch (error) {
      console.error(`✗ Error adding ${range.testcode}:`, error);
    }
  }
  
  console.log(`\n✅ Urine test reference ranges seeding completed!`);
  console.log(`   Added: ${added}`);
  console.log(`   Skipped: ${skipped}`);
}

seedUrineTestRanges()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
