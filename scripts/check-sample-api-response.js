require('dotenv').config();
const postgres = require('postgres');

async function checkSampleAPIResponse() {
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
  
  try {
    console.log('=== Checking Sample API Response Fields ===\n');
    
    // Get the CBC sample with all fields
    const samples = await sql`
      SELECT 
        s.*,
        p.gender as patient_gender,
        p.dateofbirth as patient_dob,
        EXTRACT(YEAR FROM AGE(p.dateofbirth)) as patient_age
      FROM accession_samples s
      LEFT JOIN patients p ON s.patientid::uuid = p.patientid
      WHERE s.tests::text ILIKE '%CBC%'
      ORDER BY s.createdat DESC
      LIMIT 1
    `;
    
    if (samples.length > 0) {
      const sample = samples[0];
      console.log('Sample fields:');
      console.log(`  samplenumber: ${sample.samplenumber}`);
      console.log(`  patientid: ${sample.patientid}`);
      console.log(`  patientsex: ${sample.patientsex || 'NULL'}`);
      console.log(`  patientage: ${sample.patientage || 'NULL'}`);
      console.log(`  patient_gender (from join): ${sample.patient_gender || 'NULL'}`);
      console.log(`  patient_age (from join): ${sample.patient_age || 'NULL'}`);
      console.log(`  patient_dob (from join): ${sample.patient_dob || 'NULL'}`);
    }
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkSampleAPIResponse();
