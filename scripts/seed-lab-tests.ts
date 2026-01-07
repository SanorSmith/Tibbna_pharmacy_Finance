/**
 * Seed Lab Test Catalog
 * Run with: npx tsx scripts/seed-lab-tests.ts
 */

import { db } from "../lib/db";
import { labTestCatalog } from "../lib/db/schema";
import { eq } from "drizzle-orm";

const commonTests = [
  {
    workspaceid: "default-workspace",
    testcode: "CBC",
    testname: "Complete Blood Count",
    testcategory: "Hematology",
    description: "Measures different components of blood",
    specimentype: "Blood",
    turnaroundtime: "24 hours",
    isactive: true,
  },
  {
    workspaceid: "default-workspace",
    testcode: "CMP",
    testname: "Comprehensive Metabolic Panel",
    testcategory: "Chemistry",
    description: "Measures chemical levels in blood",
    specimentype: "Blood",
    turnaroundtime: "24 hours",
    isactive: true,
  },
  {
    workspaceid: "default-workspace",
    testcode: "GLU",
    testname: "Glucose",
    testcategory: "Chemistry",
    description: "Measures blood sugar level",
    specimentype: "Blood",
    turnaroundtime: "2 hours",
    isactive: true,
  },
  {
    workspaceid: "default-workspace",
    testcode: "CHOL",
    testname: "Cholesterol",
    testcategory: "Chemistry",
    description: "Measures cholesterol levels",
    specimentype: "Blood",
    turnaroundtime: "24 hours",
    isactive: true,
  },
  {
    workspaceid: "default-workspace",
    testcode: "TRIG",
    testname: "Triglycerides",
    testcategory: "Chemistry",
    description: "Measures triglyceride levels",
    specimentype: "Blood",
    turnaroundtime: "24 hours",
    isactive: true,
  },
  {
    workspaceid: "default-workspace",
    testcode: "UA",
    testname: "Urinalysis",
    testcategory: "Urinalysis",
    description: "Analyzes urine composition",
    specimentype: "Urine",
    turnaroundtime: "4 hours",
    isactive: true,
  },
];

async function seedLabTests() {
  console.log("Seeding lab test catalog...");
  
  try {
    for (const test of commonTests) {
      // Check if test already exists
      const existing = await db
        .select()
        .from(labTestCatalog)
        .where(eq(labTestCatalog.testcode, test.testcode))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(labTestCatalog).values(test);
        console.log(`✓ Added test: ${test.testcode} - ${test.testname}`);
      } else {
        console.log(`- Test already exists: ${test.testcode}`);
      }
    }
    
    console.log("\n✓ Lab test catalog seeded successfully!");
  } catch (error) {
    console.error("Error seeding lab tests:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

seedLabTests();
