/**
 * Laboratory Test Catalog
 * Comprehensive test packages and individual tests organized by laboratory department
 */

export interface TestItem {
  id: string;
  name: string;
  code: string;
  category: string;
  description?: string;
  material?: string;
  snomedCode?: string;
  fastingRequired?: boolean;
}

export interface TestPackage {
  id: string;
  name: string;
  category: string;
  description: string;
  tests: string[];
  snomedCode?: string;
  price?: number;
}

export interface Laboratory {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  specialties: string[];
  turnaround: string;
}

// Laboratory Departments
export const LABORATORIES: Record<string, Laboratory> = {
  "biochemistry": {
    id: "biochemistry",
    name: "Biochemistry",
    address: "Laboratory Department",
    phone: "(555) 123-4567",
    email: "biochemistry@hospital.com",
    specialties: [
      "Hormone",
      "General",
      "Serology",
      "Immunity",
      "Polymerase Chain Reaction",
      "Hematology",
      "Infectious Disease",
      "Electrophoresis",
    ],
    turnaround: "Routine: 24-48 hours, STAT: 4-6 hours",
  },
  "microbiology": {
    id: "microbiology",
    name: "Microbiology",
    address: "Laboratory Department",
    phone: "(555) 123-4568",
    email: "microbiology@hospital.com",
    specialties: [
      "Abscess",
      "Urine Culture",
      "Stool Culture",
      "Blood Culture",
      "Sputum Culture",
      "Wound Culture",
      "Nasal Swab",
      "Throat Swab",
      "High Vaginal Swab",
      "Urethral Swab",
      "Pleural Fluid",
      "Ascitic Fluid",
      "Synovial Fluid",
      "Cerebro-Spinal Fluid",
      "Seminal Fluid",
      "Peritoneal Fluid",
    ],
    turnaround: "Routine: 48-72 hours, STAT: 24 hours (preliminary)",
  },
  "histopathology": {
    id: "histopathology",
    name: "Histopathology",
    address: "Laboratory Department",
    phone: "(555) 123-4569",
    email: "histopathology@hospital.com",
    specialties: [
      "General",
    ],
    turnaround: "Routine: 5-7 days, STAT: 48-72 hours (frozen section: 30 min)",
  },
};

