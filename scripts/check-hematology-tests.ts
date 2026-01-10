import { db } from "../lib/db";
import { testReferenceRanges } from "../lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";

async function checkTests() {
  console.log("Checking HGB, RBC, WBC, HCT in database...\n");

  try {
    const tests = await db
      .select()
      .from(testReferenceRanges)
      .where(
        and(
          eq(testReferenceRanges.workspaceid, WORKSPACE_ID),
          inArray(testReferenceRanges.testcode, ["HGB", "RBC", "WBC", "HCT"]),
          eq(testReferenceRanges.isactive, "Y")
        )
      )
      .orderBy(testReferenceRanges.testcode, testReferenceRanges.agegroup, testReferenceRanges.sex);

    console.log(`Found ${tests.length} entries:\n`);
    
    tests.forEach(test => {
      console.log(`${test.testcode} | ${test.agegroup.padEnd(6)} | ${test.sex.padEnd(3)} | ${test.referencemin}-${test.referencemax} ${test.unit}`);
    });

    // Check if there are ALL/ANY combinations
    console.log("\n\nChecking for ALL/ANY combinations:");
    const allAnyTests = tests.filter(t => t.agegroup === "ALL" && t.sex === "ANY");
    console.log(`Found ${allAnyTests.length} ALL/ANY entries:`);
    allAnyTests.forEach(test => {
      console.log(`  - ${test.testcode}: ${test.referencemin}-${test.referencemax} ${test.unit}`);
    });

    if (allAnyTests.length < 4) {
      console.log("\n⚠️  Missing ALL/ANY entries for some tests!");
      const missingCodes = ["HGB", "RBC", "WBC", "HCT"].filter(
        code => !allAnyTests.some(t => t.testcode === code)
      );
      console.log("Missing ALL/ANY for:", missingCodes.join(", "));
    }

  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

checkTests();
