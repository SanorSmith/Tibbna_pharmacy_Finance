import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";

interface TestReference {
  testcode: string;
  testname: string;
  category: string;
  agegroup: string;
  sex: string;
  unit: string;
  referencemin?: number;
  referencemax?: number;
  paniclow?: number;
  panichigh?: number;
  referencetext?: string;
  panictext?: string;
}

// Exact data from user's CSV with all panic and reference values
const exactTestReferences: TestReference[] = [
  { testcode: "ALB", testname: "Albumin", category: "Liver Function", agegroup: "ALL", sex: "ANY", unit: "g/dL", referencemin: 3.5, referencemax: 5.5, paniclow: 2.0 },
  { testcode: "ALP", testname: "Alkaline Phosphatase", category: "Liver Function", agegroup: "ALL", sex: "ANY", unit: "U/L", referencemin: 44, referencemax: 147, panichigh: 1000 },
  { testcode: "ALT", testname: "Alanine Aminotransferase", category: "Liver Function", agegroup: "ALL", sex: "ANY", unit: "U/L", referencemin: 5, referencemax: 45, panichigh: 1000 },
  { testcode: "AMA", testname: "Anti-Mitochondrial Antibody", category: "Autoimmune", agegroup: "ALL", sex: "ANY", unit: "U/mL", referencemin: 0, referencemax: 20, panichigh: 100 },
  { testcode: "ANA", testname: "ANA", category: "Autoimmune", agegroup: "ALL", sex: "ANY", unit: "titer", referencetext: "<1:40", panictext: ">=1:640" },
  { testcode: "ANCA", testname: "ANCA", category: "Autoimmune", agegroup: "ALL", sex: "ANY", unit: "U/mL", referencemin: 0, referencemax: 20, panichigh: 100 },
  { testcode: "ANTI-HBC", testname: "Anti-HBc", category: "Immunology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Non-reactive", panictext: "Reactive" },
  { testcode: "ANTI-HBS", testname: "Anti-HBs", category: "Immunology", agegroup: "ALL", sex: "ANY", unit: "mIU/mL", referencemin: 10, referencetext: ">=10 Immune" },
  { testcode: "ANTI-HCV", testname: "Anti-HCV", category: "Immunology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Non-reactive", panictext: "Reactive" },
  { testcode: "APTT", testname: "Activated Partial Thromboplastin Time", category: "Coagulation", agegroup: "ALL", sex: "ANY", unit: "seconds", referencemin: 25, referencemax: 35, panichigh: 100 },
  { testcode: "AST", testname: "Aspartate Aminotransferase", category: "Liver Function", agegroup: "ALL", sex: "ANY", unit: "U/L", referencemin: 5, referencemax: 40, panichigh: 1000 },
  { testcode: "B12", testname: "Vitamin B12", category: "Anemia Workup", agegroup: "ADULT", sex: "ANY", unit: "pg/mL", referencemin: 200, referencemax: 900, paniclow: 100 },
  { testcode: "B2GP-ACL", testname: "Beta-2 Glycoprotein & Anticardiolipin", category: "Autoimmune", agegroup: "ALL", sex: "ANY", unit: "U/mL", referencemin: 0, referencemax: 20, panichigh: 100 },
  { testcode: "BACT", testname: "Blood Culture", category: "Microbiology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "No growth", panictext: "Growth" },
  { testcode: "BASO", testname: "Basophils", category: "Hematology", agegroup: "ALL", sex: "ANY", unit: "%", referencemin: 0.5, referencemax: 1.0, panichigh: 5.0 },
  { testcode: "BILI", testname: "Total Bilirubin", category: "Liver Function", agegroup: "ALL", sex: "ANY", unit: "mg/dL", referencemin: 0.2, referencemax: 1.2, panichigh: 10 },
  { testcode: "BIOPSY", testname: "Biopsy", category: "Histopathology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Benign", panictext: "Malignancy" },
  { testcode: "BLAST", testname: "Blasts", category: "Hematology", agegroup: "ALL", sex: "ANY", unit: "%", referencemin: 0, referencemax: 5, panichigh: 20 },
  { testcode: "BM-EXAM", testname: "Bone Marrow Examination", category: "Hematology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Normal", panictext: "Malignancy" },
  { testcode: "BT", testname: "Bleeding Time", category: "Coagulation", agegroup: "ALL", sex: "ANY", unit: "minutes", referencemin: 2, referencemax: 7, panichigh: 15 },
  { testcode: "C-DIFF", testname: "C. difficile", category: "Microbiology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Negative", panictext: "Positive" },
  { testcode: "CA", testname: "Calcium", category: "Electrolytes", agegroup: "ALL", sex: "ANY", unit: "mg/dL", referencemin: 8.4, referencemax: 10.2, paniclow: 6.5, panichigh: 13 },
  { testcode: "CA125", testname: "Cancer Antigen 125", category: "Tumor Markers", agegroup: "ALL", sex: "ANY", unit: "U/mL", referencemin: 0, referencemax: 35, panichigh: 200 },
  { testcode: "CA199", testname: "Cancer Antigen 19-9", category: "Tumor Markers", agegroup: "ALL", sex: "ANY", unit: "U/mL", referencemin: 0, referencemax: 37, panichigh: 1000 },
  { testcode: "CBC", testname: "Complete Blood Count", category: "Hematology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "See components" },
  { testcode: "CCP", testname: "Anti-CCP", category: "Autoimmune", agegroup: "ALL", sex: "ANY", unit: "U/mL", referencemin: 0, referencemax: 20, panichigh: 100 },
  { testcode: "CEA", testname: "Carcinoembryonic Antigen", category: "Tumor Markers", agegroup: "ALL", sex: "ANY", unit: "ng/mL", referencemin: 0, referencemax: 3, panichigh: 20 },
  { testcode: "CL", testname: "Chloride", category: "Electrolytes", agegroup: "ALL", sex: "ANY", unit: "mEq/L", referencemin: 98, referencemax: 107, paniclow: 80, panichigh: 120 },
  { testcode: "CMV", testname: "CMV IgG", category: "TORCH", agegroup: "ALL", sex: "ANY", unit: "IU/mL", referencemin: 0, referencemax: 6, panictext: "Acute infection" },
  { testcode: "COVID-AB", testname: "COVID-19 Antibody", category: "Immunology", agegroup: "ALL", sex: "ANY", unit: "AU/mL", referencetext: "Negative", panictext: "Positive" },
  { testcode: "CREAT", testname: "Creatinine", category: "Renal Function", agegroup: "ADULT", sex: "F", unit: "mg/dL", referencemin: 0.6, referencemax: 1.1, panichigh: 5 },
  { testcode: "CREAT", testname: "Creatinine", category: "Renal Function", agegroup: "ADULT", sex: "M", unit: "mg/dL", referencemin: 0.7, referencemax: 1.3, panichigh: 5 },
  { testcode: "CRP", testname: "C-Reactive Protein", category: "Autoimmune", agegroup: "ALL", sex: "ANY", unit: "mg/L", referencemin: 0, referencemax: 5, panichigh: 100 },
  { testcode: "CT", testname: "Clotting Time", category: "Coagulation", agegroup: "ALL", sex: "ANY", unit: "minutes", referencemin: 5, referencemax: 10, panichigh: 20 },
  { testcode: "DSDNA", testname: "Anti-dsDNA", category: "Autoimmune", agegroup: "ALL", sex: "ANY", unit: "IU/mL", referencemin: 0, referencemax: 25, panichigh: 200 },
  { testcode: "EGFR", testname: "eGFR", category: "Renal Function", agegroup: "ADULT", sex: "ANY", unit: "mL/min/1.73m2", referencemin: 90, referencemax: 999, paniclow: 15 },
  { testcode: "EOS", testname: "Eosinophils", category: "Hematology", agegroup: "ALL", sex: "ANY", unit: "%", referencemin: 1, referencemax: 4, panichigh: 30 },
  { testcode: "ESR", testname: "Erythrocyte Sedimentation Rate", category: "Hematology", agegroup: "ADULT", sex: "F", unit: "mm/hr", referencemin: 0, referencemax: 20, panichigh: 100 },
  { testcode: "ESR", testname: "Erythrocyte Sedimentation Rate", category: "Hematology", agegroup: "ADULT", sex: "M", unit: "mm/hr", referencemin: 0, referencemax: 15, panichigh: 100 },
  { testcode: "FERR", testname: "Ferritin", category: "Anemia Workup", agegroup: "ADULT", sex: "F", unit: "ng/mL", referencemin: 15, referencemax: 150, panichigh: 3000 },
  { testcode: "FERR", testname: "Ferritin", category: "Anemia Workup", agegroup: "ADULT", sex: "M", unit: "ng/mL", referencemin: 30, referencemax: 400, panichigh: 3000 },
  { testcode: "FISH", testname: "FISH", category: "Histopathology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Negative", panictext: "Oncogenic finding" },
  { testcode: "FNAC", testname: "FNAC", category: "Histopathology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Benign", panictext: "Malignant" },
  { testcode: "FOLATE", testname: "Folate", category: "Anemia Workup", agegroup: "ADULT", sex: "ANY", unit: "ng/mL", referencemin: 2.7, referencemax: 17, paniclow: 1 },
  { testcode: "FPG", testname: "Fasting Plasma Glucose", category: "Glucose & Lipids", agegroup: "ALL", sex: "ANY", unit: "mg/dL", referencemin: 70, referencemax: 100, paniclow: 40, panichigh: 500 },
  { testcode: "FUNG", testname: "Fungal Culture", category: "Microbiology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "No growth", panictext: "Growth" },
  { testcode: "GGT", testname: "Gamma-Glutamyl Transferase", category: "Liver Function", agegroup: "ALL", sex: "ANY", unit: "U/L", referencemin: 8, referencemax: 61, panichigh: 1000 },
  { testcode: "GLU", testname: "Glucose (Fasting)", category: "Glucose & Lipids", agegroup: "ALL", sex: "ANY", unit: "mg/dL", referencemin: 70, referencemax: 100, paniclow: 40, panichigh: 500 },
  { testcode: "HBA1C", testname: "Hemoglobin A1c", category: "Glucose & Lipids", agegroup: "ADULT", sex: "ANY", unit: "%", referencemin: 4, referencemax: 5.6, panichigh: 12 },
  { testcode: "HBSAG", testname: "HBsAg", category: "Immunology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Non-reactive", panictext: "Reactive" },
  { testcode: "HCO3", testname: "Bicarbonate", category: "Electrolytes", agegroup: "ALL", sex: "ANY", unit: "mEq/L", referencemin: 22, referencemax: 28, paniclow: 10, panichigh: 40 },
  { testcode: "HCT", testname: "Hematocrit", category: "Hematology", agegroup: "ADULT", sex: "F", unit: "%", referencemin: 36, referencemax: 46, paniclow: 21, panichigh: 60 },
  { testcode: "HCT", testname: "Hematocrit", category: "Hematology", agegroup: "ADULT", sex: "M", unit: "%", referencemin: 40, referencemax: 50, paniclow: 21, panichigh: 60 },
  { testcode: "HGB", testname: "Hemoglobin", category: "Hematology", agegroup: "ADULT", sex: "F", unit: "g/dL", referencemin: 11.5, referencemax: 15.5, paniclow: 7, panichigh: 20 },
  { testcode: "HGB", testname: "Hemoglobin", category: "Hematology", agegroup: "ADULT", sex: "M", unit: "g/dL", referencemin: 13, referencemax: 17, paniclow: 7, panichigh: 20 },
  { testcode: "HIV", testname: "HIV", category: "Immunology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Non-reactive", panictext: "Reactive" },
  { testcode: "INR", testname: "International Normalized Ratio", category: "Coagulation", agegroup: "ALL", sex: "ANY", unit: "", referencemin: 0.8, referencemax: 1.2, panichigh: 5 },
  { testcode: "IRON", testname: "Serum Iron", category: "Anemia Workup", agegroup: "ADULT", sex: "ANY", unit: "µg/dL", referencemin: 60, referencemax: 170, paniclow: 20 },
  { testcode: "K", testname: "Potassium", category: "Electrolytes", agegroup: "ALL", sex: "ANY", unit: "mEq/L", referencemin: 3.5, referencemax: 5.1, paniclow: 2.5, panichigh: 6.5 },
  { testcode: "LDH", testname: "Lactate Dehydrogenase", category: "Liver Function", agegroup: "ALL", sex: "ANY", unit: "U/L", referencemin: 140, referencemax: 280, panichigh: 2000 },
  { testcode: "NA", testname: "Sodium", category: "Electrolytes", agegroup: "ALL", sex: "ANY", unit: "mEq/L", referencemin: 135, referencemax: 145, paniclow: 120, panichigh: 160 },
  { testcode: "PLT", testname: "Platelets", category: "Hematology", agegroup: "ALL", sex: "ANY", unit: "cells/µL", referencemin: 150000, referencemax: 450000, paniclow: 20000, panichigh: 1000000 },
  { testcode: "PT", testname: "Prothrombin Time", category: "Coagulation", agegroup: "ALL", sex: "ANY", unit: "seconds", referencemin: 11, referencemax: 13.5, panichigh: 25 },
  { testcode: "UREA", testname: "Blood Urea Nitrogen", category: "Renal Function", agegroup: "ALL", sex: "ANY", unit: "mg/dL", referencemin: 7, referencemax: 20, panichigh: 100 },
  { testcode: "WBC", testname: "White Blood Cells", category: "Hematology", agegroup: "ADULT", sex: "ANY", unit: "cells/µL", referencemin: 4000, referencemax: 11000, paniclow: 2000, panichigh: 30000 },
  { testcode: "ZN", testname: "Ziehl-Neelsen Stain", category: "Histopathology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Negative", panictext: "Positive" },

  // Additional tests from previous comprehensive list (with NEO/PED age groups)
  { testcode: "HGB", testname: "Hemoglobin", category: "Hematology", agegroup: "NEO", sex: "ANY", unit: "g/dL", referencemin: 14.0, referencemax: 24.0, paniclow: 10.0, panichigh: 25.0 },
  { testcode: "HGB", testname: "Hemoglobin", category: "Hematology", agegroup: "PED", sex: "ANY", unit: "g/dL", referencemin: 11.0, referencemax: 14.5, paniclow: 7.0, panichigh: 20.0 },
  { testcode: "WBC", testname: "White Blood Cells", category: "Hematology", agegroup: "NEO", sex: "ANY", unit: "cells/µL", referencemin: 9000, referencemax: 30000, paniclow: 5000, panichigh: 50000 },
  { testcode: "WBC", testname: "White Blood Cells", category: "Hematology", agegroup: "PED", sex: "ANY", unit: "cells/µL", referencemin: 5000, referencemax: 15000, paniclow: 2000, panichigh: 30000 },
  
  // CBC INDICES
  { testcode: "MCV", testname: "Mean Corpuscular Volume", category: "Hematology", agegroup: "ALL", sex: "ANY", unit: "fL", referencemin: 80.0, referencemax: 100.0, paniclow: 60.0, panichigh: 120.0 },
  { testcode: "MCH", testname: "Mean Corpuscular Hemoglobin", category: "Hematology", agegroup: "ALL", sex: "ANY", unit: "pg", referencemin: 27.0, referencemax: 33.0, paniclow: 20.0, panichigh: 40.0 },
  { testcode: "MCHC", testname: "Mean Corpuscular Hemoglobin Concentration", category: "Hematology", agegroup: "ALL", sex: "ANY", unit: "g/dL", referencemin: 32.0, referencemax: 36.0, paniclow: 28.0, panichigh: 40.0 },
  
  // DIFFERENTIAL COUNT
  { testcode: "NEUT", testname: "Neutrophils", category: "Hematology", agegroup: "ALL", sex: "ANY", unit: "%", referencemin: 40.0, referencemax: 70.0, paniclow: 10.0, panichigh: 90.0 },
  { testcode: "LYMPH", testname: "Lymphocytes", category: "Hematology", agegroup: "ALL", sex: "ANY", unit: "%", referencemin: 20.0, referencemax: 40.0, paniclow: 5.0, panichigh: 80.0 },
  { testcode: "MONO", testname: "Monocytes", category: "Hematology", agegroup: "ALL", sex: "ANY", unit: "%", referencemin: 2.0, referencemax: 8.0, panichigh: 20.0 },
  
  { testcode: "RBC", testname: "Red Blood Cells", category: "Hematology", agegroup: "ADULT", sex: "M", unit: "million/µL", referencemin: 4.4, referencemax: 5.9, paniclow: 2.5, panichigh: 7.0 },
  { testcode: "RBC", testname: "Red Blood Cells", category: "Hematology", agegroup: "ADULT", sex: "F", unit: "million/µL", referencemin: 3.9, referencemax: 5.1, paniclow: 2.5, panichigh: 7.0 },
  
  { testcode: "RETIC", testname: "Reticulocytes", category: "Hematology", agegroup: "ALL", sex: "ANY", unit: "%", referencemin: 0.5, referencemax: 2.5, paniclow: 0.1, panichigh: 10.0 },
  
  // BLOOD SMEAR
  { testcode: "SICKLE", testname: "Sickle Cells", category: "Hematology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Absent", panictext: "Present" },
  { testcode: "PARA", testname: "Blood Parasites", category: "Hematology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Absent", panictext: "Present" },
  { testcode: "MALARIA", testname: "Malaria Parasite", category: "Hematology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Negative", panictext: "Positive" },
  { testcode: "MICROF", testname: "Microfilaria", category: "Hematology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Negative", panictext: "Positive" },
  { testcode: "IRON-HB", testname: "Iron Studies & Hb Electrophoresis", category: "Hematology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Normal pattern" },
  
  // LIPIDS
  { testcode: "TRIG", testname: "Triglycerides", category: "Glucose & Lipids", agegroup: "ADULT", sex: "ANY", unit: "mg/dL", referencemin: 0, referencemax: 150, panichigh: 1000 },
  { testcode: "HDL", testname: "HDL Cholesterol", category: "Glucose & Lipids", agegroup: "ADULT", sex: "ANY", unit: "mg/dL", referencemin: 40, referencemax: 999, paniclow: 20 },
  { testcode: "LDL", testname: "LDL Cholesterol", category: "Glucose & Lipids", agegroup: "ADULT", sex: "ANY", unit: "mg/dL", referencemin: 0, referencemax: 100, panichigh: 190 },
  { testcode: "VLDL", testname: "VLDL Cholesterol", category: "Glucose & Lipids", agegroup: "ADULT", sex: "ANY", unit: "mg/dL", referencemin: 2, referencemax: 30, panichigh: 50 },
  { testcode: "OGTT", testname: "OGTT (2h)", category: "Glucose & Lipids", agegroup: "ADULT", sex: "ANY", unit: "mg/dL", referencemin: 0, referencemax: 140, panichigh: 300 },
  
  // URINALYSIS
  { testcode: "URIC", testname: "Uric Acid", category: "Electrolytes", agegroup: "ADULT", sex: "M", unit: "mg/dL", referencemin: 3.5, referencemax: 7.2, panichigh: 12.0 },
  { testcode: "URIC", testname: "Uric Acid", category: "Electrolytes", agegroup: "ADULT", sex: "F", unit: "mg/dL", referencemin: 2.6, referencemax: 6.0, panichigh: 12.0 },
  { testcode: "U-PROT", testname: "Urine Protein", category: "Urinalysis", agegroup: "ALL", sex: "ANY", unit: "mg/dL", referencemin: 0, referencemax: 10, referencetext: "Negative", panichigh: 300, panictext: "Severe proteinuria" },
  { testcode: "U-GLU", testname: "Urine Glucose", category: "Urinalysis", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Negative", panictext: "Positive" },
  { testcode: "U-KET", testname: "Urine Ketones", category: "Urinalysis", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Negative", panictext: "Large" },
  { testcode: "U-BLOOD", testname: "Urine Blood", category: "Urinalysis", agegroup: "ALL", sex: "ANY", unit: "cells/HPF", referencemin: 0, referencemax: 3, panichigh: 50, panictext: "Gross hematuria" },
  { testcode: "U-BILI", testname: "Urine Bilirubin", category: "Urinalysis", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Negative", panictext: "Positive" },
  { testcode: "U-NIT-LE", testname: "Urine Nitrite & Leukocyte Esterase", category: "Urinalysis", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Negative", panictext: "Both positive" },
  { testcode: "U-24H-CR", testname: "24-Hour Urine Creatinine Clearance", category: "Urinalysis", agegroup: "ALL", sex: "ANY", unit: "mL/min", referencemin: 90, referencemax: 140, paniclow: 15 },
  
  // ADDITIONAL AUTOIMMUNE
  { testcode: "RF", testname: "Rheumatoid Factor", category: "Autoimmune", agegroup: "ALL", sex: "ANY", unit: "IU/mL", referencemin: 0, referencemax: 14, panichigh: 100 },
  { testcode: "SMITH", testname: "Anti-Smith", category: "Autoimmune", agegroup: "ALL", sex: "ANY", unit: "U/mL", referencemin: 0, referencemax: 20, panichigh: 100 },
  { testcode: "RNP", testname: "Anti-RNP", category: "Autoimmune", agegroup: "ALL", sex: "ANY", unit: "U/mL", referencemin: 0, referencemax: 20, panichigh: 100 },
  { testcode: "SSA-SSB", testname: "Anti-SSA/SSB", category: "Autoimmune", agegroup: "ALL", sex: "ANY", unit: "U/mL", referencemin: 0, referencemax: 20, panichigh: 100 },
  { testcode: "TPO-TG", testname: "Anti-TPO & Thyroglobulin", category: "Autoimmune", agegroup: "ALL", sex: "ANY", unit: "IU/mL", referencemin: 0, referencemax: 35, panichigh: 200 },
  
  // TORCH
  { testcode: "TOXO", testname: "Toxoplasma IgG", category: "TORCH", agegroup: "ALL", sex: "ANY", unit: "IU/mL", referencemin: 0, referencemax: 8, panictext: "Positive (pregnancy)" },
  { testcode: "RUBELLA", testname: "Rubella IgG", category: "TORCH", agegroup: "ALL", sex: "ANY", unit: "IU/mL", referencemin: 10, referencemax: 999, panictext: "Non-immune pregnancy" },
  { testcode: "HERPES", testname: "HSV IgG", category: "TORCH", agegroup: "ALL", sex: "ANY", unit: "index", referencemin: 0, referencemax: 0.9, panictext: "Acute positive" },
  
  // MICROBIOLOGY
  { testcode: "UTI", testname: "Urine Culture", category: "Microbiology", agegroup: "ALL", sex: "ANY", unit: "CFU/mL", referencetext: "<10,000 CFU", panictext: ">=100,000 CFU" },
  { testcode: "SPUTUM", testname: "Sputum Culture", category: "Microbiology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Normal flora", panictext: "Pathogenic organism" },
  { testcode: "PARA-ST", testname: "Stool Parasites", category: "Microbiology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Negative", panictext: "Positive" },
  { testcode: "OB", testname: "Occult Blood", category: "Microbiology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Negative", panictext: "Positive" },
  { testcode: "PCR", testname: "PCR/NAAT", category: "Microbiology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Not Detected", panictext: "Detected" },
  
  // HISTOPATHOLOGY
  { testcode: "PAP", testname: "Pap Smear", category: "Histopathology", agegroup: "ALL", sex: "F", unit: "", referencetext: "NILM", panictext: "HSIL / Cancer" },
  { testcode: "PAS", testname: "PAS Stain", category: "Histopathology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Depends on indication" },
  { testcode: "SILVER", testname: "Silver Stain", category: "Histopathology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Depends on indication" },
  { testcode: "IHC", testname: "Immunohistochemistry", category: "Histopathology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Depends on marker" },
  { testcode: "PCR-MOL", testname: "PCR Molecular", category: "Histopathology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Not Detected", panictext: "Detected" },
  { testcode: "SEQ", testname: "Genetic Sequencing", category: "Histopathology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Wild type", panictext: "Pathogenic variant" },
  { testcode: "URINE-CYTO", testname: "Urine Cytology", category: "Histopathology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Negative for malignancy", panictext: "Malignant cells" },
  { testcode: "SPUTUM-CYTO", testname: "Sputum Cytology", category: "Histopathology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Negative for malignancy", panictext: "Malignant cells" },
  
  // ENDOCRINOLOGY
  { testcode: "TSH", testname: "Thyroid Stimulating Hormone", category: "Endocrinology", agegroup: "ADULT", sex: "ANY", unit: "mIU/L", referencemin: 0.4, referencemax: 4.5, paniclow: 0.01, panichigh: 20.0 },
  
  // ADDITIONAL IMMUNOLOGY
  { testcode: "VDRL", testname: "VDRL", category: "Immunology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Non-reactive", panictext: "Reactive" },
  { testcode: "TPHA", testname: "TPHA", category: "Immunology", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Non-reactive", panictext: "Reactive" },
  
  // PROTEIN
  { testcode: "PROT-ELEC", testname: "Protein Electrophoresis", category: "Liver Function", agegroup: "ALL", sex: "ANY", unit: "", referencetext: "Normal pattern" },
];

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceid = searchParams.get("workspaceid") || "fa9fb036-a7eb-49af-890c-54406dad139d";
    const createdby = searchParams.get("createdby") || workspaceid;

    console.log(`Seeding exact test reference ranges for workspace: ${workspaceid}`);
    console.log(`Total references to insert: ${exactTestReferences.length}`);

    let inserted = 0;
    let skipped = 0;

    for (const ref of exactTestReferences) {
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
      message: `Successfully seeded ${inserted} exact test reference ranges, skipped ${skipped} duplicates`,
      inserted,
      skipped,
      total: exactTestReferences.length,
    });
  } catch (error) {
    console.error("Error seeding exact test references:", error);
    return NextResponse.json(
      { error: "Failed to seed test references", details: error },
      { status: 500 }
    );
  }
}
