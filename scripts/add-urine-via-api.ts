// Add urine test references via the API endpoint
const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const API_BASE = `http://localhost:3000/api/d/${WORKSPACE_ID}/test-reference-ranges`;

const urineTests = [
  {
    testcode: "U-PROT",
    testname: "Urine Protein",
    category: "Urinalysis",
    unit: "mg/dL",
    agegroup: "ALL",
    sex: "ANY",
    referencemin: null,
    referencemax: 10,
    referencetext: "< 10 mg/dL (Negative to Trace)",
    paniclow: null,
    panichigh: 300,
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
    referencemax: 15,
    referencetext: "< 15 mg/dL (Negative)",
    paniclow: null,
    panichigh: 1000,
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
    referencemin: 1.0,
    referencemax: 2.0,
    referencetext: "1.0-2.0 g/24h",
    paniclow: 0.5,
    panichigh: 3.0,
    notes: "24-hour urine creatinine for males",
  },
  {
    testcode: "U-24H-CR",
    testname: "24-Hour Urine Creatinine",
    category: "Urinalysis",
    unit: "g/24h",
    agegroup: "ALL",
    sex: "F",
    referencemin: 0.8,
    referencemax: 1.8,
    referencetext: "0.8-1.8 g/24h",
    paniclow: 0.4,
    panichigh: 2.5,
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
  console.log("Adding urine test reference ranges via API...\n");

  for (const test of urineTests) {
    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(test),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Added: ${test.testcode} (${test.sex}) - ${test.testname}`);
      } else {
        const error = await response.json();
        if (error.error?.includes("duplicate") || error.error?.includes("already exists")) {
          console.log(`⚠️  ${test.testcode} (${test.sex}) already exists (skipped)`);
        } else {
          console.error(`❌ Failed to add ${test.testcode}:`, error);
        }
      }
    } catch (error) {
      console.error(`❌ Error adding ${test.testcode}:`, error);
    }
  }

  console.log("\n✅ Finished adding urine test reference ranges!");
  console.log("🎯 Refresh your browser to see the reference data!");
}

addUrineTests();
