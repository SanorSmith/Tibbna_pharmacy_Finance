import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const CREATED_BY = "5037145a-971e-4348-8e44-f7a7ca96a35f";

// Comprehensive test reference data including ALL test types
const allTestReferences = [
  // Urine Tests
  { testcode: "U-PROT", testname: "Urine Protein", category: "Urinalysis", unit: "mg/dL", agegroup: "ALL", sex: "ANY", referencemin: null, referencemax: "10", referencetext: "< 10 mg/dL", paniclow: null, panichigh: "300", notes: "Normal urine protein" },
  { testcode: "U-GLU", testname: "Urine Glucose", category: "Urinalysis", unit: "mg/dL", agegroup: "ALL", sex: "ANY", referencemin: null, referencemax: "15", referencetext: "< 15 mg/dL", paniclow: null, panichigh: "1000", notes: "Normal urine glucose" },
  { testcode: "U-BLOOD", testname: "Urine Blood", category: "Urinalysis", unit: "Present/Absent", agegroup: "ALL", sex: "ANY", referencemin: null, referencemax: null, referencetext: "Negative", paniclow: null, panichigh: null, notes: "Should be absent" },
  { testcode: "U-BILI", testname: "Urine Bilirubin", category: "Urinalysis", unit: "Present/Absent", agegroup: "ALL", sex: "ANY", referencemin: null, referencemax: null, referencetext: "Negative", paniclow: null, panichigh: null, notes: "Should be absent" },
  { testcode: "U-NIT-LE", testname: "Urine Nitrite/LE", category: "Urinalysis", unit: "Present/Absent", agegroup: "ALL", sex: "ANY", referencemin: null, referencemax: null, referencetext: "Negative", paniclow: null, panichigh: null, notes: "UTI indicator" },
  { testcode: "U-KET", testname: "Urine Ketones", category: "Urinalysis", unit: "Present/Absent", agegroup: "ALL", sex: "ANY", referencemin: null, referencemax: null, referencetext: "Negative", paniclow: null, panichigh: null, notes: "Should be absent" },
  { testcode: "U-24H-CR", testname: "24h Urine Creatinine", category: "Urinalysis", unit: "g/24h", agegroup: "ALL", sex: "M", referencemin: "1.0", referencemax: "2.0", referencetext: "1.0-2.0 g/24h", paniclow: "0.5", panichigh: "3.0", notes: "Male range" },
  { testcode: "U-24H-CR", testname: "24h Urine Creatinine", category: "Urinalysis", unit: "g/24h", agegroup: "ALL", sex: "F", referencemin: "0.8", referencemax: "1.8", referencetext: "0.8-1.8 g/24h", paniclow: "0.4", panichigh: "2.5", notes: "Female range" },
  
  // Histopathology Tests
  { testcode: "BIOPSY", testname: "Biopsy Examination", category: "Histopathology", unit: "Descriptive", agegroup: "ALL", sex: "ANY", referencemin: null, referencemax: null, referencetext: "Benign", paniclow: null, panichigh: null, notes: "Tissue examination" },
  { testcode: "CYTO", testname: "Cytology", category: "Histopathology", unit: "Descriptive", agegroup: "ALL", sex: "ANY", referencemin: null, referencemax: null, referencetext: "Negative for malignancy", paniclow: null, panichigh: null, notes: "Cell examination" },
  { testcode: "FISH", testname: "FISH Analysis", category: "Histopathology", unit: "Positive/Negative", agegroup: "ALL", sex: "ANY", referencemin: null, referencemax: null, referencetext: "Negative", paniclow: null, panichigh: null, notes: "Genetic marker analysis" },
  { testcode: "FNAC", testname: "Fine Needle Aspiration", category: "Histopathology", unit: "Descriptive", agegroup: "ALL", sex: "ANY", referencemin: null, referencemax: null, referencetext: "Benign", paniclow: null, panichigh: null, notes: "FNA cytology" },
  { testcode: "PAP", testname: "Pap Smear", category: "Histopathology", unit: "Classification", agegroup: "ALL", sex: "F", referencemin: null, referencemax: null, referencetext: "NILM (Negative)", paniclow: null, panichigh: null, notes: "Cervical cytology" },
  { testcode: "SEQ", testname: "Genetic Sequencing", category: "Histopathology", unit: "Descriptive", agegroup: "ALL", sex: "ANY", referencemin: null, referencemax: null, referencetext: "Wild type", paniclow: null, panichigh: null, notes: "DNA/RNA sequencing" },
  
  // Microbiology Tests
  { testcode: "BACT", testname: "Blood Culture", category: "Microbiology", unit: "Growth/No Growth", agegroup: "ALL", sex: "ANY", referencemin: null, referencemax: null, referencetext: "No growth", paniclow: null, panichigh: null, notes: "Bacterial culture" },
  { testcode: "C-DIFF", testname: "C. difficile", category: "Microbiology", unit: "Positive/Negative", agegroup: "ALL", sex: "ANY", referencemin: null, referencemax: null, referencetext: "Negative", paniclow: null, panichigh: null, notes: "C. diff toxin" },
  { testcode: "CSF-CULT", testname: "CSF Culture", category: "Microbiology", unit: "Growth/No Growth", agegroup: "ALL", sex: "ANY", referencemin: null, referencemax: null, referencetext: "No growth", paniclow: null, panichigh: null, notes: "CSF bacterial culture" },
  { testcode: "PARA-ST", testname: "Stool Parasites", category: "Microbiology", unit: "Positive/Negative", agegroup: "ALL", sex: "ANY", referencemin: null, referencemax: null, referencetext: "Negative", paniclow: null, panichigh: null, notes: "Stool parasite exam" },
  { testcode: "TB-PCR", testname: "TB PCR", category: "Microbiology", unit: "Detected/Not Detected", agegroup: "ALL", sex: "ANY", referencemin: null, referencemax: null, referencetext: "Not detected", paniclow: null, panichigh: null, notes: "TB molecular test" },
  { testcode: "UTI", testname: "Urine Culture", category: "Microbiology", unit: "CFU/mL", agegroup: "ALL", sex: "ANY", referencemin: null, referencemax: "10000", referencetext: "< 10,000 CFU/mL", paniclow: null, panichigh: "100000", notes: "Urine bacterial culture" },
  { testcode: "PCR", testname: "PCR Test", category: "Microbiology", unit: "Detected/Not Detected", agegroup: "ALL", sex: "ANY", referencemin: null, referencemax: null, referencetext: "Not detected", paniclow: null, panichigh: null, notes: "Molecular detection" },
  
  // Cytology Tests
  { testcode: "URINE-CYTO", testname: "Urine Cytology", category: "Histopathology", unit: "Descriptive", agegroup: "ALL", sex: "ANY", referencemin: null, referencemax: null, referencetext: "Negative for malignancy", paniclow: null, panichigh: null, notes: "Urine cell examination" },
  { testcode: "SPUTUM-CYTO", testname: "Sputum Cytology", category: "Histopathology", unit: "Descriptive", agegroup: "ALL", sex: "ANY", referencemin: null, referencemax: null, referencetext: "Negative for malignancy", paniclow: null, panichigh: null, notes: "Sputum cell examination" },
];

export async function POST() {
  try {
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const test of allTestReferences) {
      try {
        await db.insert(testReferenceRanges).values({
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
        });
        added++;
      } catch (err: any) {
        if (err.code === '23505') {
          skipped++;
        } else {
          errors.push(`${test.testcode}: ${err.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Added ${added} test references, skipped ${skipped} duplicates`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed test references", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
