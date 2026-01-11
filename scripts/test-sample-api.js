require('dotenv').config();

async function testSampleAPI() {
  try {
    const sampleId = '1b52dad8-2efc-4da6-a004-073fff133810'; // SMP-2026-0005
    const workspaceId = 'fa9fb036-a7eb-49af-890c-54406dad139d';
    
    // Find the latest CBC sample
    const postgres = require('postgres');
    const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
    
    const samples = await sql`
      SELECT sampleid, samplenumber
      FROM accession_samples
      WHERE tests::text ILIKE '%CBC%'
      ORDER BY createdat DESC
      LIMIT 1
    `;
    
    if (samples.length > 0) {
      const latestSampleId = samples[0].sampleid;
      console.log(`Testing API for sample: ${samples[0].samplenumber} (${latestSampleId})\n`);
      
      // Simulate what the API would return
      const result = await sql`
        SELECT 
          s.sampleid,
          s.samplenumber,
          s.sampletype,
          s.tests,
          CONCAT(p.firstname, ' ', p.lastname) as patientname,
          EXTRACT(YEAR FROM AGE(p.dateofbirth)) as patientage,
          p.gender as patientsex,
          p.dateofbirth
        FROM accession_samples s
        LEFT JOIN patients p ON s.patientid::uuid = p.patientid
        WHERE s.sampleid = ${latestSampleId}
      `;
      
      if (result.length > 0) {
        const sample = result[0];
        console.log('API Response Simulation:');
        console.log(`  Sample: ${sample.samplenumber}`);
        console.log(`  Patient: ${sample.patientname}`);
        console.log(`  Patient Age: ${sample.patientage}`);
        console.log(`  Patient Sex (raw): "${sample.patientsex}"`);
        console.log(`  Tests: ${sample.tests}`);
        
        // Simulate the conversion logic
        const genderUpper = sample.patientsex?.toUpperCase() || '';
        const sex = genderUpper === 'MALE' || genderUpper === 'M' ? 'M' : 
                    genderUpper === 'FEMALE' || genderUpper === 'F' ? 'F' : 'ANY';
        
        console.log(`\nConverted Sex for API query: "${sex}"`);
        console.log(`Age Group: ADULT (age ${sample.patientage})`);
        
        // Test reference data query
        console.log('\nTesting reference data queries:');
        const testCodes = ['HGB', 'RBC', 'WBC', 'HCT'];
        
        for (const testCode of testCodes) {
          const refData = await sql`
            SELECT testcode, testname, unit, referencemin, referencemax, agegroup, sex
            FROM test_reference_ranges
            WHERE workspaceid = ${workspaceId}
              AND UPPER(testcode) = UPPER(${testCode})
              AND agegroup = 'ADULT'
              AND sex = ${sex}
              AND isactive = 'Y'
            LIMIT 1
          `;
          
          if (refData.length > 0) {
            console.log(`  ✓ ${testCode}: ${refData[0].unit}, ${refData[0].referencemin}-${refData[0].referencemax}`);
          } else {
            console.log(`  ✗ ${testCode}: No data found for ADULT/${sex}`);
          }
        }
      }
    }
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testSampleAPI();