// Test Packages organized by Laboratory
export const TEST_PACKAGES: Record<string, TestPackage> = {
  // BIOCHEMISTRY - Hormone
  "hormone": {
    id: "hormone",
    name: "Hormone",
    category: "Biochemistry",
    description: "Thyroid, reproductive, adrenal and metabolic hormones",
    tests: ["tsh", "t3", "t4", "ft3", "ft4", "lh", "fsh", "prl", "e2", "prg", "test", "amh", "gastrin", "dhea-s", "renin", "17-ohp", "cortisol", "pth", "gh", "ins"],
  },
  // BIOCHEMISTRY - General
  "general-biochemistry": {
    id: "general-biochemistry",
    name: "General",
    category: "Biochemistry",
    description: "Liver, kidney, lipid, glucose, electrolytes and general chemistry",
    tests: ["alt", "ast", "alp", "ggt", "ldh", "bilirubin", "albumin", "creatinine", "urea", "uric-acid", "hdl", "ldl", "triglycerides", "glucose", "hba1c", "sodium", "potassium", "calcium"],
  },
  // BIOCHEMISTRY - Serology
  "serology": {
    id: "serology",
    name: "Serology",
    category: "Biochemistry",
    description: "Serological tests including VDRL, TPHA, CRP, RF",
    tests: ["vdrl", "tpha", "crp", "rf"],
  },
  // BIOCHEMISTRY - Immunity
  "immunity": {
    id: "immunity",
    name: "Immunity",
    category: "Biochemistry",
    description: "Immunological markers, tumor markers, autoimmune tests",
    tests: ["ana", "anti-ccp", "cea", "ca125", "ca199", "psa", "ige", "igm", "igg", "iga"],
  },
  // BIOCHEMISTRY - PCR
  "polymerase-chain-reaction": {
    id: "polymerase-chain-reaction",
    name: "Polymerase Chain Reaction",
    category: "Biochemistry",
    description: "PCR-based molecular diagnostic tests",
    tests: ["pcr-hcv-vl", "pcr-hbv-vl", "pcr-hiv-vl", "pcr-tb", "pcr-hpv", "pcr-hcv-genotype", "pcr-hcv-genexpert", "pcr-hbv-genexpert", "pcr-tb-genexpert"],
  },
  // BIOCHEMISTRY - Hematology
  "hematology": {
    id: "hematology",
    name: "Hematology",
    category: "Biochemistry",
    description: "Complete blood count, coagulation, blood banking",
    tests: ["cbc", "esr", "blood-film", "pt-inr", "ptt", "fibrinogen", "blood-group", "cross-match", "retic", "sickling-test", "malaria-test"],
  },
  // BIOCHEMISTRY - Infectious Disease
  "infectious-disease": {
    id: "infectious-disease",
    name: "Infectious Disease",
    category: "Biochemistry",
    description: "TORCH panel, hepatitis markers, HIV testing",
    tests: ["toxo-igg", "toxo-igm", "cmv-igg", "cmv-igm", "rubella-igg", "rubella-igm", "hsv-igg", "hsv-igm", "hbsag", "hcv-screen", "hiv-titer"],
  },
  // BIOCHEMISTRY - Electrophoresis
  "electrophoresis": {
    id: "electrophoresis",
    name: "Electrophoresis",
    category: "Biochemistry",
    description: "Protein and hemoglobin electrophoresis studies",
    tests: ["hb-electrophoresis", "spe", "upe", "serum-immune-fixation"],
  },

  // MICROBIOLOGY
  "abscess-culture": {
    id: "abscess-culture",
    name: "Abscess",
    category: "Microbiology",
    description: "Abscess culture and sensitivity",
    tests: ["abscess-cs-manual", "abscess-cs-automated", "gram-stain-abscess", "afb-stain-abscess"],
  },
  "urine-culture": {
    id: "urine-culture",
    name: "Urine Culture",
    category: "Microbiology",
    description: "Urine culture and sensitivity",
    tests: ["urine-cs"],
  },
  "stool-culture": {
    id: "stool-culture",
    name: "Stool Culture",
    category: "Microbiology",
    description: "Stool culture and sensitivity",
    tests: ["stool-cs-manual", "stool-cs-automated"],
  },
  "blood-culture": {
    id: "blood-culture",
    name: "Blood Culture",
    category: "Microbiology",
    description: "Blood culture and sensitivity",
    tests: ["blood-cs-manual", "blood-cs-automated"],
  },
  "sputum-culture": {
    id: "sputum-culture",
    name: "Sputum Culture",
    category: "Microbiology",
    description: "Sputum culture and sensitivity",
    tests: ["sputum-cs-manual", "sputum-cs-automated"],
  },
  "wound-culture": {
    id: "wound-culture",
    name: "Wound Culture",
    category: "Microbiology",
    description: "Wound culture and sensitivity",
    tests: ["wound-cs-manual", "wound-cs-automated"],
  },
  "nasal-swab": {
    id: "nasal-swab",
    name: "Nasal Swab",
    category: "Microbiology",
    description: "Nasal swab culture and sensitivity",
    tests: ["nasal-cs"],
  },
  "throat-swab": {
    id: "throat-swab",
    name: "Throat Swab",
    category: "Microbiology",
    description: "Throat swab culture and sensitivity",
    tests: ["throat-cs"],
  },
  "high-vaginal-swab": {
    id: "high-vaginal-swab",
    name: "High Vaginal Swab",
    category: "Microbiology",
    description: "HVS culture and sensitivity",
    tests: ["hvs-direct-exam", "gram-stain-hvs"],
  },
  "urethral-swab": {
    id: "urethral-swab",
    name: "Urethral Swab",
    category: "Microbiology",
    description: "Urethral swab culture and sensitivity",
    tests: ["urethral-direct-exam", "gc-stain-urethral"],
  },
  "pleural-fluid": {
    id: "pleural-fluid",
    name: "Pleural Fluid",
    category: "Microbiology",
    description: "Pleural fluid culture, cell count, biochemistry",
    tests: ["pleural-cs-manual", "pleural-cs-automated", "gram-stain-pleural"],
  },
  "ascitic-fluid": {
    id: "ascitic-fluid",
    name: "Ascitic Fluid",
    category: "Microbiology",
    description: "Ascitic fluid culture, cell count, biochemistry",
    tests: ["ascitic-cs-manual", "ascitic-cs-automated", "gram-stain-ascitic"],
  },
  "synovial-fluid": {
    id: "synovial-fluid",
    name: "Synovial Fluid",
    category: "Microbiology",
    description: "Synovial fluid culture, cell count, crystal analysis",
    tests: ["synovial-cs-manual", "synovial-cs-automated", "gram-stain-synovial"],
  },
  "cerebro-spinal-fluid": {
    id: "cerebro-spinal-fluid",
    name: "Cerebro-Spinal Fluid",
    category: "Microbiology",
    description: "CSF culture, cell count, protein, glucose",
    tests: ["csf-cs-manual", "csf-cs-automated", "gram-stain-csf"],
  },
  "seminal-fluid": {
    id: "seminal-fluid",
    name: "Seminal Fluid",
    category: "Microbiology",
    description: "Seminal fluid culture and analysis",
    tests: ["seminal-cs", "gc-stain-seminal", "sfa"],
  },
  "peritoneal-fluid": {
    id: "peritoneal-fluid",
    name: "Peritoneal Fluid",
    category: "Microbiology",
    description: "Peritoneal fluid culture and analysis",
    tests: ["peritoneal-cs-manual", "peritoneal-cs", "gram-stain-peritoneal"],
  },

  // HISTOPATHOLOGY
  "histopathology-general": {
    id: "histopathology-general",
    name: "General",
    category: "Histopathology",
    description: "Tissue biopsy, FNAC, cytology, special stains",
    tests: ["biopsy-exam", "fnac", "pap-smear", "special-stains", "ihc"],
  },
};

