/**
 * Test Groups and Lab Types Configuration
 * Organized reference data for test reference ranges
 */

export const LAB_TYPES = [
  "Hematology",
  "Biochemistry",
  "Microbiology",
  "Immunology",
  "Histopathology",
  "Endocrinology",
  "Serology",
  "Molecular Biology",
  "Special Test",
] as const;

export const TEST_GROUPS = {
  // Endocrinology Groups
  HORMONE: {
    name: "Hormone",
    labType: "Endocrinology",
    tests: [
      "Thyroid Function Test (TFT)",
      "Fertility Hormones",
      "Adrenal Gland Hormones",
    ],
  },
  THYROID: {
    name: "Thyroid Function Test",
    labType: "Endocrinology",
    tests: ["TSH", "T3", "T4", "Free T3", "Free T4"],
  },
  FERTILITY: {
    name: "Fertility",
    labType: "Endocrinology",
    tests: ["FSH", "LH", "Estradiol", "Progesterone", "Testosterone", "Prolactin"],
  },
  ADRENAL: {
    name: "Adrenal Gland",
    labType: "Endocrinology",
    tests: ["Cortisol", "ACTH", "Aldosterone", "DHEA-S"],
  },
  BONE_METABOLISM: {
    name: "Bone Metabolism",
    labType: "Endocrinology",
    tests: ["Calcium", "Phosphorus", "Vitamin D", "PTH", "Alkaline Phosphatase"],
  },
  GLYCO_METABOLISM: {
    name: "Glyco Metabolism",
    labType: "Biochemistry",
    tests: ["Glucose", "HbA1c", "Fructosamine", "Insulin", "C-Peptide"],
  },

  // Hematology Groups
  ANEMIA: {
    name: "Anemia",
    labType: "Hematology",
    tests: ["CBC", "Iron Studies", "Ferritin", "TIBC", "Transferrin Saturation", "Vitamin B12", "Folate"],
  },
  CARDIAC_MARKERS: {
    name: "Cardiac Markers",
    labType: "Biochemistry",
    tests: ["Troponin I", "Troponin T", "CK-MB", "Myoglobin", "BNP", "NT-proBNP"],
  },

  // Infectious Disease Groups
  TORCH: {
    name: "TORCH",
    labType: "Serology",
    tests: [
      "Toxoplasma IgG/IgM",
      "Rubella IgG/IgM",
      "CMV IgG/IgM",
      "HSV IgG/IgM",
    ],
  },
  BLOOD_VIRUSES: {
    name: "Blood Viruses",
    labType: "Serology",
    tests: [
      "HIV",
      "HBsAg",
      "Anti-HCV",
      "HBV Profile",
      "HCV Viral Load",
      "HIV Viral Load",
    ],
  },

  // Hematology Panels
  HEMATOLOGY_COMPLETE: {
    name: "Complete Blood Count (CBC)",
    labType: "Hematology",
    tests: ["WBC", "RBC", "Hemoglobin", "Hematocrit", "MCV", "MCH", "MCHC", "Platelets"],
  },
  COAGULATION: {
    name: "Coagulation Profile",
    labType: "Hematology",
    tests: ["PT", "INR", "aPTT", "Fibrinogen", "D-Dimer"],
  },
  ELECTROPHORESIS: {
    name: "Electrophoresis",
    labType: "Hematology",
    tests: ["Hemoglobin Electrophoresis", "Protein Electrophoresis", "Immunofixation"],
  },

  // Serology Groups
  SEROLOGY_GENERAL: {
    name: "Serology",
    labType: "Serology",
    tests: [
      "ASO Titer",
      "RF (Rheumatoid Factor)",
      "CRP",
      "ESR",
      "ANA",
      "Anti-dsDNA",
    ],
  },

  // Immunity Groups
  IMMUNITY: {
    name: "Immunity",
    labType: "Immunology",
    tests: [
      "Immunoglobulins (IgG, IgA, IgM, IgE)",
      "Complement (C3, C4)",
      "CD4 Count",
      "CD8 Count",
      "Total Lymphocyte Count",
    ],
  },

  // Biochemistry Groups
  LIPID_PROFILE: {
    name: "Lipid Profile",
    labType: "Biochemistry",
    tests: ["Total Cholesterol", "HDL", "LDL", "Triglycerides", "VLDL", "Cholesterol/HDL Ratio"],
  },
  RENAL_FUNCTION: {
    name: "Renal Function",
    labType: "Biochemistry",
    tests: [
      "Urea",
      "Creatinine",
      "eGFR",
      "Uric Acid",
      "Sodium",
      "Potassium",
      "Chloride",
      "Bicarbonate",
    ],
  },
  LIVER_FUNCTION: {
    name: "Liver Function Test (LFT)",
    labType: "Biochemistry",
    tests: [
      "ALT",
      "AST",
      "ALP",
      "GGT",
      "Total Bilirubin",
      "Direct Bilirubin",
      "Indirect Bilirubin",
      "Total Protein",
      "Albumin",
      "Globulin",
    ],
  },

  // Microbiology Groups
  MICROBIOLOGY_ABSCESS: {
    name: "Abscess Culture",
    labType: "Microbiology",
    tests: ["Culture & Sensitivity", "Gram Stain", "AFB Stain"],
  },
  MICROBIOLOGY_URINE: {
    name: "Urine Culture",
    labType: "Microbiology",
    tests: ["Urine Culture & Sensitivity", "Urine Microscopy"],
  },
  MICROBIOLOGY_STOOL: {
    name: "Stool Culture",
    labType: "Microbiology",
    tests: ["Stool Culture", "Ova & Parasites", "Occult Blood"],
  },
  MICROBIOLOGY_BLOOD: {
    name: "Blood Culture",
    labType: "Microbiology",
    tests: ["Blood Culture & Sensitivity", "Aerobic Culture", "Anaerobic Culture"],
  },
  MICROBIOLOGY_SPUTUM: {
    name: "Sputum Culture",
    labType: "Microbiology",
    tests: ["Sputum Culture & Sensitivity", "AFB Culture", "Gram Stain"],
  },
  MICROBIOLOGY_WOUND: {
    name: "Wound Culture",
    labType: "Microbiology",
    tests: ["Wound Culture & Sensitivity", "Gram Stain"],
  },
  MICROBIOLOGY_NASAL: {
    name: "Nasal Swab",
    labType: "Microbiology",
    tests: ["Nasal Culture & Sensitivity", "MRSA Screen"],
  },
  MICROBIOLOGY_THROAT: {
    name: "Throat Swab",
    labType: "Microbiology",
    tests: ["Throat Culture & Sensitivity", "Strep Screen"],
  },
  MICROBIOLOGY_HVS: {
    name: "High Vaginal Swab",
    labType: "Microbiology",
    tests: ["HVS Culture & Sensitivity", "Candida Screen", "Trichomonas"],
  },
  MICROBIOLOGY_URETHRAL: {
    name: "Urethral Swab",
    labType: "Microbiology",
    tests: ["Urethral Culture & Sensitivity", "Gonorrhea Screen", "Chlamydia Screen"],
  },
  MICROBIOLOGY_PLEURAL: {
    name: "Pleural Fluid",
    labType: "Microbiology",
    tests: ["Pleural Fluid Culture", "Cell Count", "Biochemistry", "Cytology"],
  },
  MICROBIOLOGY_ASCITIC: {
    name: "Ascitic Fluid",
    labType: "Microbiology",
    tests: ["Ascitic Fluid Culture", "Cell Count", "Albumin", "SAAG"],
  },
  MICROBIOLOGY_SYNOVIAL: {
    name: "Synovial Fluid",
    labType: "Microbiology",
    tests: ["Synovial Fluid Culture", "Cell Count", "Crystal Analysis"],
  },
  MICROBIOLOGY_CSF: {
    name: "Cerebro-Spinal Fluid",
    labType: "Microbiology",
    tests: ["CSF Culture", "Cell Count", "Protein", "Glucose", "Gram Stain"],
  },
  MICROBIOLOGY_SEMINAL: {
    name: "Seminal Fluid",
    labType: "Microbiology",
    tests: ["Semen Analysis", "Sperm Count", "Motility", "Morphology"],
  },
  MICROBIOLOGY_PERITONEAL: {
    name: "Peritoneal Fluid",
    labType: "Microbiology",
    tests: ["Peritoneal Fluid Culture", "Cell Count", "Biochemistry"],
  },

  // Molecular Biology (PCR)
  PCR_TESTS: {
    name: "Polymerase Chain Reaction (PCR)",
    labType: "Molecular Biology",
    tests: [
      "COVID-19 PCR",
      "TB PCR",
      "HPV PCR",
      "Chlamydia PCR",
      "Gonorrhea PCR",
      "HCV RNA",
      "HIV RNA",
      "HBV DNA",
    ],
  },

  // Histopathology
  HISTOPATHOLOGY: {
    name: "Histopathology",
    labType: "Histopathology",
    tests: [
      "Biopsy",
      "FNAC",
      "Pap Smear",
      "Frozen Section",
      "Immunohistochemistry",
      "Special Stains",
    ],
  },

  // Special Tests
  SPECIAL_TESTS: {
    name: "Special Tests",
    labType: "Special Test",
    tests: [
      "Tumor Markers (CEA, CA 19-9, CA 125, PSA, AFP)",
      "Drug Levels (Digoxin, Phenytoin, Valproate)",
      "Heavy Metals",
      "Toxicology Screen",
      "Genetic Testing",
      "Flow Cytometry",
      "Bone Marrow Examination",
    ],
  },
} as const;

export type LabType = typeof LAB_TYPES[number];
export type TestGroupKey = keyof typeof TEST_GROUPS;

// Helper function to get all test groups for a specific lab type
export function getTestGroupsByLabType(labType: LabType) {
  return Object.entries(TEST_GROUPS)
    .filter(([_, group]) => group.labType === labType)
    .map(([key, group]) => ({
      key,
      name: group.name,
      tests: group.tests,
    }));
}

// Helper function to get all unique test group names
export function getAllTestGroupNames() {
  return Object.values(TEST_GROUPS).map(group => group.name);
}
