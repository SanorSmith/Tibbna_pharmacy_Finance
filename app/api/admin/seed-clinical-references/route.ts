import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";

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
  panictext?: string;
}

const clinicalTestReferences: TestReference[] = [
  // HEMATOLOGY - CBC COMPONENTS
  // Hemoglobin (HGB) - g/dL
  { testcode: "HGB", testname: "Hemoglobin", category: "Hematology", unit: "g/dL", agegroup: "NEO", sex: "ANY", referencemin: 14.0, referencemax: 24.0, paniclow: 10.0, panichigh: 25.0 },
  { testcode: "HGB", testname: "Hemoglobin", category: "Hematology", unit: "g/dL", agegroup: "PED", sex: "ANY", referencemin: 11.0, referencemax: 14.5, paniclow: 7.0, panichigh: 20.0 },
  { testcode: "HGB", testname: "Hemoglobin", category: "Hematology", unit: "g/dL", agegroup: "ADULT", sex: "M", referencemin: 13.0, referencemax: 17.0, paniclow: 7.0, panichigh: 20.0 },
  { testcode: "HGB", testname: "Hemoglobin", category: "Hematology", unit: "g/dL", agegroup: "ADULT", sex: "F", referencemin: 11.5, referencemax: 15.5, paniclow: 7.0, panichigh: 20.0 },

  // WBC - cells/µL
  { testcode: "WBC", testname: "White Blood Cells", category: "Hematology", unit: "cells/µL", agegroup: "NEO", sex: "ANY", referencemin: 9000, referencemax: 30000, paniclow: 5000, panichigh: 50000 },
  { testcode: "WBC", testname: "White Blood Cells", category: "Hematology", unit: "cells/µL", agegroup: "PED", sex: "ANY", referencemin: 5000, referencemax: 15000, paniclow: 2000, panichigh: 30000 },
  { testcode: "WBC", testname: "White Blood Cells", category: "Hematology", unit: "cells/µL", agegroup: "ADULT", sex: "ANY", referencemin: 4000, referencemax: 11000, paniclow: 2000, panichigh: 30000 },

  // Platelets - cells/µL
  { testcode: "PLT", testname: "Platelets", category: "Hematology", unit: "cells/µL", agegroup: "ALL", sex: "ANY", referencemin: 150000, referencemax: 450000, paniclow: 20000, panichigh: 1000000 },

  // Hematocrit (HCT) - %
  { testcode: "HCT", testname: "Hematocrit", category: "Hematology", unit: "%", agegroup: "ADULT", sex: "M", referencemin: 40.0, referencemax: 50.0, paniclow: 21.0, panichigh: 60.0 },
  { testcode: "HCT", testname: "Hematocrit", category: "Hematology", unit: "%", agegroup: "ADULT", sex: "F", referencemin: 36.0, referencemax: 46.0, paniclow: 21.0, panichigh: 60.0 },

  // RBC - million/µL
  { testcode: "RBC", testname: "Red Blood Cells", category: "Hematology", unit: "million/µL", agegroup: "ADULT", sex: "M", referencemin: 4.4, referencemax: 5.9, paniclow: 2.5, panichigh: 7.0 },
  { testcode: "RBC", testname: "Red Blood Cells", category: "Hematology", unit: "million/µL", agegroup: "ADULT", sex: "F", referencemin: 3.9, referencemax: 5.1, paniclow: 2.5, panichigh: 7.0 },

  // ESR - mm/hr
  { testcode: "ESR", testname: "Erythrocyte Sedimentation Rate", category: "Hematology", unit: "mm/hr", agegroup: "ADULT", sex: "M", referencemin: 0, referencemax: 15, panichigh: 100 },
  { testcode: "ESR", testname: "Erythrocyte Sedimentation Rate", category: "Hematology", unit: "mm/hr", agegroup: "ADULT", sex: "F", referencemin: 0, referencemax: 20, panichigh: 100 },

  // Reticulocytes - %
  { testcode: "RETIC", testname: "Reticulocytes", category: "Hematology", unit: "%", agegroup: "ALL", sex: "ANY", referencemin: 0.5, referencemax: 2.5, panichigh: 10.0 },

  // COAGULATION
  { testcode: "PT", testname: "Prothrombin Time", category: "Coagulation", unit: "seconds", agegroup: "ALL", sex: "ANY", referencemin: 11.0, referencemax: 13.5, panichigh: 25.0 },
  { testcode: "INR", testname: "International Normalized Ratio", category: "Coagulation", unit: "", agegroup: "ALL", sex: "ANY", referencemin: 0.8, referencemax: 1.2, panichigh: 5.0 },
  { testcode: "APTT", testname: "Activated Partial Thromboplastin Time", category: "Coagulation", unit: "seconds", agegroup: "ALL", sex: "ANY", referencemin: 25.0, referencemax: 35.0, panichigh: 100.0 },
  { testcode: "BT", testname: "Bleeding Time", category: "Coagulation", unit: "minutes", agegroup: "ALL", sex: "ANY", referencemin: 2.0, referencemax: 7.0, panichigh: 15.0 },
  { testcode: "CT", testname: "Clotting Time", category: "Coagulation", unit: "minutes", agegroup: "ALL", sex: "ANY", referencemin: 5.0, referencemax: 10.0, panichigh: 20.0 },

  // BLOOD SMEAR / SPECIALIZED
  { testcode: "BLAST", testname: "Blasts", category: "Hematology", unit: "%", agegroup: "ALL", sex: "ANY", referencemin: 0, referencemax: 0, referencetext: "0%", panichigh: 5.0, panictext: ">5%" },
  { testcode: "SICKLE", testname: "Sickle Cells", category: "Hematology", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Absent", panictext: "Present" },
  { testcode: "BLOOD-PARA", testname: "Blood Parasites", category: "Hematology", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Absent", panictext: "Present" },
  { testcode: "MALARIA", testname: "Malaria Parasite", category: "Hematology", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Negative", panictext: "Positive" },
  { testcode: "MICROFILARIA", testname: "Microfilaria", category: "Hematology", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Negative", panictext: "Positive" },
  { testcode: "BONE-MARROW", testname: "Bone Marrow", category: "Hematology", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Normal", panictext: "Malignancy" },

  // ANEMIA WORKUP
  { testcode: "FERRITIN", testname: "Ferritin", category: "Anemia Workup", unit: "ng/mL", agegroup: "ADULT", sex: "M", referencemin: 30, referencemax: 400, panichigh: 1000 },
  { testcode: "FERRITIN", testname: "Ferritin", category: "Anemia Workup", unit: "ng/mL", agegroup: "ADULT", sex: "F", referencemin: 15, referencemax: 150, panichigh: 1000 },
  { testcode: "IRON", testname: "Serum Iron", category: "Anemia Workup", unit: "µg/dL", agegroup: "ADULT", sex: "ANY", referencemin: 60, referencemax: 170, paniclow: 20 },
  { testcode: "VIT-B12", testname: "Vitamin B12", category: "Anemia Workup", unit: "pg/mL", agegroup: "ADULT", sex: "ANY", referencemin: 200, referencemax: 900, paniclow: 100 },
  { testcode: "FOLATE", testname: "Folate", category: "Anemia Workup", unit: "ng/mL", agegroup: "ADULT", sex: "ANY", referencemin: 2.7, referencemax: 17.0, paniclow: 1.0 },

  // BIOCHEMISTRY - ELECTROLYTES
  { testcode: "NA", testname: "Sodium", category: "Electrolytes", unit: "mEq/L", agegroup: "ALL", sex: "ANY", referencemin: 135, referencemax: 145, paniclow: 120, panichigh: 160 },
  { testcode: "K", testname: "Potassium", category: "Electrolytes", unit: "mEq/L", agegroup: "ALL", sex: "ANY", referencemin: 3.5, referencemax: 5.1, paniclow: 2.5, panichigh: 6.5 },
  { testcode: "CA", testname: "Calcium", category: "Electrolytes", unit: "mg/dL", agegroup: "ALL", sex: "ANY", referencemin: 8.4, referencemax: 10.2, paniclow: 6.5, panichigh: 13.0 },
  { testcode: "CL", testname: "Chloride", category: "Electrolytes", unit: "mEq/L", agegroup: "ALL", sex: "ANY", referencemin: 98, referencemax: 107, paniclow: 80, panichigh: 120 },
  { testcode: "HCO3", testname: "Bicarbonate", category: "Electrolytes", unit: "mEq/L", agegroup: "ALL", sex: "ANY", referencemin: 22, referencemax: 28, paniclow: 10, panichigh: 40 },

  // RENAL FUNCTION
  { testcode: "CREAT", testname: "Creatinine", category: "Renal Function", unit: "mg/dL", agegroup: "ADULT", sex: "M", referencemin: 0.7, referencemax: 1.3, panichigh: 5.0 },
  { testcode: "CREAT", testname: "Creatinine", category: "Renal Function", unit: "mg/dL", agegroup: "ADULT", sex: "F", referencemin: 0.6, referencemax: 1.1, panichigh: 5.0 },
  { testcode: "BUN", testname: "Blood Urea Nitrogen", category: "Renal Function", unit: "mg/dL", agegroup: "ALL", sex: "ANY", referencemin: 7, referencemax: 20, panichigh: 100 },
  { testcode: "EGFR", testname: "eGFR", category: "Renal Function", unit: "mL/min/1.73m²", agegroup: "ADULT", sex: "ANY", referencemin: 90, referencemax: 999, paniclow: 15 },

  // LIVER FUNCTION
  { testcode: "ALT", testname: "Alanine Aminotransferase", category: "Liver Function", unit: "U/L", agegroup: "ALL", sex: "ANY", referencemin: 5, referencemax: 45, panichigh: 1000 },
  { testcode: "AST", testname: "Aspartate Aminotransferase", category: "Liver Function", unit: "U/L", agegroup: "ALL", sex: "ANY", referencemin: 5, referencemax: 40, panichigh: 1000 },
  { testcode: "ALP", testname: "Alkaline Phosphatase", category: "Liver Function", unit: "U/L", agegroup: "ALL", sex: "ANY", referencemin: 44, referencemax: 147, panichigh: 600 },
  { testcode: "GGT", testname: "Gamma-Glutamyl Transferase", category: "Liver Function", unit: "U/L", agegroup: "ALL", sex: "ANY", referencemin: 8, referencemax: 61, panichigh: 500 },
  { testcode: "TBIL", testname: "Total Bilirubin", category: "Liver Function", unit: "mg/dL", agegroup: "ALL", sex: "ANY", referencemin: 0.2, referencemax: 1.2, panichigh: 10.0 },
  { testcode: "ALB", testname: "Albumin", category: "Liver Function", unit: "g/dL", agegroup: "ALL", sex: "ANY", referencemin: 3.5, referencemax: 5.5, paniclow: 2.0 },
  { testcode: "LDH", testname: "Lactate Dehydrogenase", category: "Liver Function", unit: "U/L", agegroup: "ALL", sex: "ANY", referencemin: 140, referencemax: 280, panichigh: 1000 },

  // GLUCOSE & LIPIDS
  { testcode: "GLU-RANDOM", testname: "Random Glucose", category: "Glucose & Lipids", unit: "mg/dL", agegroup: "ALL", sex: "ANY", referencemin: 70, referencemax: 100, paniclow: 40, panichigh: 500 },
  { testcode: "GLU-FASTING", testname: "Fasting Glucose", category: "Glucose & Lipids", unit: "mg/dL", agegroup: "ALL", sex: "ANY", referencemin: 70, referencemax: 100, paniclow: 40, panichigh: 500 },
  { testcode: "OGTT", testname: "OGTT (2h)", category: "Glucose & Lipids", unit: "mg/dL", agegroup: "ADULT", sex: "ANY", referencemin: 0, referencemax: 140, panichigh: 300 },
  { testcode: "HBA1C", testname: "Hemoglobin A1c", category: "Glucose & Lipids", unit: "%", agegroup: "ADULT", sex: "ANY", referencemin: 4.0, referencemax: 5.6, panichigh: 12.0 },
  { testcode: "TRIG", testname: "Triglycerides", category: "Glucose & Lipids", unit: "mg/dL", agegroup: "ADULT", sex: "ANY", referencemin: 0, referencemax: 150, panichigh: 1000 },
  { testcode: "HDL", testname: "HDL Cholesterol", category: "Glucose & Lipids", unit: "mg/dL", agegroup: "ADULT", sex: "ANY", referencemin: 40, referencemax: 999 },
  { testcode: "LDL", testname: "LDL Cholesterol", category: "Glucose & Lipids", unit: "mg/dL", agegroup: "ADULT", sex: "ANY", referencemin: 0, referencemax: 100 },

  // IMMUNOLOGY - INFECTION / VIRAL
  { testcode: "HBSAG", testname: "HBsAg", category: "Immunology", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Non-reactive", panictext: "Reactive" },
  { testcode: "ANTI-HCV", testname: "Anti-HCV", category: "Immunology", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Non-reactive", panictext: "Reactive" },
  { testcode: "HIV", testname: "HIV", category: "Immunology", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Non-reactive", panictext: "Reactive" },
  { testcode: "COVID-PCR", testname: "COVID PCR", category: "Immunology", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Not detected", panictext: "Detected" },
  { testcode: "VDRL", testname: "VDRL", category: "Immunology", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Non-reactive", panictext: "Reactive" },

  // AUTOIMMUNE
  { testcode: "ANA", testname: "ANA", category: "Autoimmune", unit: "titer", agegroup: "ALL", sex: "ANY", referencetext: "<1:40", panictext: "≥1:640" },
  { testcode: "ANTI-DSDNA", testname: "Anti-dsDNA", category: "Autoimmune", unit: "IU/mL", agegroup: "ALL", sex: "ANY", referencemin: 0, referencemax: 25, panichigh: 200 },
  { testcode: "ANCA", testname: "ANCA", category: "Autoimmune", unit: "U/mL", agegroup: "ALL", sex: "ANY", referencemin: 0, referencemax: 20, panichigh: 100 },
  { testcode: "CRP", testname: "C-Reactive Protein", category: "Autoimmune", unit: "mg/L", agegroup: "ALL", sex: "ANY", referencemin: 0, referencemax: 5, panichigh: 100 },

  // TORCH
  { testcode: "TOXO-IGG", testname: "Toxoplasma IgG", category: "TORCH", unit: "IU/mL", agegroup: "ALL", sex: "ANY", referencemin: 0, referencemax: 8, panictext: "Positive (pregnancy)" },
  { testcode: "RUBELLA-IGG", testname: "Rubella IgG", category: "TORCH", unit: "IU/mL", agegroup: "ALL", sex: "ANY", referencemin: 10, referencemax: 999, panictext: "Non-immune pregnancy" },
  { testcode: "CMV-IGG", testname: "CMV IgG", category: "TORCH", unit: "IU/mL", agegroup: "ALL", sex: "ANY", referencemin: 0, referencemax: 6, panictext: "Acute positive" },
  { testcode: "HSV-IGG", testname: "HSV IgG", category: "TORCH", unit: "index", agegroup: "ALL", sex: "ANY", referencemin: 0, referencemax: 0.9, panictext: "Acute positive" },

  // TUMOR MARKERS
  { testcode: "CEA", testname: "Carcinoembryonic Antigen", category: "Tumor Markers", unit: "ng/mL", agegroup: "ALL", sex: "ANY", referencemin: 0, referencemax: 3, panichigh: 20 },
  { testcode: "CA-125", testname: "Cancer Antigen 125", category: "Tumor Markers", unit: "U/mL", agegroup: "ALL", sex: "ANY", referencemin: 0, referencemax: 35, panichigh: 200 },
  { testcode: "CA-19-9", testname: "Cancer Antigen 19-9", category: "Tumor Markers", unit: "U/mL", agegroup: "ALL", sex: "ANY", referencemin: 0, referencemax: 37, panichigh: 1000 },

  // MICROBIOLOGY
  { testcode: "BLOOD-CULTURE", testname: "Blood Culture", category: "Microbiology", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "No growth", panictext: "Growth" },
  { testcode: "CSF-CULTURE", testname: "CSF Culture", category: "Microbiology", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "No growth", panictext: "Any growth" },
  { testcode: "URINE-CULTURE", testname: "Urine Culture", category: "Microbiology", unit: "CFU", agegroup: "ALL", sex: "ANY", referencetext: "<10,000 CFU", panictext: "≥100,000 CFU" },
  { testcode: "STOOL-PARA", testname: "Stool Parasites", category: "Microbiology", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Negative", panictext: "Positive" },
  { testcode: "C-DIFF", testname: "C. difficile", category: "Microbiology", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Negative", panictext: "Positive" },
  { testcode: "TB-PCR", testname: "TB PCR", category: "Microbiology", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Not detected", panictext: "Detected" },

  // HISTOPATHOLOGY / CYTOLOGY
  { testcode: "BIOPSY", testname: "Biopsy", category: "Histopathology", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Benign", panictext: "Malignancy" },
  { testcode: "FNAC", testname: "FNAC", category: "Histopathology", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Benign", panictext: "Malignant" },
  { testcode: "PAP-SMEAR", testname: "Pap Smear", category: "Histopathology", unit: "", agegroup: "ALL", sex: "F", referencetext: "NILM", panictext: "HSIL / Cancer" },
  { testcode: "CYTOLOGY", testname: "Cytology", category: "Histopathology", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Negative", panictext: "Malignant cells" },
  { testcode: "FISH", testname: "FISH", category: "Histopathology", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Negative", panictext: "Oncogenic finding" },
  { testcode: "SEQUENCING", testname: "Sequencing", category: "Histopathology", unit: "", agegroup: "ALL", sex: "ANY", referencetext: "Wild type", panictext: "Pathogenic variant" },

  // ENDOCRINOLOGY
  { testcode: "TSH", testname: "Thyroid Stimulating Hormone", category: "Endocrinology", unit: "mIU/L", agegroup: "ADULT", sex: "ANY", referencemin: 0.4, referencemax: 4.5, paniclow: 0.01, panichigh: 20.0 },
];

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceid = searchParams.get("workspaceid") || "fa9fb036-a7eb-49af-890c-54406dad139d";
    const createdby = searchParams.get("createdby") || workspaceid;

    console.log(`Seeding clinical test reference ranges for workspace: ${workspaceid}`);
    console.log(`Total references to insert: ${clinicalTestReferences.length}`);

    let inserted = 0;
    let skipped = 0;

    for (const ref of clinicalTestReferences) {
      try {
        await db.insert(testReferenceRanges).values({
          workspaceid,
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
          panictext: ref.panictext,
          createdby,
          isactive: "Y",
        });
        inserted++;
      } catch (error: any) {
        if (error.code === "23505") {
          skipped++;
        } else {
          console.error(`Error inserting ${ref.testcode} (${ref.agegroup}/${ref.sex}):`, error.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${inserted} clinical test reference ranges, skipped ${skipped} duplicates`,
      inserted,
      skipped,
      total: clinicalTestReferences.length,
    });
  } catch (error) {
    console.error("Error seeding clinical test references:", error);
    return NextResponse.json(
      { error: "Failed to seed test references", details: error },
      { status: 500 }
    );
  }
}
