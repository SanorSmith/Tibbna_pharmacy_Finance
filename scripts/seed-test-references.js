require('dotenv').config();
const postgres = require('postgres');

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const CREATED_BY = "5037145a-971e-4348-8e44-f7a7ca96a35f";

const testReferenceData = [
  {
    testcode: "Stool Tests",
    testname: "Stool Tests",
    category: "Microbiology",
    unit: "Descriptive",
    agegroup: "ALL",
    sex: "ANY",
    referencetext: "Normal stool characteristics",
  },
  {
    testcode: "HGB",
    testname: "Hemoglobin",
    category: "Hematology",
    unit: "g/dL",
    agegroup: "ADULT",
    sex: "M",
    referencemin: "13.0",
    referencemax: "17.0",
    paniclow: "7.0",
    panichigh: "20.0",
  },
  {
    testcode: "HGB",
    testname: "Hemoglobin",
    category: "Hematology",
    unit: "g/dL",
    agegroup: "ADULT",
    sex: "F",
    referencemin: "11.5",
    referencemax: "15.5",
    paniclow: "7.0",
    panichigh: "20.0",
  },
  {
    testcode: "WBC",
    testname: "White Blood Cells",
    category: "Hematology",
    unit: "x10³/µL",
    agegroup: "ADULT",
    sex: "ANY",
    referencemin: "4.0",
    referencemax: "11.0",
    paniclow: "2.0",
    panichigh: "30.0",
  },
  {
    testcode: "PLT",
    testname: "Platelets",
    category: "Hematology",
    unit: "x10³/µL",
    agegroup: "ALL",
    sex: "ANY",
    referencemin: "150",
    referencemax: "450",
    paniclow: "20",
    panichigh: "1000",
  },
];

async function seedTestReferences() {
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
  
  try {
    console.log('Seeding test reference data...');
    
    for (const data of testReferenceData) {
      await sql`
        INSERT INTO test_reference_ranges (
          workspaceid, testcode, testname, category, unit, 
          agegroup, sex, referencemin, referencemax, referencetext,
          paniclow, panichigh, isactive, createdby
        ) VALUES (
          ${WORKSPACE_ID}, ${data.testcode}, ${data.testname}, 
          ${data.category}, ${data.unit}, ${data.agegroup}, ${data.sex},
          ${data.referencemin || null}, ${data.referencemax || null}, 
          ${data.referencetext || null}, ${data.paniclow || null}, 
          ${data.panichigh || null}, 'Y', ${CREATED_BY}
        )
      `;
      console.log(`✅ Seeded: ${data.testcode} - ${data.testname}`);
    }
    
    console.log(`\n✅ Successfully seeded ${testReferenceData.length} test reference ranges`);
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await sql.end();
    process.exit(1);
  }
}

seedTestReferences();