// Individual Tests (subset - add more as needed)
export const INDIVIDUAL_TESTS: Record<string, TestItem> = {
  // Biochemistry - Hematology
  rbc: { id: "rbc", name: "RBCs", code: "RBC", category: "Biochemistry", material: "Blood", snomedCode: "165716006" },
  wbc: { id: "wbc", name: "WBCs", code: "WBC", category: "Biochemistry", material: "Blood", snomedCode: "165717003" },
  hemoglobin: { id: "hemoglobin", name: "Hemoglobin", code: "HGB", category: "Biochemistry", material: "Blood", snomedCode: "165718008" },
  hematocrit: { id: "hematocrit", name: "Hematocrit", code: "HCT", category: "Biochemistry", material: "Blood", snomedCode: "165719001" },
  platelets: { id: "platelets", name: "Platelets", code: "PLT", category: "Biochemistry", material: "Blood", snomedCode: "165720006" },
  esr: { id: "esr", name: "ESR", code: "ESR", category: "Biochemistry", material: "Blood", snomedCode: "165725002" },
  "pt-aptt": { id: "pt-aptt", name: "PT/aPTT", code: "PT-APTT", category: "Biochemistry", material: "Blood", snomedCode: "165726001" },
  reticulocyte: { id: "reticulocyte", name: "Reticulocyte Count", code: "RETIC", category: "Biochemistry", material: "Blood", snomedCode: "165731004" },
  
  // Biochemistry - Blood Smear
  "sickle-cells": { id: "sickle-cells", name: "Sickle Cells", code: "SICKLE", category: "Biochemistry", material: "Blood", snomedCode: "165732001" },
  blasts: { id: "blasts", name: "Blasts", code: "BLAST", category: "Biochemistry", material: "Blood", snomedCode: "165733002" },
  parasites: { id: "parasites", name: "Parasites", code: "PARA", category: "Biochemistry", material: "Blood", snomedCode: "165734003" },
  
  // Biochemistry - Anemia Workup
  ferritin: { id: "ferritin", name: "Ferritin", code: "FERR", category: "Biochemistry", material: "Blood", snomedCode: "165776002" },
  iron: { id: "iron", name: "Iron", code: "IRON", category: "Biochemistry", material: "Blood", snomedCode: "165777001" },
  b12: { id: "b12", name: "Vitamin B12", code: "B12", category: "Biochemistry", material: "Blood", snomedCode: "165778006" },
  folate: { id: "folate", name: "Folate", code: "FOLATE", category: "Biochemistry", material: "Blood", snomedCode: "165779000" },
  "bleeding-time": { id: "bleeding-time", name: "Bleeding Time (BT)", code: "BT", category: "Biochemistry", material: "Blood", snomedCode: "165729008" },
  "clotting-time": { id: "clotting-time", name: "Clotting Time (CT)", code: "CT", category: "Biochemistry", material: "Blood", snomedCode: "165730003" },
  "pt-inr": { id: "pt-inr", name: "Prothrombin Time (PT & INR)", code: "PT-INR", category: "Biochemistry", material: "Blood", snomedCode: "165726001" },
  aptt: { id: "aptt", name: "APTT", code: "APTT", category: "Biochemistry", material: "Blood", snomedCode: "165727005" },
  
  // Biochemistry - Specialized
  "malaria-parasite": { id: "malaria-parasite", name: "Malaria Parasite Detection", code: "MALARIA", category: "Biochemistry", material: "Blood", snomedCode: "165735001" },
  microfilaria: { id: "microfilaria", name: "Microfilaria Test", code: "MICROF", category: "Biochemistry", material: "Blood", snomedCode: "165736002" },
  "iron-studies-hb-electrophoresis": { id: "iron-studies-hb-electrophoresis", name: "Iron Studies & Hemoglobin Electrophoresis", code: "IRON-HB", category: "Biochemistry", material: "Blood", snomedCode: "165737003" },
  "bone-marrow-exam": { id: "bone-marrow-exam", name: "Bone Marrow Examination", code: "BM-EXAM", category: "Biochemistry", material: "Bone Marrow", snomedCode: "165738004" },
  
  // BIOCHEMISTRY - Liver Function
  alt: { id: "alt", name: "ALT (SGPT)", code: "ALT", category: "Biochemistry", material: "Blood", snomedCode: "165739007" },
  ast: { id: "ast", name: "AST (SGOT)", code: "AST", category: "Biochemistry", material: "Blood", snomedCode: "165740005" },
  alp: { id: "alp", name: "Alkaline Phosphatase (ALP)", code: "ALP", category: "Biochemistry", material: "Blood", snomedCode: "165741009" },
  ggt: { id: "ggt", name: "GGT", code: "GGT", category: "Biochemistry", material: "Blood", snomedCode: "165742002" },
  ldh: { id: "ldh", name: "LDH", code: "LDH", category: "Biochemistry", material: "Blood", snomedCode: "165743007" },
  bilirubin: { id: "bilirubin", name: "Bilirubin (Total & Direct)", code: "BILI", category: "Biochemistry", material: "Blood", snomedCode: "165744001" },
  albumin: { id: "albumin", name: "Albumin", code: "ALB", category: "Biochemistry", material: "Blood", snomedCode: "165745002" },
  "pt-inr-lft": { id: "pt-inr-lft", name: "PT & INR", code: "PT-INR", category: "Biochemistry", material: "Blood", snomedCode: "165746001" },
  
  // BIOCHEMISTRY - Kidney Function
  creatinine: { id: "creatinine", name: "Creatinine", code: "CREAT", category: "Biochemistry", material: "Blood", snomedCode: "165747005" },
  urea: { id: "urea", name: "Urea/BUN", code: "UREA", category: "Biochemistry", material: "Blood", snomedCode: "165748000" },
  egfr: { id: "egfr", name: "eGFR", code: "EGFR", category: "Biochemistry", material: "Blood", snomedCode: "165749008" },
  
  // BIOCHEMISTRY - Urinalysis
  "urine-protein": { id: "urine-protein", name: "Urine Protein", code: "U-PROT", category: "Biochemistry", material: "Urine", snomedCode: "165750008" },
  "urine-glucose": { id: "urine-glucose", name: "Urine Glucose", code: "U-GLU", category: "Biochemistry", material: "Urine", snomedCode: "165751007" },
  "urine-ketones": { id: "urine-ketones", name: "Urine Ketones", code: "U-KET", category: "Biochemistry", material: "Urine", snomedCode: "165752000" },
  "urine-blood": { id: "urine-blood", name: "Urine Blood", code: "U-BLOOD", category: "Biochemistry", material: "Urine", snomedCode: "165753005" },
  "urine-bilirubin": { id: "urine-bilirubin", name: "Urine Bilirubin", code: "U-BILI", category: "Biochemistry", material: "Urine", snomedCode: "165754004" },
  "urine-nitrite-leukocyte": { id: "urine-nitrite-leukocyte", name: "Urine Nitrite & Leukocyte Esterase", code: "U-NIT-LE", category: "Biochemistry", material: "Urine", snomedCode: "165755003" },
  "urine-24h-creatinine": { id: "urine-24h-creatinine", name: "24-Hour Urine Creatinine Clearance", code: "U-24H-CR", category: "Biochemistry", material: "Urine", snomedCode: "165756002" },
  
  // BIOCHEMISTRY - Lipid & Glucose
  hdl: { id: "hdl", name: "HDL Cholesterol", code: "HDL", category: "Biochemistry", material: "Blood", snomedCode: "165757006", fastingRequired: true },
  ldl: { id: "ldl", name: "LDL Cholesterol", code: "LDL", category: "Biochemistry", material: "Blood", snomedCode: "165758001", fastingRequired: true },
  triglycerides: { id: "triglycerides", name: "Triglycerides", code: "TRIG", category: "Biochemistry", material: "Blood", snomedCode: "165759009", fastingRequired: true },
  vldl: { id: "vldl", name: "VLDL Cholesterol", code: "VLDL", category: "Biochemistry", material: "Blood", snomedCode: "165760004", fastingRequired: true },
  glucose: { id: "glucose", name: "Glucose (Fasting/Random)", code: "GLU", category: "Biochemistry", material: "Blood", snomedCode: "165761000", fastingRequired: true },
  hba1c: { id: "hba1c", name: "HbA1c", code: "HBA1C", category: "Biochemistry", material: "Blood", snomedCode: "165762007" },
  fpg: { id: "fpg", name: "Fasting Plasma Glucose", code: "FPG", category: "Biochemistry", material: "Blood", snomedCode: "165763002", fastingRequired: true },
  ogtt: { id: "ogtt", name: "Oral Glucose Tolerance Test (OGTT)", code: "OGTT", category: "Biochemistry", material: "Blood", snomedCode: "165764008", fastingRequired: true },
  
  // BIOCHEMISTRY - Electrolytes
  sodium: { id: "sodium", name: "Sodium (Na+)", code: "NA", category: "Biochemistry", material: "Blood", snomedCode: "165765009" },
  potassium: { id: "potassium", name: "Potassium (K+)", code: "K", category: "Biochemistry", material: "Blood", snomedCode: "165766005" },
  calcium: { id: "calcium", name: "Calcium (Ca2+)", code: "CA", category: "Biochemistry", material: "Blood", snomedCode: "165767001" },
  chloride: { id: "chloride", name: "Chloride (Cl-)", code: "CL", category: "Biochemistry", material: "Blood", snomedCode: "165768006" },
  bicarbonate: { id: "bicarbonate", name: "Bicarbonate (HCO3-)", code: "HCO3", category: "Biochemistry", material: "Blood", snomedCode: "165769003" },
  "uric-acid": { id: "uric-acid", name: "Uric Acid", code: "URIC", category: "Biochemistry", material: "Blood", snomedCode: "165770002" },
  amh: { id: "amh", name: "Anti Mullerian Hormone", code: "AMH", category: "Biochemistry", material: "Blood", snomedCode: "413073001" },
  gastrin: { id: "gastrin", name: "Gastrin", code: "Gastrin", category: "Biochemistry", material: "Blood", snomedCode: "269876001" },
  "dhea-s": { id: "dhea-s", name: "Dehydroepiandrosterone Sulfate", code: "DHEA-S", category: "Biochemistry", material: "Blood", snomedCode: "412808005" },
  renin: { id: "renin", name: "Renin", code: "Renin", category: "Biochemistry", material: "Blood", snomedCode: "104589008" },
  "17-ohp": { id: "17-ohp", name: "17-Hydroxy Progesterone", code: "17-OHP", category: "Biochemistry", material: "Blood", snomedCode: "104590004" },
  "protein-electrophoresis": { id: "protein-electrophoresis", name: "Protein Electrophoresis", code: "PROT-ELEC", category: "Biochemistry", material: "Blood", snomedCode: "165771003" },
  
  // MICROBIOLOGY
  bacteremia: { id: "bacteremia", name: "Bacteremia", code: "BACT", category: "Microbiology", material: "Blood", snomedCode: "165772005" },
  fungemia: { id: "fungemia", name: "Fungemia", code: "FUNG", category: "Microbiology", material: "Blood", snomedCode: "165773000" },
  "uti-diagnosis": { id: "uti-diagnosis", name: "UTI Diagnosis", code: "UTI", category: "Microbiology", material: "Urine", snomedCode: "165774006" },
  "sputum-culture-test": { id: "sputum-culture-test", name: "Sputum Culture", code: "SPUTUM", category: "Microbiology", material: "Sputum", snomedCode: "165775007" },
  "stool-parasites": { id: "stool-parasites", name: "Parasites", code: "PARA-ST", category: "Microbiology", material: "Stool", snomedCode: "165776008" },
  "c-difficile": { id: "c-difficile", name: "C. difficile", code: "C-DIFF", category: "Microbiology", material: "Stool", snomedCode: "165777004" },
  "occult-blood": { id: "occult-blood", name: "Occult Blood", code: "OB", category: "Microbiology", material: "Stool", snomedCode: "165778009" },
  "pcr-naat": { id: "pcr-naat", name: "PCR/NAAT", code: "PCR", category: "Microbiology", material: "Stool", snomedCode: "165779001" },
  
  // Biochemistry - Immunity
  ana: { id: "ana", name: "ANA", code: "ANA", category: "Biochemistry", material: "Blood", snomedCode: "165780003" },
  rf: { id: "rf", name: "Rheumatoid Factor (RF)", code: "RF", category: "Biochemistry", material: "Blood", snomedCode: "165781004" },
  "anti-ccp": { id: "anti-ccp", name: "Anti-CCP", code: "CCP", category: "Biochemistry", material: "Blood", snomedCode: "165782006" },
  crp: { id: "crp", name: "C-Reactive Protein (CRP)", code: "CRP", category: "Biochemistry", material: "Blood", snomedCode: "165783001" },
  hbsag: { id: "hbsag", name: "HBsAg", code: "HBSAG", category: "Biochemistry", material: "Blood", snomedCode: "165784007" },
  "anti-hbs": { id: "anti-hbs", name: "Anti-HBs", code: "ANTI-HBS", category: "Biochemistry", material: "Blood", snomedCode: "165785008" },
  "anti-hbc": { id: "anti-hbc", name: "Anti-HBc", code: "ANTI-HBC", category: "Biochemistry", material: "Blood", snomedCode: "165786009" },
  "anti-hcv": { id: "anti-hcv", name: "Anti-HCV", code: "ANTI-HCV", category: "Biochemistry", material: "Blood", snomedCode: "165787000" },
  "hiv-antibody": { id: "hiv-antibody", name: "HIV Antibody", code: "HIV", category: "Biochemistry", material: "Blood", snomedCode: "165788005" },
  "covid19-antibody": { id: "covid19-antibody", name: "COVID-19 Antibody", code: "COVID-AB", category: "Biochemistry", material: "Blood", snomedCode: "165789002" },
  toxoplasmosis: { id: "toxoplasmosis", name: "Toxoplasmosis", code: "TOXO", category: "Biochemistry", material: "Blood", snomedCode: "165790006" },
  rubella: { id: "rubella", name: "Rubella", code: "RUBELLA", category: "Biochemistry", material: "Blood", snomedCode: "165791005" },
  cmv: { id: "cmv", name: "CMV", code: "CMV", category: "Biochemistry", material: "Blood", snomedCode: "165792003" },
  herpes: { id: "herpes", name: "Herpes", code: "HERPES", category: "Biochemistry", material: "Blood", snomedCode: "165793008" },
  vdrl: { id: "vdrl", name: "VDRL", code: "VDRL", category: "Biochemistry", material: "Blood", snomedCode: "165794002" },
  tpha: { id: "tpha", name: "TPHA", code: "TPHA", category: "Biochemistry", material: "Blood", snomedCode: "165795001" },
  "ana-autoimmune": { id: "ana-autoimmune", name: "ANA", code: "ANA", category: "Biochemistry", material: "Blood", snomedCode: "165796002" },
  "anti-dsdna": { id: "anti-dsdna", name: "Anti-dsDNA", code: "DSDNA", category: "Biochemistry", material: "Blood", snomedCode: "165797006" },
  "anti-smith": { id: "anti-smith", name: "Anti-Smith", code: "SMITH", category: "Biochemistry", material: "Blood", snomedCode: "165798001" },
  "anti-rnp": { id: "anti-rnp", name: "Anti-RNP", code: "RNP", category: "Biochemistry", material: "Blood", snomedCode: "165799009" },
  "anti-ssa-ssb": { id: "anti-ssa-ssb", name: "Anti-SSA/SSB", code: "SSA-SSB", category: "Biochemistry", material: "Blood", snomedCode: "165800008" },
  anca: { id: "anca", name: "ANCA", code: "ANCA", category: "Biochemistry", material: "Blood", snomedCode: "165801007" },
  ama: { id: "ama", name: "AMA", code: "AMA", category: "Biochemistry", material: "Blood", snomedCode: "165802000" },
  "anti-tpo-thyroglobulin": { id: "anti-tpo-thyroglobulin", name: "Anti-TPO & Thyroglobulin", code: "TPO-TG", category: "Biochemistry", material: "Blood", snomedCode: "165803005" },
  cea: { id: "cea", name: "CEA", code: "CEA", category: "Biochemistry", material: "Blood", snomedCode: "165804004" },
  ca125: { id: "ca125", name: "CA 125", code: "CA125", category: "Biochemistry", material: "Blood", snomedCode: "165805003" },
  ca199: { id: "ca199", name: "CA 19-9", code: "CA199", category: "Biochemistry", material: "Blood", snomedCode: "165806002" },
  "beta2-glycoprotein-anticardiolipin": { id: "beta2-glycoprotein-anticardiolipin", name: "Beta-2 Glycoprotein & Anticardiolipin", code: "B2GP-ACL", category: "Biochemistry", material: "Blood", snomedCode: "165807006" },
  
  // HISTOPATHOLOGY
  "biopsy-exam": { id: "biopsy-exam", name: "Biopsy Examination", code: "BIOPSY", category: "Histopathology", material: "Tissue", snomedCode: "165808001" },
  "cervical-cancer-screening": { id: "cervical-cancer-screening", name: "Cervical Cancer Screening (Pap Smear)", code: "PAP", category: "Histopathology", material: "Cervical Cells", snomedCode: "165809009" },
  fnac: { id: "fnac", name: "FNAC", code: "FNAC", category: "Histopathology", material: "Cells", snomedCode: "165810004" },
  pas: { id: "pas", name: "PAS Stain", code: "PAS", category: "Histopathology", material: "Tissue", snomedCode: "165811000" },
  "ziehl-neelsen": { id: "ziehl-neelsen", name: "Ziehl-Neelsen Stain", code: "ZN", category: "Histopathology", material: "Tissue", snomedCode: "165812007" },
  "silver-stain": { id: "silver-stain", name: "Silver Stain", code: "SILVER", category: "Histopathology", material: "Tissue", snomedCode: "165813002" },
  ihc: { id: "ihc", name: "Immunohistochemistry (IHC)", code: "IHC", category: "Histopathology", material: "Tissue", snomedCode: "165814008" },
  "pcr-molecular": { id: "pcr-molecular", name: "PCR", code: "PCR", category: "Histopathology", material: "Tissue/Blood", snomedCode: "165815009" },
  fish: { id: "fish", name: "FISH", code: "FISH", category: "Histopathology", material: "Tissue", snomedCode: "165816005" },
  "genetic-sequencing": { id: "genetic-sequencing", name: "Genetic Sequencing", code: "SEQ", category: "Histopathology", material: "Tissue/Blood", snomedCode: "165817001" },
  "urine-cytology": { id: "urine-cytology", name: "Urine Cytology", code: "URINE-CYTO", category: "Histopathology", material: "Urine", snomedCode: "165818006" },
  "sputum-cytology": { id: "sputum-cytology", name: "Sputum Cytology", code: "SPUTUM-CYTO", category: "Histopathology", material: "Sputum", snomedCode: "165819003" },
};
