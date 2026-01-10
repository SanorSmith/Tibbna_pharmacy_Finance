import { db, rawClient } from "../lib/db";
import { testReferenceRanges } from "../lib/db/schema";
import { eq, and } from "drizzle-orm";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const CREATED_BY = "5037145a-971e-4348-8e44-f7a7ca96a35f";

// CBC Component tests that are missing
const missingCBCTests = [
  {
    testcode: "MCV",
    testname: "Mean Corpuscular Volume",
    category: "Hematology",
    unit: "fL",
    agegroup: "ALL",
    sex: "ANY",
    referencemin: "80.0000",
    referencemax: "100.0000",
    referencetext: null,
    paniclow: "60.0000",
    panichigh: "120.0000",
    panictext: null,
    notes: "Mean volume of red blood cells",
  },
  {
    testcode: "MCH",
    testname: "Mean Corpuscular Hemoglobin",
    category: "Hematology",
    unit: "pg",
    agegroup: "ALL",
    sex: "ANY",
    referencemin: "27.0000",
    referencemax: "32.0000",
    referencetext: null,
    paniclow: "20.0000",
    panichigh: "40.0000",
    panictext: null,
    notes: "Average amount of hemoglobin per red blood cell",
  },
  {
    testcode: "MCHC",
    testname: "Mean Corpuscular Hemoglobin Concentration",
    category: "Hematology",
    unit: "g/dL",
    agegroup: "ALL",
    sex: "ANY",
    referencemin: "32.0000",
    referencemax: "36.0000",
    referencetext: null,
    paniclow: "28.0000",
    panichigh: "40.0000",
    panictext: null,
    notes: "Average concentration of hemoglobin in red blood cells",
  },
  {
    testcode: "RDW",
    testname: "Red Cell Distribution Width",
    category: "Hematology",
    unit: "%",
    agegroup: "ALL",
    sex: "ANY",
    referencemin: "11.5000",
    referencemax: "14.5000",
    referencetext: null,
    paniclow: null,
    panichigh: "20.0000",
    panictext: null,
    notes: "Variation in red blood cell size",
  },
];

async function checkAndAddTests() {
  console.log("Checking existing test codes in database...\n");

  try {
    // Check which tests already exist
    const existingTests = await db
      .select()
      .from(testReferenceRanges)
      .where(
        and(
          eq(testReferenceRanges.workspaceid, WORKSPACE_ID),
          eq(testReferenceRanges.isactive, "Y")
        )
      );

    const existingCodes = new Set(existingTests.map(t => t.testcode));
    console.log(`Found ${existingTests.length} existing test reference ranges`);
    console.log(`Unique test codes: ${existingCodes.size}`);
    console.log(`Test codes: ${Array.from(existingCodes).sort().join(", ")}\n`);

    // Check which CBC tests are missing
    const missingTests = missingCBCTests.filter(test => !existingCodes.has(test.testcode));
    
    if (missingTests.length === 0) {
      console.log("✅ All CBC component tests already exist in database!");
      return;
    }

    console.log(`Found ${missingTests.length} missing CBC component tests:`);
    missingTests.forEach(test => console.log(`  - ${test.testcode} (${test.testname})`));
    console.log();

    // Insert missing tests
    console.log("Adding missing tests to database...\n");
    
    for (const test of missingTests) {
      const result = await db
        .insert(testReferenceRanges)
        .values({
          workspaceid: WORKSPACE_ID,
          testcode: test.testcode,
          testname: test.testname,
          category: test.category,
          unit: test.unit,
          agegroup: test.agegroup,
          sex: test.sex,
          referencemin: test.referencemin,
          referencemax: test.referencemax,
          referencetext: test.referencetext,
          paniclow: test.paniclow,
          panichigh: test.panichigh,
          panictext: test.panictext,
          notes: test.notes,
          isactive: "Y",
          createdby: CREATED_BY,
        })
        .returning({ testcode: testReferenceRanges.testcode, testname: testReferenceRanges.testname });

      console.log(`✅ Added: ${result[0].testcode} - ${result[0].testname}`);
    }

    console.log(`\n✅ Successfully added ${missingTests.length} missing CBC component tests!`);

    // Verify final count
    const finalTests = await db
      .select()
      .from(testReferenceRanges)
      .where(
        and(
          eq(testReferenceRanges.workspaceid, WORKSPACE_ID),
          eq(testReferenceRanges.isactive, "Y")
        )
      );

    console.log(`\nFinal count: ${finalTests.length} test reference ranges in database`);

  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

checkAndAddTests();
