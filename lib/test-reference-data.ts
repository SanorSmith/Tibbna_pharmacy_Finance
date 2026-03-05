/**
 * Test Reference Data
 * Contains units and reference ranges for all 104 laboratory tests
 */

export interface TestReferenceData {
  testcode: string;
  testname: string;
  unit: string;
  referencemin?: number;
  referencemax?: number;
  referencerange?: string;
  category: string;
}

export const TEST_REFERENCE_DATA: Record<string, TestReferenceData> = {
  // HEMATOLOGY - CBC Panel (8 tests)
  "RBC": {
    testcode: "RBC",
    testname: "Red Blood Cells",
    unit: "million cells/µL",
    referencemin: 4.5,
    referencemax: 5.5,
    referencerange: "4.5-5.5 million cells/µL",
    category: "Hematology"
  },
  "WBC": {
    testcode: "WBC",
    testname: "White Blood Cells",
    unit: "cells/µL",
    referencemin: 4000,
    referencemax: 11000,
    referencerange: "4,000-11,000 cells/µL",
    category: "Hematology"
  },
  "HGB": {
    testcode: "HGB",
    testname: "Hemoglobin",
    unit: "g/dL",
    referencemin: 13.5,
    referencemax: 17.5,
    referencerange: "13.5-17.5 g/dL (M), 12.0-15.5 g/dL (F)",
    category: "Hematology"
  },
  "HCT": {
    testcode: "HCT",
    testname: "Hematocrit",
    unit: "%",
    referencemin: 38.8,
    referencemax: 50.0,
    referencerange: "38.8-50.0% (M), 34.9-44.5% (F)",
    category: "Hematology"
  },
  "PLT": {
    testcode: "PLT",
    testname: "Platelets",
    unit: "cells/µL",
    referencemin: 150000,
    referencemax: 400000,
    referencerange: "150,000-400,000 cells/µL",
    category: "Hematology"
  },
  "ESR": {
    testcode: "ESR",
    testname: "Erythrocyte Sedimentation Rate",
    unit: "mm/hr",
    referencemin: 0,
    referencemax: 20,
    referencerange: "0-20 mm/hr (M), 0-30 mm/hr (F)",
    category: "Hematology"
  },
  "PT-APTT": {
    testcode: "PT-APTT",
    testname: "PT/aPTT",
    unit: "seconds",
    referencemin: 11,
    referencemax: 13.5,
    referencerange: "PT: 11-13.5 sec, aPTT: 25-35 sec",
    category: "Hematology"
  },
  "RETIC": {
    testcode: "RETIC",
    testname: "Reticulocyte Count",
    unit: "%",
    referencemin: 0.5,
    referencemax: 2.5,
    referencerange: "0.5-2.5%",
    category: "Hematology"
  },

  // HEMATOLOGY - Blood Smear (3 tests)
  "SICKLE": {
    testcode: "SICKLE",
    testname: "Sickle Cells",
    unit: "Present/Absent",
    referencerange: "Absent",
    category: "Hematology"
  },
  "BLAST": {
    testcode: "BLAST",
    testname: "Blasts",
    unit: "%",
    referencemin: 0,
    referencemax: 0,
    referencerange: "0% (Absent)",
    category: "Hematology"
  },
  "PARA": {
    testcode: "PARA",
    testname: "Parasites",
    unit: "Present/Absent",
    referencerange: "Absent",
    category: "Hematology"
  },

  // HEMATOLOGY - Anemia Workup (8 tests)
  "FERR": {
    testcode: "FERR",
    testname: "Ferritin",
    unit: "ng/mL",
    referencemin: 30,
    referencemax: 400,
    referencerange: "30-400 ng/mL (M), 15-150 ng/mL (F)",
    category: "Hematology"
  },
  "IRON": {
    testcode: "IRON",
    testname: "Iron",
    unit: "µg/dL",
    referencemin: 60,
    referencemax: 170,
    referencerange: "60-170 µg/dL",
    category: "Hematology"
  },
  "B12": {
    testcode: "B12",
    testname: "Vitamin B12",
    unit: "pg/mL",
    referencemin: 200,
    referencemax: 900,
    referencerange: "200-900 pg/mL",
    category: "Hematology"
  },
  "FOLATE": {
    testcode: "FOLATE",
    testname: "Folate",
    unit: "ng/mL",
    referencemin: 2.7,
    referencemax: 17.0,
    referencerange: "2.7-17.0 ng/mL",
    category: "Hematology"
  },
  "BT": {
    testcode: "BT",
    testname: "Bleeding Time",
    unit: "minutes",
    referencemin: 2,
    referencemax: 7,
    referencerange: "2-7 minutes",
    category: "Hematology"
  },
  "CT": {
    testcode: "CT",
    testname: "Clotting Time",
    unit: "minutes",
    referencemin: 5,
    referencemax: 10,
    referencerange: "5-10 minutes",
    category: "Hematology"
  },
  "PT-INR": {
    testcode: "PT-INR",
    testname: "Prothrombin Time & INR",
    unit: "seconds / INR",
    referencemin: 11,
    referencemax: 13.5,
    referencerange: "PT: 11-13.5 sec, INR: 0.8-1.2",
    category: "Hematology"
  },
  "APTT": {
    testcode: "APTT",
    testname: "Activated Partial Thromboplastin Time",
    unit: "seconds",
    referencemin: 25,
    referencemax: 35,
    referencerange: "25-35 seconds",
    category: "Hematology"
  },

  // HEMATOLOGY - Specialized (4 tests)
  "MALARIA": {
    testcode: "MALARIA",
    testname: "Malaria Parasite",
    unit: "Present/Absent",
    referencerange: "Negative",
    category: "Hematology"
  },
  "MICROF": {
    testcode: "MICROF",
    testname: "Microfilaria",
    unit: "Present/Absent",
    referencerange: "Negative",
    category: "Hematology"
  },
  "IRON-HB": {
    testcode: "IRON-HB",
    testname: "Iron Studies & Hb Electrophoresis",
    unit: "Various",
    referencerange: "Normal pattern",
    category: "Hematology"
  },
  "BM-EXAM": {
    testcode: "BM-EXAM",
    testname: "Bone Marrow Examination",
    unit: "Descriptive",
    referencerange: "Normal cellularity and maturation",
    category: "Hematology"
  },

  // BIOCHEMISTRY - Liver Function (8 tests)
  "ALT": {
    testcode: "ALT",
    testname: "Alanine Aminotransferase",
    unit: "U/L",
    referencemin: 7,
    referencemax: 56,
    referencerange: "7-56 U/L",
    category: "Biochemistry"
  },
  "AST": {
    testcode: "AST",
    testname: "Aspartate Aminotransferase",
    unit: "U/L",
    referencemin: 10,
    referencemax: 40,
    referencerange: "10-40 U/L",
    category: "Biochemistry"
  },
  "ALP": {
    testcode: "ALP",
    testname: "Alkaline Phosphatase",
    unit: "U/L",
    referencemin: 44,
    referencemax: 147,
    referencerange: "44-147 U/L",
    category: "Biochemistry"
  },
  "GGT": {
    testcode: "GGT",
    testname: "Gamma-Glutamyl Transferase",
    unit: "U/L",
    referencemin: 8,
    referencemax: 61,
    referencerange: "8-61 U/L",
    category: "Biochemistry"
  },
  "LDH": {
    testcode: "LDH",
    testname: "Lactate Dehydrogenase",
    unit: "U/L",
    referencemin: 140,
    referencemax: 280,
    referencerange: "140-280 U/L",
    category: "Biochemistry"
  },
  "BILI": {
    testcode: "BILI",
    testname: "Bilirubin (Total & Direct)",
    unit: "mg/dL",
    referencemin: 0.1,
    referencemax: 1.2,
    referencerange: "Total: 0.1-1.2 mg/dL, Direct: 0-0.3 mg/dL",
    category: "Biochemistry"
  },
  "ALB": {
    testcode: "ALB",
    testname: "Albumin",
    unit: "g/dL",
    referencemin: 3.5,
    referencemax: 5.5,
    referencerange: "3.5-5.5 g/dL",
    category: "Biochemistry"
  },
  "PT-INR-LFT": {
    testcode: "PT-INR-LFT",
    testname: "PT & INR",
    unit: "seconds / INR",
    referencemin: 11,
    referencemax: 13.5,
    referencerange: "PT: 11-13.5 sec, INR: 0.8-1.2",
    category: "Biochemistry"
  },

  // BIOCHEMISTRY - Kidney Function (3 tests)
  "CREAT": {
    testcode: "CREAT",
    testname: "Creatinine",
    unit: "mg/dL",
    referencemin: 0.7,
    referencemax: 1.3,
    referencerange: "0.7-1.3 mg/dL (M), 0.6-1.1 mg/dL (F)",
    category: "Biochemistry"
  },
  "UREA": {
    testcode: "UREA",
    testname: "Urea/BUN",
    unit: "mg/dL",
    referencemin: 7,
    referencemax: 20,
    referencerange: "7-20 mg/dL",
    category: "Biochemistry"
  },
  "EGFR": {
    testcode: "EGFR",
    testname: "Estimated GFR",
    unit: "mL/min/1.73m²",
    referencemin: 90,
    referencemax: 120,
    referencerange: ">90 mL/min/1.73m²",
    category: "Biochemistry"
  },

  // BIOCHEMISTRY - Urinalysis (7 tests)
  "U-PROT": {
    testcode: "U-PROT",
    testname: "Urine Protein",
    unit: "mg/dL",
    referencemin: 0,
    referencemax: 10,
    referencerange: "0-10 mg/dL (Negative)",
    category: "Biochemistry"
  },
  "U-GLU": {
    testcode: "U-GLU",
    testname: "Urine Glucose",
    unit: "mg/dL",
    referencemin: 0,
    referencemax: 0,
    referencerange: "Negative",
    category: "Biochemistry"
  },
  "U-KET": {
    testcode: "U-KET",
    testname: "Urine Ketones",
    unit: "mg/dL",
    referencemin: 0,
    referencemax: 0,
    referencerange: "Negative",
    category: "Biochemistry"
  },
  "U-BLOOD": {
    testcode: "U-BLOOD",
    testname: "Urine Blood",
    unit: "cells/HPF",
    referencemin: 0,
    referencemax: 3,
    referencerange: "0-3 cells/HPF",
    category: "Biochemistry"
  },
  "U-BILI": {
    testcode: "U-BILI",
    testname: "Urine Bilirubin",
    unit: "mg/dL",
    referencemin: 0,
    referencemax: 0,
    referencerange: "Negative",
    category: "Biochemistry"
  },
  "U-NIT-LE": {
    testcode: "U-NIT-LE",
    testname: "Urine Nitrite & Leukocyte Esterase",
    unit: "Present/Absent",
    referencerange: "Negative",
    category: "Biochemistry"
  },
  "U-24H-CR": {
    testcode: "U-24H-CR",
    testname: "24-Hour Urine Creatinine Clearance",
    unit: "mL/min",
    referencemin: 90,
    referencemax: 140,
    referencerange: "90-140 mL/min",
    category: "Biochemistry"
  },

  // BIOCHEMISTRY - Lipid & Glucose (8 tests)
  "HDL": {
    testcode: "HDL",
    testname: "HDL Cholesterol",
    unit: "mg/dL",
    referencemin: 40,
    referencemax: 60,
    referencerange: ">40 mg/dL (M), >50 mg/dL (F)",
    category: "Biochemistry"
  },
  "LDL": {
    testcode: "LDL",
    testname: "LDL Cholesterol",
    unit: "mg/dL",
    referencemin: 0,
    referencemax: 100,
    referencerange: "<100 mg/dL (Optimal)",
    category: "Biochemistry"
  },
  "TRIG": {
    testcode: "TRIG",
    testname: "Triglycerides",
    unit: "mg/dL",
    referencemin: 0,
    referencemax: 150,
    referencerange: "<150 mg/dL",
    category: "Biochemistry"
  },
  "VLDL": {
    testcode: "VLDL",
    testname: "VLDL Cholesterol",
    unit: "mg/dL",
    referencemin: 2,
    referencemax: 30,
    referencerange: "2-30 mg/dL",
    category: "Biochemistry"
  },
  "GLU": {
    testcode: "GLU",
    testname: "Glucose",
    unit: "mg/dL",
    referencemin: 70,
    referencemax: 100,
    referencerange: "70-100 mg/dL (Fasting)",
    category: "Biochemistry"
  },
  "HBA1C": {
    testcode: "HBA1C",
    testname: "Hemoglobin A1c",
    unit: "%",
    referencemin: 4.0,
    referencemax: 5.6,
    referencerange: "4.0-5.6% (Normal)",
    category: "Biochemistry"
  },
  "FPG": {
    testcode: "FPG",
    testname: "Fasting Plasma Glucose",
    unit: "mg/dL",
    referencemin: 70,
    referencemax: 100,
    referencerange: "70-100 mg/dL",
    category: "Biochemistry"
  },
  "OGTT": {
    testcode: "OGTT",
    testname: "Oral Glucose Tolerance Test",
    unit: "mg/dL",
    referencemin: 0,
    referencemax: 140,
    referencerange: "<140 mg/dL (2-hour)",
    category: "Biochemistry"
  },

  // BIOCHEMISTRY - Electrolytes (7 tests)
  "NA": {
    testcode: "NA",
    testname: "Sodium",
    unit: "mEq/L",
    referencemin: 136,
    referencemax: 145,
    referencerange: "136-145 mEq/L",
    category: "Biochemistry"
  },
  "K": {
    testcode: "K",
    testname: "Potassium",
    unit: "mEq/L",
    referencemin: 3.5,
    referencemax: 5.0,
    referencerange: "3.5-5.0 mEq/L",
    category: "Biochemistry"
  },
  "CA": {
    testcode: "CA",
    testname: "Calcium",
    unit: "mg/dL",
    referencemin: 8.5,
    referencemax: 10.5,
    referencerange: "8.5-10.5 mg/dL",
    category: "Biochemistry"
  },
  "CL": {
    testcode: "CL",
    testname: "Chloride",
    unit: "mEq/L",
    referencemin: 98,
    referencemax: 107,
    referencerange: "98-107 mEq/L",
    category: "Biochemistry"
  },
  "HCO3": {
    testcode: "HCO3",
    testname: "Bicarbonate",
    unit: "mEq/L",
    referencemin: 22,
    referencemax: 28,
    referencerange: "22-28 mEq/L",
    category: "Biochemistry"
  },
  "URIC": {
    testcode: "URIC",
    testname: "Uric Acid",
    unit: "mg/dL",
    referencemin: 3.5,
    referencemax: 7.2,
    referencerange: "3.5-7.2 mg/dL (M), 2.6-6.0 mg/dL (F)",
    category: "Biochemistry"
  },
  "PROT-ELEC": {
    testcode: "PROT-ELEC",
    testname: "Protein Electrophoresis",
    unit: "g/dL",
    referencerange: "Normal pattern",
    category: "Biochemistry"
  },

  // MICROBIOLOGY (8 tests)
  "BACT": {
    testcode: "BACT",
    testname: "Bacteremia",
    unit: "Present/Absent",
    referencerange: "Negative",
    category: "Microbiology"
  },
  "FUNG": {
    testcode: "FUNG",
    testname: "Fungemia",
    unit: "Present/Absent",
    referencerange: "Negative",
    category: "Microbiology"
  },
  "UTI": {
    testcode: "UTI",
    testname: "UTI Diagnosis",
    unit: "CFU/mL",
    referencemin: 0,
    referencemax: 10000,
    referencerange: "<10,000 CFU/mL",
    category: "Microbiology"
  },
  "SPUTUM": {
    testcode: "SPUTUM",
    testname: "Sputum Culture",
    unit: "Present/Absent",
    referencerange: "Normal flora",
    category: "Microbiology"
  },
  "Stool Tests": {
    testcode: "Stool Tests",
    testname: "Stool Tests",
    unit: "Descriptive",
    referencerange: "Normal stool characteristics",
    category: "Microbiology"
  },
  "PARA-ST": {
    testcode: "PARA-ST",
    testname: "Stool Parasites",
    unit: "Present/Absent",
    referencerange: "Negative",
    category: "Microbiology"
  },
  "C-DIFF": {
    testcode: "C-DIFF",
    testname: "C. difficile",
    unit: "Present/Absent",
    referencerange: "Negative",
    category: "Microbiology"
  },
  "OB": {
    testcode: "OB",
    testname: "Occult Blood",
    unit: "Present/Absent",
    referencerange: "Negative",
    category: "Microbiology"
  },
  "PCR": {
    testcode: "PCR",
    testname: "PCR/NAAT",
    unit: "Detected/Not Detected",
    referencerange: "Not Detected",
    category: "Microbiology"
  },

  // IMMUNOLOGY - General (4 tests)
  "ANA": {
    testcode: "ANA",
    testname: "Antinuclear Antibody",
    unit: "titer",
    referencerange: "<1:40 (Negative)",
    category: "Immunology"
  },
  "RF": {
    testcode: "RF",
    testname: "Rheumatoid Factor",
    unit: "IU/mL",
    referencemin: 0,
    referencemax: 14,
    referencerange: "<14 IU/mL",
    category: "Immunology"
  },
  "CCP": {
    testcode: "CCP",
    testname: "Anti-CCP",
    unit: "U/mL",
    referencemin: 0,
    referencemax: 20,
    referencerange: "<20 U/mL",
    category: "Immunology"
  },
  "CRP": {
    testcode: "CRP",
    testname: "C-Reactive Protein",
    unit: "mg/L",
    referencemin: 0,
    referencemax: 3,
    referencerange: "<3 mg/L",
    category: "Immunology"
  },

  // IMMUNOLOGY - Hepatitis & Viral (6 tests)
  "HBSAG": {
    testcode: "HBSAG",
    testname: "Hepatitis B Surface Antigen",
    unit: "Reactive/Non-reactive",
    referencerange: "Non-reactive",
    category: "Immunology"
  },
  "ANTI-HBS": {
    testcode: "ANTI-HBS",
    testname: "Anti-HBs",
    unit: "mIU/mL",
    referencemin: 10,
    referencemax: 999,
    referencerange: ">10 mIU/mL (Immune)",
    category: "Immunology"
  },
  "ANTI-HBC": {
    testcode: "ANTI-HBC",
    testname: "Anti-HBc",
    unit: "Reactive/Non-reactive",
    referencerange: "Non-reactive",
    category: "Immunology"
  },
  "ANTI-HCV": {
    testcode: "ANTI-HCV",
    testname: "Anti-HCV",
    unit: "Reactive/Non-reactive",
    referencerange: "Non-reactive",
    category: "Immunology"
  },
  "HIV": {
    testcode: "HIV",
    testname: "HIV Antibody",
    unit: "Reactive/Non-reactive",
    referencerange: "Non-reactive",
    category: "Immunology"
  },
  "COVID-AB": {
    testcode: "COVID-AB",
    testname: "COVID-19 Antibody",
    unit: "AU/mL",
    referencemin: 0,
    referencemax: 50,
    referencerange: "<50 AU/mL (Negative)",
    category: "Immunology"
  },

  // IMMUNOLOGY - TORCH Panel (4 tests)
  "TOXO": {
    testcode: "TOXO",
    testname: "Toxoplasmosis",
    unit: "IU/mL",
    referencerange: "<8 IU/mL (Negative)",
    category: "Immunology"
  },
  "RUBELLA": {
    testcode: "RUBELLA",
    testname: "Rubella",
    unit: "IU/mL",
    referencemin: 10,
    referencemax: 999,
    referencerange: ">10 IU/mL (Immune)",
    category: "Immunology"
  },
  "CMV": {
    testcode: "CMV",
    testname: "Cytomegalovirus",
    unit: "IU/mL",
    referencerange: "<6 IU/mL (Negative)",
    category: "Immunology"
  },
  "HERPES": {
    testcode: "HERPES",
    testname: "Herpes Simplex Virus",
    unit: "Index",
    referencerange: "<0.9 (Negative)",
    category: "Immunology"
  },

  // IMMUNOLOGY - Autoimmune (10 tests)
  "VDRL": {
    testcode: "VDRL",
    testname: "VDRL",
    unit: "Reactive/Non-reactive",
    referencerange: "Non-reactive",
    category: "Immunology"
  },
  "TPHA": {
    testcode: "TPHA",
    testname: "TPHA",
    unit: "Reactive/Non-reactive",
    referencerange: "Non-reactive",
    category: "Immunology"
  },
  "DSDNA": {
    testcode: "DSDNA",
    testname: "Anti-dsDNA",
    unit: "IU/mL",
    referencemin: 0,
    referencemax: 25,
    referencerange: "<25 IU/mL",
    category: "Immunology"
  },
  "SMITH": {
    testcode: "SMITH",
    testname: "Anti-Smith",
    unit: "U/mL",
    referencemin: 0,
    referencemax: 20,
    referencerange: "<20 U/mL",
    category: "Immunology"
  },
  "RNP": {
    testcode: "RNP",
    testname: "Anti-RNP",
    unit: "U/mL",
    referencemin: 0,
    referencemax: 20,
    referencerange: "<20 U/mL",
    category: "Immunology"
  },
  "SSA-SSB": {
    testcode: "SSA-SSB",
    testname: "Anti-SSA/SSB",
    unit: "U/mL",
    referencemin: 0,
    referencemax: 20,
    referencerange: "<20 U/mL",
    category: "Immunology"
  },
  "ANCA": {
    testcode: "ANCA",
    testname: "ANCA",
    unit: "U/mL",
    referencemin: 0,
    referencemax: 20,
    referencerange: "<20 U/mL",
    category: "Immunology"
  },
  "AMA": {
    testcode: "AMA",
    testname: "Anti-Mitochondrial Antibody",
    unit: "U/mL",
    referencemin: 0,
    referencemax: 20,
    referencerange: "<20 U/mL",
    category: "Immunology"
  },
  "TPO-TG": {
    testcode: "TPO-TG",
    testname: "Anti-TPO & Thyroglobulin",
    unit: "IU/mL",
    referencemin: 0,
    referencemax: 35,
    referencerange: "<35 IU/mL",
    category: "Immunology"
  },
  "B2GP-ACL": {
    testcode: "B2GP-ACL",
    testname: "Beta-2 Glycoprotein & Anticardiolipin",
    unit: "U/mL",
    referencemin: 0,
    referencemax: 20,
    referencerange: "<20 U/mL",
    category: "Immunology"
  },

  // IMMUNOLOGY - Tumor Markers (3 tests)
  "CEA": {
    testcode: "CEA",
    testname: "Carcinoembryonic Antigen",
    unit: "ng/mL",
    referencemin: 0,
    referencemax: 3,
    referencerange: "<3 ng/mL (Non-smoker)",
    category: "Immunology"
  },
  "CA125": {
    testcode: "CA125",
    testname: "Cancer Antigen 125",
    unit: "U/mL",
    referencemin: 0,
    referencemax: 35,
    referencerange: "<35 U/mL",
    category: "Immunology"
  },
  "CA199": {
    testcode: "CA199",
    testname: "Cancer Antigen 19-9",
    unit: "U/mL",
    referencemin: 0,
    referencemax: 37,
    referencerange: "<37 U/mL",
    category: "Immunology"
  },

  // HISTOPATHOLOGY (14 tests)
  "BIOPSY": {
    testcode: "BIOPSY",
    testname: "Biopsy Examination",
    unit: "Descriptive",
    referencerange: "Normal tissue architecture",
    category: "Histopathology"
  },
  "PAP": {
    testcode: "PAP",
    testname: "Pap Smear",
    unit: "Classification",
    referencerange: "Normal/NILM",
    category: "Histopathology"
  },
  "FNAC": {
    testcode: "FNAC",
    testname: "Fine Needle Aspiration Cytology",
    unit: "Descriptive",
    referencerange: "Benign cells",
    category: "Histopathology"
  },
  "PAS": {
    testcode: "PAS",
    testname: "PAS Stain",
    unit: "Positive/Negative",
    referencerange: "Depends on indication",
    category: "Histopathology"
  },
  "ZN": {
    testcode: "ZN",
    testname: "Ziehl-Neelsen Stain",
    unit: "Positive/Negative",
    referencerange: "Negative",
    category: "Histopathology"
  },
  "SILVER": {
    testcode: "SILVER",
    testname: "Silver Stain",
    unit: "Positive/Negative",
    referencerange: "Depends on indication",
    category: "Histopathology"
  },
  "IHC": {
    testcode: "IHC",
    testname: "Immunohistochemistry",
    unit: "Positive/Negative",
    referencerange: "Depends on marker",
    category: "Histopathology"
  },
  "PCR-MOL": {
    testcode: "PCR-MOL",
    testname: "PCR Molecular",
    unit: "Detected/Not Detected",
    referencerange: "Not Detected",
    category: "Histopathology"
  },
  "FISH": {
    testcode: "FISH",
    testname: "Fluorescence In Situ Hybridization",
    unit: "Positive/Negative",
    referencerange: "Negative",
    category: "Histopathology"
  },
  "SEQ": {
    testcode: "SEQ",
    testname: "Genetic Sequencing",
    unit: "Descriptive",
    referencerange: "Wild type",
    category: "Histopathology"
  },
  "URINE-CYTO": {
    testcode: "URINE-CYTO",
    testname: "Urine Cytology",
    unit: "Classification",
    referencerange: "Negative for malignancy",
    category: "Histopathology"
  },
  "SPUTUM-CYTO": {
    testcode: "SPUTUM-CYTO",
    testname: "Sputum Cytology",
    unit: "Classification",
    referencerange: "Negative for malignancy",
    category: "Histopathology"
  },
  "CBC": {
    testcode: "CBC",
    testname: "Complete Blood Count",
    unit: "Panel",
    referencerange: "See individual components",
    category: "Hematology"
  },
  "TSH": {
    testcode: "TSH",
    testname: "Thyroid Stimulating Hormone",
    unit: "mIU/L",
    referencemin: 0.4,
    referencemax: 4.0,
    referencerange: "0.4-4.0 mIU/L",
    category: "Endocrinology"
  }
};

// Helper function to get reference data by test code
export function getTestReferenceData(testcode: string): TestReferenceData | undefined {
  return TEST_REFERENCE_DATA[testcode.toUpperCase()];
}

// Helper function to get reference data by test name
export function getTestReferenceDataByName(testname: string): TestReferenceData | undefined {
  const entry = Object.values(TEST_REFERENCE_DATA).find(
    (test) => test.testname.toLowerCase() === testname.toLowerCase()
  );
  return entry;
}
