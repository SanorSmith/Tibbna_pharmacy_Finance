import { db } from "../lib/db";
import { testReferenceRanges } from "../lib/db/schema";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const CREATED_BY = "5037145a-971e-4348-8e44-f7a7ca96a35f";

const fallbackTests = [
  {
    testcode: "HGB",
    testname: "Hemoglobin",
    category: "Hematology",
    unit: "g/dL",
    agegroup: "ALL",
    sex: "ANY",
    referencemin: "12.0000",
    referencemax: "16.0000",
    paniclow: "7.0000",
    panichigh: "20.0000",
    notes: "Hemoglobin - general reference range",
  },
  {
    testcode: "RBC",
    testname: "Red Blood Cells",
    category: "Hematology",
    unit: "million/µL",
    agegroup: "ALL",
    sex: "ANY",
    referencemin: "4.0000",
    referencemax: "5.5000",
    paniclow: "2.5000",
    panichigh: "7.0000",
    notes: "Red blood cells - general reference range",
  },
  {
    testcode: "WBC",
    testname: "White Blood Cells",
    category: "Hematology",
    unit: "cells/µL",
    agegroup: "ALL",
    sex: "ANY",
    referencemin: "4000.0000",
    referencemax: "11000.0000",
    paniclow: "2000.0000",
    panichigh: "30000.0000",
    notes: "White blood cells - general reference range",
  },
  {
    testcode: "HCT",
    testname: "Hematocrit",
    category: "Hematology",
    unit: "%",
    agegroup: "ALL",
    sex: "ANY",
    referencemin: "36.0000",
    referencemax: "48.0000",
    paniclow: "25.0000",
    panichigh: "60.0000",
    notes: "Hematocrit - general reference range",
  },
];

async function addFallbackTests() {
  console.log("Adding ALL/ANY fallback entries for HGB, RBC, WBC, HCT...\n");

  try {
    for (const test of fallbackTests) {
      try {
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
            referencetext: null,
            paniclow: test.paniclow,
            panichigh: test.panichigh,
            panictext: null,
            notes: test.notes,
            isactive: "Y",
            createdby: CREATED_BY,
          })
          .returning({ 
            testcode: testReferenceRanges.testcode, 
            testname: testReferenceRanges.testname,
            unit: testReferenceRanges.unit,
            referencemin: testReferenceRanges.referencemin,
            referencemax: testReferenceRanges.referencemax,
          });

        console.log(`✅ Added: ${result[0].testcode} - ${result[0].testname}`);
        console.log(`   Range: ${result[0].referencemin}-${result[0].referencemax} ${result[0].unit}\n`);
      } catch (err: any) {
        if (err.code === '23505') {
          console.log(`⚠️  ${test.testcode} already exists (skipped)\n`);
        } else {
          throw err;
        }
      }
    }

    console.log("✅ Successfully added ALL/ANY fallback entries!");
    console.log("\n🎯 Now refresh your browser to see all CBC components with reference data!");

  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

addFallbackTests();
