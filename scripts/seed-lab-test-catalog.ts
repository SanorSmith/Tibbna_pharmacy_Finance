/**
 * Seed Lab Test Catalog
 * Adds common lab tests to the catalog for LIMS order creation
 */

import { db } from "@/lib/db";
import { labTestCatalog } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";

const commonTests = [
  {
    workspaceid: WORKSPACE_ID,
    testcode: "CBC",
    testname: "Complete Blood Count",
    testcategory: "Hematology",
    specimentype: "Blood",
    description: "Measures different components of blood including RBCs, WBCs, hemoglobin, hematocrit, and platelets",
    turnaroundtime: "24 hours",
    isactive: true,
  },
  {
    workspaceid: WORKSPACE_ID,
    testcode: "CMP",
    testname: "Comprehensive Metabolic Panel",
    testcategory: "Chemistry",
    specimentype: "Blood",
    description: "Measures glucose, electrolytes, kidney function (BUN, creatinine), and liver function (ALT, AST, bilirubin)",
    turnaroundtime: "24 hours",
    isactive: true,
  },
  {
    workspaceid: WORKSPACE_ID,
    testcode: "GLU",
    testname: "Glucose",
    testcategory: "Chemistry",
    specimentype: "Blood",
    description: "Measures blood sugar level",
    turnaroundtime: "2 hours",
    isactive: true,
  },
  {
    workspaceid: WORKSPACE_ID,
    testcode: "CHOL",
    testname: "Cholesterol",
    testcategory: "Chemistry",
    specimentype: "Blood",
    description: "Measures total cholesterol levels",
    turnaroundtime: "24 hours",
    isactive: true,
  },
  {
    workspaceid: WORKSPACE_ID,
    testcode: "TRIG",
    testname: "Triglycerides",
    testcategory: "Chemistry",
    specimentype: "Blood",
    description: "Measures triglyceride levels",
    turnaroundtime: "24 hours",
    isactive: true,
  },
  {
    workspaceid: WORKSPACE_ID,
    testcode: "UA",
    testname: "Urinalysis",
    testcategory: "Urinalysis",
    specimentype: "Urine",
    description: "Analyzes urine composition including pH, protein, glucose, ketones, blood, and microscopy",
    turnaroundtime: "4 hours",
    isactive: true,
  },
];

async function seedLabTestCatalog() {
  console.log("🔬 Seeding lab test catalog...\n");
  
  try {
    for (const test of commonTests) {
      // Check if test already exists
      const existing = await db
        .select()
        .from(labTestCatalog)
        .where(
          and(
            eq(labTestCatalog.testcode, test.testcode),
            eq(labTestCatalog.workspaceid, test.workspaceid)
          )
        )
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(labTestCatalog).values(test);
        console.log(`✓ Added: ${test.testcode} - ${test.testname}`);
      } else {
        console.log(`- Already exists: ${test.testcode} - ${test.testname}`);
      }
    }
    
    console.log("\n✅ Lab test catalog seeded successfully!");
    console.log(`📊 Total tests: ${commonTests.length}`);
    
  } catch (error) {
    console.error("❌ Error seeding lab test catalog:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

seedLabTestCatalog();
