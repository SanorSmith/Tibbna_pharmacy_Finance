import 'dotenv/config';
import { db } from '../lib/db/index';
import { testReferenceRanges, users } from '../lib/db/schema';
import { eq, and } from 'drizzle-orm';

async function seedAllLabTestRanges() {
  console.log('Starting to seed comprehensive lab test reference ranges...\n');
  
  const workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
  
  const [user] = await db.select().from(users).limit(1);
  
  if (!user) {
    throw new Error('No users found in database');
  }
  
  const referenceRanges = [
    // Hematology - Iron Studies
    { testcode: 'FERR', testname: 'Ferritin', category: 'Hematology', unit: 'ng/mL', referencemin: 30, referencemax: 400, sex: 'M', agegroup: 'ADULT' },
    { testcode: 'FERR', testname: 'Ferritin', category: 'Hematology', unit: 'ng/mL', referencemin: 15, referencemax: 150, sex: 'F', agegroup: 'ADULT' },
    { testcode: 'IRON', testname: 'Iron', category: 'Hematology', unit: 'µg/dL', referencemin: 60, referencemax: 170, sex: 'M', agegroup: 'ADULT' },
    { testcode: 'IRON', testname: 'Iron', category: 'Hematology', unit: 'µg/dL', referencemin: 50, referencemax: 150, sex: 'F', agegroup: 'ADULT' },
    
    // Hematology - Vitamins
    { testcode: 'FOLATE', testname: 'Folate', category: 'Hematology', unit: 'ng/mL', referencemin: 2.7, referencemax: 17.0, sex: 'ANY', agegroup: 'ADULT' },
    { testcode: 'B12', testname: 'Vitamin B12', category: 'Hematology', unit: 'pg/mL', referencemin: 200, referencemax: 900, sex: 'ANY', agegroup: 'ADULT' },
    
    // Coagulation Tests
    { testcode: 'CT', testname: 'Clotting Time (CT)', category: 'Hematology', unit: 'minutes', referencemin: 4, referencemax: 9, sex: 'ANY', agegroup: 'ADULT' },
    { testcode: 'BT', testname: 'Bleeding Time (BT)', category: 'Hematology', unit: 'minutes', referencemin: 2, referencemax: 7, sex: 'ANY', agegroup: 'ADULT' },
    { testcode: 'APTT', testname: 'APTT', category: 'Hematology', unit: 'seconds', referencemin: 25, referencemax: 35, sex: 'ANY', agegroup: 'ADULT' },
    { testcode: 'PT-INR', testname: 'PT & INR', category: 'Biochemistry', unit: 'INR', referencemin: 0.8, referencemax: 1.2, sex: 'ANY', agegroup: 'ADULT', notes: 'PT: 11-13.5 seconds' },
    
    // Biochemistry - Liver Function
    { testcode: 'ALT', testname: 'ALT (SGPT)', category: 'Biochemistry', unit: 'U/L', referencemin: 7, referencemax: 56, sex: 'ANY', agegroup: 'ADULT' },
    { testcode: 'AST', testname: 'AST (SGOT)', category: 'Biochemistry', unit: 'U/L', referencemin: 10, referencemax: 40, sex: 'ANY', agegroup: 'ADULT' },
    { testcode: 'ALP', testname: 'Alkaline Phosphatase (ALP)', category: 'Biochemistry', unit: 'U/L', referencemin: 44, referencemax: 147, sex: 'ANY', agegroup: 'ADULT' },
    { testcode: 'GGT', testname: 'GGT', category: 'Biochemistry', unit: 'U/L', referencemin: 8, referencemax: 61, sex: 'M', agegroup: 'ADULT' },
    { testcode: 'GGT', testname: 'GGT', category: 'Biochemistry', unit: 'U/L', referencemin: 5, referencemax: 36, sex: 'F', agegroup: 'ADULT' },
    { testcode: 'BILI', testname: 'Bilirubin (Total & Direct)', category: 'Biochemistry', unit: 'mg/dL', referencemin: 0.1, referencemax: 1.2, sex: 'ANY', agegroup: 'ADULT', notes: 'Total bilirubin' },
    { testcode: 'ALB', testname: 'Albumin', category: 'Biochemistry', unit: 'g/dL', referencemin: 3.5, referencemax: 5.5, sex: 'ANY', agegroup: 'ADULT' },
    
    // Biochemistry - Kidney Function
    { testcode: 'CREAT', testname: 'Creatinine', category: 'Biochemistry', unit: 'mg/dL', referencemin: 0.7, referencemax: 1.3, sex: 'M', agegroup: 'ADULT' },
    { testcode: 'CREAT', testname: 'Creatinine', category: 'Biochemistry', unit: 'mg/dL', referencemin: 0.6, referencemax: 1.1, sex: 'F', agegroup: 'ADULT' },
    { testcode: 'UREA', testname: 'Urea/BUN', category: 'Biochemistry', unit: 'mg/dL', referencemin: 7, referencemax: 20, sex: 'ANY', agegroup: 'ADULT' },
    { testcode: 'URIC', testname: 'Uric Acid', category: 'Biochemistry', unit: 'mg/dL', referencemin: 3.5, referencemax: 7.2, sex: 'M', agegroup: 'ADULT' },
    { testcode: 'URIC', testname: 'Uric Acid', category: 'Biochemistry', unit: 'mg/dL', referencemin: 2.6, referencemax: 6.0, sex: 'F', agegroup: 'ADULT' },
    
    // Biochemistry - Lipid Profile
    { testcode: 'CHOL', testname: 'Total Cholesterol', category: 'Biochemistry', unit: 'mg/dL', referencemin: 0, referencemax: 200, sex: 'ANY', agegroup: 'ADULT', notes: 'Desirable: <200' },
    { testcode: 'TRIG', testname: 'Triglycerides', category: 'Biochemistry', unit: 'mg/dL', referencemin: 0, referencemax: 150, sex: 'ANY', agegroup: 'ADULT', notes: 'Normal: <150' },
    { testcode: 'HDL', testname: 'HDL Cholesterol', category: 'Biochemistry', unit: 'mg/dL', referencemin: 40, referencemax: 60, sex: 'M', agegroup: 'ADULT' },
    { testcode: 'HDL', testname: 'HDL Cholesterol', category: 'Biochemistry', unit: 'mg/dL', referencemin: 50, referencemax: 60, sex: 'F', agegroup: 'ADULT' },
    { testcode: 'LDL', testname: 'LDL Cholesterol', category: 'Biochemistry', unit: 'mg/dL', referencemin: 0, referencemax: 100, sex: 'ANY', agegroup: 'ADULT', notes: 'Optimal: <100' },
    
    // Biochemistry - Glucose
    { testcode: 'GLU', testname: 'Glucose (Fasting/Random)', category: 'Biochemistry', unit: 'mg/dL', referencemin: 70, referencemax: 100, sex: 'ANY', agegroup: 'ADULT', notes: 'Fasting' },
    { testcode: 'HBA1C', testname: 'HbA1c', category: 'Biochemistry', unit: '%', referencemin: 4.0, referencemax: 5.6, sex: 'ANY', agegroup: 'ADULT', notes: 'Normal: <5.7%' },
    { testcode: 'FPG', testname: 'Fasting Plasma Glucose', category: 'Biochemistry', unit: 'mg/dL', referencemin: 70, referencemax: 100, sex: 'ANY', agegroup: 'ADULT' },
    
    // Biochemistry - Electrolytes
    { testcode: 'NA', testname: 'Sodium (Na+)', category: 'Biochemistry', unit: 'mEq/L', referencemin: 136, referencemax: 145, sex: 'ANY', agegroup: 'ADULT' },
    { testcode: 'K', testname: 'Potassium (K+)', category: 'Biochemistry', unit: 'mEq/L', referencemin: 3.5, referencemax: 5.1, sex: 'ANY', agegroup: 'ADULT' },
    { testcode: 'CA', testname: 'Calcium (Ca2+)', category: 'Biochemistry', unit: 'mg/dL', referencemin: 8.5, referencemax: 10.5, sex: 'ANY', agegroup: 'ADULT' },
    { testcode: 'CL', testname: 'Chloride (Cl-)', category: 'Biochemistry', unit: 'mEq/L', referencemin: 98, referencemax: 107, sex: 'ANY', agegroup: 'ADULT' },
    
    // Hematology - Other
    { testcode: 'ESR', testname: 'ESR', category: 'Hematology', unit: 'mm/hr', referencemin: 0, referencemax: 15, sex: 'M', agegroup: 'ADULT' },
    { testcode: 'ESR', testname: 'ESR', category: 'Hematology', unit: 'mm/hr', referencemin: 0, referencemax: 20, sex: 'F', agegroup: 'ADULT' },
    { testcode: 'RETIC', testname: 'Reticulocyte Count', category: 'Hematology', unit: '%', referencemin: 0.5, referencemax: 2.5, sex: 'ANY', agegroup: 'ADULT' },
    
    // Immunology
    { testcode: 'CRP', testname: 'C-Reactive Protein (CRP)', category: 'Immunology', unit: 'mg/L', referencemin: 0, referencemax: 10, sex: 'ANY', agegroup: 'ADULT', notes: 'Normal: <10' },
    { testcode: 'RF', testname: 'Rheumatoid Factor (RF)', category: 'Immunology', unit: 'IU/mL', referencemin: 0, referencemax: 20, sex: 'ANY', agegroup: 'ADULT', notes: 'Negative: <20' },
    
    // Qualitative/Descriptive Tests
    { testcode: 'CBC', testname: 'Complete Blood Count', category: 'Hematology', unit: 'N/A', referencetext: 'See individual parameters', sex: 'ANY', agegroup: 'ADULT' },
    { testcode: 'UA', testname: 'Urinalysis', category: 'Urinalysis', unit: 'N/A', referencetext: 'Normal urinalysis', sex: 'ANY', agegroup: 'ADULT' },
    { testcode: 'MALARIA', testname: 'Malaria Parasite Detection', category: 'Hematology', unit: 'N/A', referencetext: 'Negative', sex: 'ANY', agegroup: 'ADULT' },
    { testcode: 'HBSAG', testname: 'HBsAg', category: 'Immunology', unit: 'N/A', referencetext: 'Non-reactive', sex: 'ANY', agegroup: 'ADULT' },
    { testcode: 'HIV', testname: 'HIV Antibody', category: 'Immunology', unit: 'N/A', referencetext: 'Non-reactive', sex: 'ANY', agegroup: 'ADULT' },
    { testcode: 'ANTI-HCV', testname: 'Anti-HCV', category: 'Immunology', unit: 'N/A', referencetext: 'Non-reactive', sex: 'ANY', agegroup: 'ADULT' },
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
      console.log(`✓ Added: ${range.testcode} - ${range.testname} (${range.sex}/${range.agegroup})`);
    } catch (error) {
      console.error(`✗ Error adding ${range.testcode}:`, error);
    }
  }
  
  console.log(`\n✅ Reference ranges seeding completed!`);
  console.log(`   Added: ${added}`);
  console.log(`   Skipped: ${skipped}`);
}

seedAllLabTestRanges()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
