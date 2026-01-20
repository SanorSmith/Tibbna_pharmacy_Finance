/**
 * Run Pathology Reference Ranges Seed
 * Execute with: node scripts/run-pathology-seed.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function seedPathologyReferenceRanges() {
  const client = await pool.connect();
  
  try {
    console.log('Starting to seed pathology reference ranges...');
    
    const workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
    
    // Get a user ID
    const userResult = await client.query('SELECT userid FROM users LIMIT 1');
    const userid = userResult.rows[0]?.userid;
    
    if (!userid) {
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
      // Check if already exists
      const checkResult = await client.query(
        'SELECT rangeid FROM test_reference_ranges WHERE testcode = $1 AND workspaceid = $2',
        [range.testcode, workspaceid]
      );
      
      if (checkResult.rows.length > 0) {
        console.log(`✓ Reference range for ${range.testname} already exists`);
        continue;
      }
      
      // Insert new reference range
      await client.query(
        `INSERT INTO test_reference_ranges (
          workspaceid, testcode, testname, category, unit, 
          agegroup, sex, referencetext, notes, isactive, createdby, createdat
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          workspaceid,
          range.testcode,
          range.testname,
          range.category,
          range.unit,
          'ALL',
          'ANY',
          range.referencetext,
          range.notes,
          'Y',
          userid
        ]
      );
      
      console.log(`✓ Added reference range for ${range.testname}`);
    }
    
    console.log('\n✅ Pathology reference ranges seeding completed!');
    
    // Verify
    const verifyResult = await client.query(
      `SELECT testcode, testname, unit, referencetext 
       FROM test_reference_ranges 
       WHERE testcode IN ('BIOPSY', 'PAP_SMEAR', 'FNAC')`
    );
    
    console.log('\nVerification:');
    verifyResult.rows.forEach(row => {
      console.log(`  - ${row.testname}: ${row.unit} | ${row.referencetext}`);
    });
    
  } catch (error) {
    console.error('Error seeding pathology reference ranges:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
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
