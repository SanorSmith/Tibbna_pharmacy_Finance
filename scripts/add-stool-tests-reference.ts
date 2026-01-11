/**
 * Quick script to add "Stool Tests" reference data
 */

import "dotenv/config";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

async function addStoolTestsReference() {
  const sql = postgres(`${DATABASE_URL}?sslmode=require`);
  
  try {
    console.log("Adding Stool Tests reference data...");
    
    // Check if it already exists
    const existing = await sql`
      SELECT * FROM test_reference_ranges 
      WHERE testcode = 'Stool Tests' AND agegroup = 'ALL' AND sex = 'ANY'
    `;
    
    if (existing.length > 0) {
      console.log("Stool Tests reference already exists, updating...");
      await sql`
        UPDATE test_reference_ranges 
        SET 
          testname = 'Stool Tests',
          category = 'Microbiology',
          unit = 'Descriptive',
          referencetext = 'Normal stool characteristics',
          isactive = 'Y'
        WHERE testcode = 'Stool Tests' AND agegroup = 'ALL' AND sex = 'ANY'
      `;
    } else {
      console.log("Inserting new Stool Tests reference...");
      await sql`
        INSERT INTO test_reference_ranges (
          testcode, testname, category, unit, agegroup, sex, 
          referencemin, referencemax, referencetext, 
          paniclow, panichigh, workspaceid, isactive
        ) VALUES (
          'Stool Tests', 'Stool Tests', 'Microbiology', 'Descriptive', 'ALL', 'ANY',
          NULL, NULL, 'Normal stool characteristics',
          NULL, NULL, 'fa9fb036-a7eb-49af-890c-54406dad139d', 'Y'
        )
      `;
    }
    
    console.log("✓ Stool Tests reference data added successfully!");
    
  } catch (error) {
    console.error("Failed to add reference data:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

addStoolTestsReference();
