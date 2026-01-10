import { db } from "../lib/db/index";
import { testReferenceRanges } from "../lib/db/schema/test-reference-ranges";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const CREATED_BY = "fa9fb036-a7eb-49af-890c-54406dad139d"; // Replace with actual user ID

interface TestReference {
  testcode: string;
  testname: string;
  category: string;
  unit: string;
  agegroup: string;
  sex: string;
  referencemin?: number;
  referencemax?: number;
  referencetext?: string;
  paniclow?: number;
  panichigh?: number;
}

const comprehensiveTestReferences: TestReference[] = [
  // HEMATOLOGY - CBC Panel with age/sex variations
  // RBC - Red Blood Cells
  { testcode: "RBC", testname: "Red Blood Cells", category: "Hematology", unit: "million cells/µL", agegroup: "NEO", sex: "ANY", referencemin: 4.0, referencemax: 6.0, paniclow: 2.5, panichigh: 7.5 },
  { testcode: "RBC", testname: "Red Blood Cells", category: "Hematology", unit: "million cells/µL", agegroup: "PED", sex: "ANY", referencemin: 4.0, referencemax: 5.5, paniclow: 2.5, panichigh: 7.0 },
  { testcode: "RBC", testname: "Red Blood Cells", category: "Hematology", unit: "million cells/µL", agegroup: "ADULT", sex: "M", referencemin: 4.5, referencemax: 5.9, paniclow: 2.5, panichigh: 7.0 },
  { testcode: "RBC", testname: "Red Blood Cells", category: "Hematology", unit: "million cells/µL", agegroup: "ADULT", sex: "F", referencemin: 4.1, referencemax: 5.1, paniclow: 2.5, panichigh: 6.5 },

  // WBC - White Blood Cells
  { testcode: "WBC", testname: "White Blood Cells", category: "Hematology", unit: "cells/µL", agegroup: "NEO", sex: "ANY", referencemin: 9000, referencemax: 30000, paniclow: 2000, panichigh: 50000 },
  { testcode: "WBC", testname: "White Blood Cells", category: "Hematology", unit: "cells/µL", agegroup: "PED", sex: "ANY", referencemin: 5000, referencemax: 15000, paniclow: 2000, panichigh: 30000 },
  { testcode: "WBC", testname: "White Blood Cells", category: "Hematology", unit: "cells/µL", agegroup: "ADULT", sex: "ANY", referencemin: 4000, referencemax: 11000, paniclow: 2000, panichigh: 25000 },

  // Hemoglobin
  { testcode: "HGB", testname: "Hemoglobin", category: "Hematology", unit: "g/dL", agegroup: "NEO", sex: "ANY", referencemin: 14.0, referencemax: 24.0, paniclow: 7.0, panichigh: 28.0 },
  { testcode: "HGB", testname: "Hemoglobin", category: "Hematology", unit: "g/dL", agegroup: "PED", sex: "ANY", referencemin: 11.0, referencemax: 16.0, paniclow: 7.0, panichigh: 20.0 },
  { testcode: "HGB", testname: "Hemoglobin", category: "Hematology", unit: "g/dL", agegroup: "ADULT", sex: "M", referencemin: 13.5, referencemax: 17.5, paniclow: 7.0, panichigh: 20.0 },
  { testcode: "HGB", testname: "Hemoglobin", category: "Hematology", unit: "g/dL", agegroup: "ADULT", sex: "F", referencemin: 12.0, referencemax: 15.5, paniclow: 7.0, panichigh: 18.0 },

  // Hematocrit
  { testcode: "HCT", testname: "Hematocrit", category: "Hematology", unit: "%", agegroup: "NEO", sex: "ANY", referencemin: 42.0, referencemax: 68.0, paniclow: 20.0, panichigh: 75.0 },
  { testcode: "HCT", testname: "Hematocrit", category: "Hematology", unit: "%", agegroup: "PED", sex: "ANY", referencemin: 32.0, referencemax: 44.0, paniclow: 20.0, panichigh: 60.0 },
  { testcode: "HCT", testname: "Hematocrit", category: "Hematology", unit: "%", agegroup: "ADULT", sex: "M", referencemin: 38.8, referencemax: 50.0, paniclow: 20.0, panichigh: 60.0 },
  { testcode: "HCT", testname: "Hematocrit", category: "Hematology", unit: "%", agegroup: "ADULT", sex: "F", referencemin: 34.9, referencemax: 44.5, paniclow: 20.0, panichigh: 55.0 },

  // MCV - Mean Corpuscular Volume
  { testcode: "MCV", testname: "Mean Corpuscular Volume", category: "Hematology", unit: "fL", agegroup: "NEO", sex: "ANY", referencemin: 96.0, referencemax: 108.0 },
  { testcode: "MCV", testname: "Mean Corpuscular Volume", category: "Hematology", unit: "fL", agegroup: "PED", sex: "ANY", referencemin: 75.0, referencemax: 87.0 },
  { testcode: "MCV", testname: "Mean Corpuscular Volume", category: "Hematology", unit: "fL", agegroup: "ADULT", sex: "ANY", referencemin: 80.0, referencemax: 100.0 },

  // MCH - Mean Corpuscular Hemoglobin
  { testcode: "MCH", testname: "Mean Corpuscular Hemoglobin", category: "Hematology", unit: "pg", agegroup: "ALL", sex: "ANY", referencemin: 27.0, referencemax: 33.0 },

  // MCHC - Mean Corpuscular Hemoglobin Concentration
  { testcode: "MCHC", testname: "Mean Corpuscular Hemoglobin Concentration", category: "Hematology", unit: "g/dL", agegroup: "ALL", sex: "ANY", referencemin: 32.0, referencemax: 36.0 },

  // Platelets
  { testcode: "PLT", testname: "Platelets", category: "Hematology", unit: "cells/µL", agegroup: "NEO", sex: "ANY", referencemin: 150000, referencemax: 450000, paniclow: 20000, panichigh: 1000000 },
  { testcode: "PLT", testname: "Platelets", category: "Hematology", unit: "cells/µL", agegroup: "PED", sex: "ANY", referencemin: 150000, referencemax: 400000, paniclow: 20000, panichigh: 1000000 },
  { testcode: "PLT", testname: "Platelets", category: "Hematology", unit: "cells/µL", agegroup: "ADULT", sex: "ANY", referencemin: 150000, referencemax: 400000, paniclow: 20000, panichigh: 1000000 },

  // Differential Count
  { testcode: "NEUT", testname: "Neutrophils", category: "Hematology", unit: "%", agegroup: "ALL", sex: "ANY", referencemin: 40.0, referencemax: 70.0 },
  { testcode: "LYMPH", testname: "Lymphocytes", category: "Hematology", unit: "%", agegroup: "ALL", sex: "ANY", referencemin: 20.0, referencemax: 40.0 },
  { testcode: "MONO", testname: "Monocytes", category: "Hematology", unit: "%", agegroup: "ALL", sex: "ANY", referencemin: 2.0, referencemax: 8.0 },
  { testcode: "EOS", testname: "Eosinophils", category: "Hematology", unit: "%", agegroup: "ALL", sex: "ANY", referencemin: 1.0, referencemax: 4.0 },
  { testcode: "BASO", testname: "Basophils", category: "Hematology", unit: "%", agegroup: "ALL", sex: "ANY", referencemin: 0.5, referencemax: 1.0 },

  // ESR
  { testcode: "ESR", testname: "Erythrocyte Sedimentation Rate", category: "Hematology", unit: "mm/hr", agegroup: "ADULT", sex: "M", referencemin: 0, referencemax: 15 },
  { testcode: "ESR", testname: "Erythrocyte Sedimentation Rate", category: "Hematology", unit: "mm/hr", agegroup: "ADULT", sex: "F", referencemin: 0, referencemax: 20 },

  // CHEMISTRY - Metabolic Panel
  // Glucose
  { testcode: "GLU", testname: "Glucose", category: "Chemistry", unit: "mg/dL", agegroup: "NEO", sex: "ANY", referencemin: 40, referencemax: 100, paniclow: 30, panichigh: 400 },
  { testcode: "GLU", testname: "Glucose", category: "Chemistry", unit: "mg/dL", agegroup: "PED", sex: "ANY", referencemin: 60, referencemax: 100, paniclow: 40, panichigh: 400 },
  { testcode: "GLU", testname: "Glucose", category: "Chemistry", unit: "mg/dL", agegroup: "ADULT", sex: "ANY", referencemin: 70, referencemax: 100, paniclow: 40, panichigh: 500 },

  // BUN - Blood Urea Nitrogen
  { testcode: "BUN", testname: "Blood Urea Nitrogen", category: "Chemistry", unit: "mg/dL", agegroup: "ALL", sex: "ANY", referencemin: 7, referencemax: 20, paniclow: 2, panichigh: 100 },

  // Creatinine
  { testcode: "CREAT", testname: "Creatinine", category: "Chemistry", unit: "mg/dL", agegroup: "PED", sex: "ANY", referencemin: 0.3, referencemax: 0.7, paniclow: 0.1, panichigh: 15.0 },
  { testcode: "CREAT", testname: "Creatinine", category: "Chemistry", unit: "mg/dL", agegroup: "ADULT", sex: "M", referencemin: 0.7, referencemax: 1.3, paniclow: 0.2, panichigh: 15.0 },
  { testcode: "CREAT", testname: "Creatinine", category: "Chemistry", unit: "mg/dL", agegroup: "ADULT", sex: "F", referencemin: 0.6, referencemax: 1.1, paniclow: 0.2, panichigh: 15.0 },

  // Sodium
  { testcode: "NA", testname: "Sodium", category: "Chemistry", unit: "mEq/L", agegroup: "ALL", sex: "ANY", referencemin: 136, referencemax: 145, paniclow: 120, panichigh: 160 },

  // Potassium
  { testcode: "K", testname: "Potassium", category: "Chemistry", unit: "mEq/L", agegroup: "ALL", sex: "ANY", referencemin: 3.5, referencemax: 5.0, paniclow: 2.5, panichigh: 6.5 },

  // Chloride
  { testcode: "CL", testname: "Chloride", category: "Chemistry", unit: "mEq/L", agegroup: "ALL", sex: "ANY", referencemin: 98, referencemax: 107, paniclow: 80, panichigh: 120 },

  // Calcium
  { testcode: "CA", testname: "Calcium", category: "Chemistry", unit: "mg/dL", agegroup: "ALL", sex: "ANY", referencemin: 8.5, referencemax: 10.5, paniclow: 6.0, panichigh: 13.0 },

  // LIVER FUNCTION TESTS
  // ALT
  { testcode: "ALT", testname: "Alanine Aminotransferase", category: "Liver Function", unit: "U/L", agegroup: "ALL", sex: "ANY", referencemin: 7, referencemax: 56, panichigh: 1000 },

  // AST
  { testcode: "AST", testname: "Aspartate Aminotransferase", category: "Liver Function", unit: "U/L", agegroup: "ALL", sex: "ANY", referencemin: 10, referencemax: 40, panichigh: 1000 },

  // Bilirubin Total
  { testcode: "TBIL", testname: "Total Bilirubin", category: "Liver Function", unit: "mg/dL", agegroup: "NEO", sex: "ANY", referencemin: 0.0, referencemax: 12.0, panichigh: 20.0 },
  { testcode: "TBIL", testname: "Total Bilirubin", category: "Liver Function", unit: "mg/dL", agegroup: "ADULT", sex: "ANY", referencemin: 0.1, referencemax: 1.2, panichigh: 15.0 },

  // Bilirubin Direct
  { testcode: "DBIL", testname: "Direct Bilirubin", category: "Liver Function", unit: "mg/dL", agegroup: "ALL", sex: "ANY", referencemin: 0.0, referencemax: 0.3 },

  // Albumin
  { testcode: "ALB", testname: "Albumin", category: "Liver Function", unit: "g/dL", agegroup: "ALL", sex: "ANY", referencemin: 3.5, referencemax: 5.5, paniclow: 1.5 },

  // Total Protein
  { testcode: "TP", testname: "Total Protein", category: "Liver Function", unit: "g/dL", agegroup: "ALL", sex: "ANY", referencemin: 6.0, referencemax: 8.3 },

  // Alkaline Phosphatase
  { testcode: "ALP", testname: "Alkaline Phosphatase", category: "Liver Function", unit: "U/L", agegroup: "PED", sex: "ANY", referencemin: 100, referencemax: 400 },
  { testcode: "ALP", testname: "Alkaline Phosphatase", category: "Liver Function", unit: "U/L", agegroup: "ADULT", sex: "ANY", referencemin: 30, referencemax: 120 },

  // LIPID PANEL
  { testcode: "CHOL", testname: "Total Cholesterol", category: "Lipid Panel", unit: "mg/dL", agegroup: "ADULT", sex: "ANY", referencemin: 0, referencemax: 200 },
  { testcode: "TRIG", testname: "Triglycerides", category: "Lipid Panel", unit: "mg/dL", agegroup: "ADULT", sex: "ANY", referencemin: 0, referencemax: 150 },
  { testcode: "HDL", testname: "HDL Cholesterol", category: "Lipid Panel", unit: "mg/dL", agegroup: "ADULT", sex: "M", referencemin: 40, referencemax: 200 },
  { testcode: "HDL", testname: "HDL Cholesterol", category: "Lipid Panel", unit: "mg/dL", agegroup: "ADULT", sex: "F", referencemin: 50, referencemax: 200 },
  { testcode: "LDL", testname: "LDL Cholesterol", category: "Lipid Panel", unit: "mg/dL", agegroup: "ADULT", sex: "ANY", referencemin: 0, referencemax: 100 },

  // THYROID FUNCTION
  { testcode: "TSH", testname: "Thyroid Stimulating Hormone", category: "Thyroid", unit: "µIU/mL", agegroup: "ADULT", sex: "ANY", referencemin: 0.4, referencemax: 4.0, paniclow: 0.01, panichigh: 20.0 },
  { testcode: "T3", testname: "Triiodothyronine", category: "Thyroid", unit: "ng/dL", agegroup: "ADULT", sex: "ANY", referencemin: 80, referencemax: 200 },
  { testcode: "T4", testname: "Thyroxine", category: "Thyroid", unit: "µg/dL", agegroup: "ADULT", sex: "ANY", referencemin: 4.5, referencemax: 12.0 },

  // DIABETES MARKERS
  { testcode: "HBA1C", testname: "Hemoglobin A1c", category: "Diabetes", unit: "%", agegroup: "ADULT", sex: "ANY", referencemin: 4.0, referencemax: 5.6 },

  // CARDIAC MARKERS
  { testcode: "TROP", testname: "Troponin I", category: "Cardiac", unit: "ng/mL", agegroup: "ADULT", sex: "ANY", referencemin: 0.0, referencemax: 0.04, panichigh: 0.5 },
  { testcode: "CK", testname: "Creatine Kinase", category: "Cardiac", unit: "U/L", agegroup: "ADULT", sex: "M", referencemin: 52, referencemax: 336 },
  { testcode: "CK", testname: "Creatine Kinase", category: "Cardiac", unit: "U/L", agegroup: "ADULT", sex: "F", referencemin: 38, referencemax: 176 },

  // INFLAMMATION MARKERS
  { testcode: "CRP", testname: "C-Reactive Protein", category: "Inflammation", unit: "mg/L", agegroup: "ADULT", sex: "ANY", referencemin: 0.0, referencemax: 3.0, panichigh: 200.0 },

  // URINALYSIS
  { testcode: "URINE-PH", testname: "Urine pH", category: "Urinalysis", unit: "pH", agegroup: "ALL", sex: "ANY", referencemin: 4.5, referencemax: 8.0 },
  { testcode: "URINE-SG", testname: "Urine Specific Gravity", category: "Urinalysis", unit: "", agegroup: "ALL", sex: "ANY", referencemin: 1.005, referencemax: 1.030 },
  { testcode: "URINE-PROT", testname: "Urine Protein", category: "Urinalysis", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Negative" },
  { testcode: "URINE-GLU", testname: "Urine Glucose", category: "Urinalysis", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Negative" },
  { testcode: "URINE-KET", testname: "Urine Ketones", category: "Urinalysis", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Negative" },
  { testcode: "URINE-BLOOD", testname: "Urine Blood", category: "Urinalysis", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Negative" },

  // COAGULATION
  { testcode: "PT", testname: "Prothrombin Time", category: "Coagulation", unit: "seconds", agegroup: "ALL", sex: "ANY", referencemin: 11.0, referencemax: 13.5, panichigh: 30.0 },
  { testcode: "INR", testname: "International Normalized Ratio", category: "Coagulation", unit: "", agegroup: "ALL", sex: "ANY", referencemin: 0.8, referencemax: 1.2, panichigh: 5.0 },
  { testcode: "APTT", testname: "Activated Partial Thromboplastin Time", category: "Coagulation", unit: "seconds", agegroup: "ALL", sex: "ANY", referencemin: 25.0, referencemax: 35.0, panichigh: 100.0 },

  // VITAMINS & MINERALS
  { testcode: "VIT-D", testname: "Vitamin D", category: "Vitamins", unit: "ng/mL", agegroup: "ADULT", sex: "ANY", referencemin: 30.0, referencemax: 100.0 },
  { testcode: "VIT-B12", testname: "Vitamin B12", category: "Vitamins", unit: "pg/mL", agegroup: "ADULT", sex: "ANY", referencemin: 200, referencemax: 900 },
  { testcode: "FOLATE", testname: "Folate", category: "Vitamins", unit: "ng/mL", agegroup: "ADULT", sex: "ANY", referencemin: 2.7, referencemax: 17.0 },
  { testcode: "IRON", testname: "Iron", category: "Minerals", unit: "µg/dL", agegroup: "ADULT", sex: "M", referencemin: 65, referencemax: 175 },
  { testcode: "IRON", testname: "Iron", category: "Minerals", unit: "µg/dL", agegroup: "ADULT", sex: "F", referencemin: 50, referencemax: 170 },
  { testcode: "FERRITIN", testname: "Ferritin", category: "Minerals", unit: "ng/mL", agegroup: "ADULT", sex: "M", referencemin: 24, referencemax: 336 },
  { testcode: "FERRITIN", testname: "Ferritin", category: "Minerals", unit: "ng/mL", agegroup: "ADULT", sex: "F", referencemin: 11, referencemax: 307 },

  // HORMONES
  { testcode: "TESTO", testname: "Testosterone", category: "Hormones", unit: "ng/dL", agegroup: "ADULT", sex: "M", referencemin: 300, referencemax: 1000 },
  { testcode: "TESTO", testname: "Testosterone", category: "Hormones", unit: "ng/dL", agegroup: "ADULT", sex: "F", referencemin: 15, referencemax: 70 },
  { testcode: "ESTRADIOL", testname: "Estradiol", category: "Hormones", unit: "pg/mL", agegroup: "ADULT", sex: "F", referencemin: 30, referencemax: 400 },
  { testcode: "PROGEST", testname: "Progesterone", category: "Hormones", unit: "ng/mL", agegroup: "ADULT", sex: "F", referencemin: 0.2, referencemax: 25.0 },
  { testcode: "CORTISOL", testname: "Cortisol", category: "Hormones", unit: "µg/dL", agegroup: "ADULT", sex: "ANY", referencemin: 6.0, referencemax: 23.0 },

  // TUMOR MARKERS
  { testcode: "PSA", testname: "Prostate Specific Antigen", category: "Tumor Markers", unit: "ng/mL", agegroup: "ADULT", sex: "M", referencemin: 0.0, referencemax: 4.0 },
  { testcode: "CEA", testname: "Carcinoembryonic Antigen", category: "Tumor Markers", unit: "ng/mL", agegroup: "ADULT", sex: "ANY", referencemin: 0.0, referencemax: 3.0 },
  { testcode: "CA-125", testname: "Cancer Antigen 125", category: "Tumor Markers", unit: "U/mL", agegroup: "ADULT", sex: "F", referencemin: 0.0, referencemax: 35.0 },
  { testcode: "CA-19-9", testname: "Cancer Antigen 19-9", category: "Tumor Markers", unit: "U/mL", agegroup: "ADULT", sex: "ANY", referencemin: 0.0, referencemax: 37.0 },
  { testcode: "AFP", testname: "Alpha-Fetoprotein", category: "Tumor Markers", unit: "ng/mL", agegroup: "ADULT", sex: "ANY", referencemin: 0.0, referencemax: 10.0 },

  // IMMUNOLOGY
  { testcode: "IGG", testname: "Immunoglobulin G", category: "Immunology", unit: "mg/dL", agegroup: "ADULT", sex: "ANY", referencemin: 700, referencemax: 1600 },
  { testcode: "IGA", testname: "Immunoglobulin A", category: "Immunology", unit: "mg/dL", agegroup: "ADULT", sex: "ANY", referencemin: 70, referencemax: 400 },
  { testcode: "IGM", testname: "Immunoglobulin M", category: "Immunology", unit: "mg/dL", agegroup: "ADULT", sex: "ANY", referencemin: 40, referencemax: 230 },
];

async function seedComprehensiveTestReferences() {
  try {
    console.log("🌱 Seeding comprehensive test reference ranges...");
    console.log(`Total references to insert: ${comprehensiveTestReferences.length}`);

    let inserted = 0;
    let skipped = 0;

    for (const ref of comprehensiveTestReferences) {
      try {
        await db.insert(testReferenceRanges).values({
          workspaceid: WORKSPACE_ID,
          testcode: ref.testcode,
          testname: ref.testname,
          category: ref.category,
          unit: ref.unit,
          agegroup: ref.agegroup,
          sex: ref.sex,
          referencemin: ref.referencemin?.toString(),
          referencemax: ref.referencemax?.toString(),
          referencetext: ref.referencetext,
          paniclow: ref.paniclow?.toString(),
          panichigh: ref.panichigh?.toString(),
          createdby: CREATED_BY,
          isactive: "Y",
        });
        inserted++;
      } catch (error: any) {
        if (error.code === "23505") {
          // Duplicate key error
          skipped++;
        } else {
          console.error(`Error inserting ${ref.testcode} (${ref.agegroup}/${ref.sex}):`, error.message);
        }
      }
    }

    console.log(`✅ Successfully seeded ${inserted} test reference ranges`);
    console.log(`⏭️  Skipped ${skipped} duplicates`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding test references:", error);
    process.exit(1);
  }
}

seedComprehensiveTestReferences();
