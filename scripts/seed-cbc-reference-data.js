require('dotenv').config();
const postgres = require('postgres');

async function seedCBCReferenceData() {
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
  
  try {
    const workspaceId = 'fa9fb036-a7eb-49af-890c-54406dad139d';
    const createdBy = '5037145a-971e-4348-8e44-f7a7ca96a35f';
    
    console.log('=== Seeding CBC Reference Data ===\n');
    
    const cbcReferenceData = [
      // RBC - Red Blood Cells
      {
        testcode: 'RBC',
        testname: 'Red Blood Cells',
        category: 'Hematology',
        unit: 'x10⁶/µL',
        agegroup: 'ADULT',
        sex: 'M',
        referencemin: 4.5,
        referencemax: 5.9,
        paniclow: 2.5,
        panichigh: 7.0
      },
      {
        testcode: 'RBC',
        testname: 'Red Blood Cells',
        category: 'Hematology',
        unit: 'x10⁶/µL',
        agegroup: 'ADULT',
        sex: 'F',
        referencemin: 4.0,
        referencemax: 5.2,
        paniclow: 2.5,
        panichigh: 7.0
      },
      
      // HCT - Hematocrit
      {
        testcode: 'HCT',
        testname: 'Hematocrit',
        category: 'Hematology',
        unit: '%',
        agegroup: 'ADULT',
        sex: 'M',
        referencemin: 40,
        referencemax: 54,
        paniclow: 20,
        panichigh: 60
      },
      {
        testcode: 'HCT',
        testname: 'Hematocrit',
        category: 'Hematology',
        unit: '%',
        agegroup: 'ADULT',
        sex: 'F',
        referencemin: 36,
        referencemax: 46,
        paniclow: 20,
        panichigh: 60
      },
      
      // MCV - Mean Corpuscular Volume
      {
        testcode: 'MCV',
        testname: 'Mean Corpuscular Volume',
        category: 'Hematology',
        unit: 'fL',
        agegroup: 'ALL',
        sex: 'ANY',
        referencemin: 80,
        referencemax: 100,
        paniclow: 50,
        panichigh: 120
      },
      
      // MCH - Mean Corpuscular Hemoglobin
      {
        testcode: 'MCH',
        testname: 'Mean Corpuscular Hemoglobin',
        category: 'Hematology',
        unit: 'pg',
        agegroup: 'ALL',
        sex: 'ANY',
        referencemin: 27,
        referencemax: 33,
        paniclow: 20,
        panichigh: 40
      },
      
      // MCHC - Mean Corpuscular Hemoglobin Concentration
      {
        testcode: 'MCHC',
        testname: 'Mean Corpuscular Hemoglobin Concentration',
        category: 'Hematology',
        unit: 'g/dL',
        agegroup: 'ALL',
        sex: 'ANY',
        referencemin: 32,
        referencemax: 36,
        paniclow: 28,
        panichigh: 38
      },
      
      // RDW - Red Cell Distribution Width
      {
        testcode: 'RDW',
        testname: 'Red Cell Distribution Width',
        category: 'Hematology',
        unit: '%',
        agegroup: 'ALL',
        sex: 'ANY',
        referencemin: 11.5,
        referencemax: 14.5,
        paniclow: null,
        panichigh: null
      }
    ];
    
    for (const data of cbcReferenceData) {
      const result = await sql`
        INSERT INTO test_reference_ranges (
          rangeid, workspaceid, testcode, testname, category, unit,
          agegroup, sex, referencemin, referencemax, paniclow, panichigh,
          isactive, createdby, createdat
        ) VALUES (
          gen_random_uuid(),
          ${workspaceId},
          ${data.testcode},
          ${data.testname},
          ${data.category},
          ${data.unit},
          ${data.agegroup},
          ${data.sex},
          ${data.referencemin},
          ${data.referencemax},
          ${data.paniclow},
          ${data.panichigh},
          'Y',
          ${createdBy},
          NOW()
        )
        ON CONFLICT DO NOTHING
      `;
      
      console.log(`✓ Added ${data.testcode} (${data.agegroup}/${data.sex})`);
    }
    
    console.log('\n✅ CBC reference data seeded successfully');
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
    process.exit(1);
  }
}

seedCBCReferenceData();
