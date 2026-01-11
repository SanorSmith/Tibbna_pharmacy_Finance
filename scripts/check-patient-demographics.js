require('dotenv').config();
const postgres = require('postgres');

async function checkPatientDemographics() {
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
  
  try {
    console.log('=== Checking Patient Demographics for Recent Samples ===\n');
    
    // Get recent samples with patient info
    const samples = await sql`
      SELECT 
        s.samplenumber,
        s.sampleid,
        s.patientid,
        p.firstname,
        p.lastname,
        p.dateofbirth,
        p.gender,
        EXTRACT(YEAR FROM AGE(p.dateofbirth)) as age
      FROM accession_samples s
      LEFT JOIN patients p ON s.patientid::uuid = p.patientid
      WHERE s.tests::text ILIKE '%CBC%'
      ORDER BY s.createdat DESC
      LIMIT 3
    `;
    
    samples.forEach(s => {
      console.log(`Sample: ${s.samplenumber}`);
      console.log(`  Patient: ${s.firstname} ${s.lastname}`);
      console.log(`  Gender: ${s.gender || 'NOT SET'}`);
      console.log(`  Age: ${s.age || 'NOT SET'} years`);
      console.log(`  DOB: ${s.dateofbirth || 'NOT SET'}`);
      console.log('');
    });
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkPatientDemographics();
