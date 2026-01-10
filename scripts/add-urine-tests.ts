import { db } from "../lib/db";
import { testReferenceRanges } from "../lib/db/schema";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const CREATED_BY = "5037145a-971e-4348-8e44-f7a7ca96a35f";

const urineTests = [
  {
    testcode: "U-PROT",
    testname: "Urine Protein",
    category: "Urinalysis",
    unit: "mg/dL",
    agegroup: "ALL",
    sex: "ANY",
    referencemin: null,
    referencemax: "10.0000",
    referencetext: "< 10 mg/dL (Negative to Trace)",
    paniclow: null,
    panichigh: "300.0000",
    notes: "Normal urine protein levels",
  },
  {
    testcode: "U-GLU",
    testname: "Urine Glucose",
    category: "Urinalysis",
    unit: "mg/dL",
    agegroup: "ALL",
    sex: "ANY",
    referencemin: null,
    referencemax: "15.0000",
    referencetext: "< 15 mg/dL (Negative)",
    paniclow: null,
    panichigh: "1000.0000",
    notes: "Normal urine glucose levels",
  },
  {
    testcode: "U-BLOOD",
    testname: "Urine Blood",
    category: "Urinalysis",
    unit: "Present/Absent",
    agegroup: "ALL",
    sex: "ANY",
    referencemin: null,
    referencemax: null,
    referencetext: "Negative (Absent)",
    paniclow: null,
    panichigh: null,
    notes: "Blood should be absent in normal urine",
  },
  {
    testcode: "U-BILI",
    testname: "Urine Bilirubin",
    category: "Urinalysis",
    unit: "Present/Absent",
    agegroup: "ALL",
    sex: "ANY",
    referencemin: null,
    referencemax: null,
    referencetext: "Negative (Absent)",
    paniclow: null,
    panichigh: null,
    notes: "Bilirubin should be absent in normal urine",
  },
  {
    testcode: "U-NIT-LE",
    testname: "Urine Nitrite/Leukocyte Esterase",
    category: "Urinalysis",
    unit: "Present/Absent",
    agegroup: "ALL",
    sex: "ANY",
    referencemin: null,
    referencemax: null,
    referencetext: "Negative (Absent)",
    paniclow: null,
    panichigh: null,
    notes: "Indicates possible urinary tract infection if positive",
  },
  {
    testcode: "U-24H-CR",
    testname: "24-Hour Urine Creatinine",
    category: "Urinalysis",
    unit: "g/24h",
    agegroup: "ALL",
    sex: "M",
    referencemin: "1.0000",
    referencemax: "2.0000",
    referencetext: "1.0-2.0 g/24h",
    paniclow: "0.5000",
    panichigh: "3.0000",
    notes: "24-hour urine creatinine for males",
  },
  {
    testcode: "U-24H-CR",
    testname: "24-Hour Urine Creatinine",
    category: "Urinalysis",
    unit: "g/24h",
    agegroup: "ALL",
    sex: "F",
    referencemin: "0.8000",
    referencemax: "1.8000",
    referencetext: "0.8-1.8 g/24h",
    paniclow: "0.4000",
    panichigh: "2.5000",
    notes: "24-hour urine creatinine for females",
  },
  {
    testcode: "U-KET",
    testname: "Urine Ketones",
    category: "Urinalysis",
    unit: "Present/Absent",
    agegroup: "ALL",
    sex: "ANY",
    referencemin: null,
    referencemax: null,
    referencetext: "Negative (Absent)",
    paniclow: null,
    panichigh: null,
    notes: "Ketones should be absent in normal urine",
  },
];

async function addUrineTests() {
  console.log("Adding urine test reference ranges...\n");

  try {
    for (const test of urineTests) {
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
            referencetext: test.referencetext,
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
          });

        console.log(`✅ Added: ${result[0].testcode} - ${result[0].testname} (${result[0].unit})`);
      } catch (err: any) {
        if (err.code === '23505') {
          console.log(`⚠️  ${test.testcode} (${test.sex}) already exists (skipped)`);
        } else {
          throw err;
        }
      }
    }

    console.log("\n✅ Successfully added urine test reference ranges!");
    console.log("\n🎯 Now refresh your browser to see the reference data!");

  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

addUrineTests();
