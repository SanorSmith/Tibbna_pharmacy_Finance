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
  "hematology-lab": {
    id: "hematology-lab",
    name: "Hematology",
    address: "Laboratory Department, Building A",
    phone: "(555) 123-4567",
    email: "hematology@hospital.com",
    specialties: [
      "Complete Blood Count",
      "Coagulation Studies",
      "Blood Smears",
      "Bone Marrow Analysis",
      "Anemia Workup",
    ],
    turnaround: "Routine: 24 hours, STAT: 2-4 hours",
  },
  "biochemistry-lab": {
    id: "biochemistry-lab",
    name: "Biochemistry",
    address: "Laboratory Department, Building A",
    phone: "(555) 123-4568",
    email: "biochemistry@hospital.com",
    specialties: [
      "Liver Function Tests",
      "Kidney Function Tests",
      "Lipid Profile",
      "Glucose Studies",
      "Electrolytes",
      "Urinalysis",
    ],
    turnaround: "Routine: 24-48 hours, STAT: 4-6 hours",
  },
  "microbiology-lab": {
    id: "microbiology-lab",
    name: "Microbiology & Infection Diseases",
    address: "Laboratory Department, Building B",
    phone: "(555) 123-4569",
    email: "microbiology@hospital.com",
    specialties: [
      "Blood Culture",
      "Urine Culture",
      "Sputum Culture",
      "Stool Tests",
      "PCR/NAAT",
      "Antimicrobial Susceptibility",
    ],
    turnaround: "Routine: 48-72 hours, STAT: 24 hours (preliminary)",
  },
  "immunology-lab": {
    id: "immunology-lab",
    name: "Immunology & Serology",
    address: "Laboratory Department, Building B",
    phone: "(555) 123-4570",
    email: "immunology@hospital.com",
    specialties: [
      "Hepatitis Markers",
      "HIV Testing",
      "Tumor Markers",
      "Autoimmune Tests",
      "Allergy Testing",
      "TORCH Panel",
    ],
    turnaround: "Routine: 3-5 days, STAT: 24-48 hours",
  },
  "histopathology-lab": {
    id: "histopathology-lab",
    name: "Histopathology & Cytology",
    address: "Laboratory Department, Building C",
    phone: "(555) 123-4571",
    email: "histopathology@hospital.com",
    specialties: [
      "Biopsy Examination",
      "FNAC",
      "Cervical Cancer Screening",
      "Special Stains",
      "Immunohistochemistry",
      "Cytology",
    ],
    turnaround: "Routine: 5-7 days, STAT: 48-72 hours (frozen section: 30 min)",
  },
};

// Test Packages organized by Laboratory
export const TEST_PACKAGES: Record<string, TestPackage> = {
  // HEMATOLOGY
  cbc: {
    id: "cbc",
    name: "Complete Blood Count (CBC)",
    category: "Hematology",
    description: "Comprehensive blood analysis including red cells, white cells, platelets and related parameters",
    tests: ["rbc", "wbc", "hemoglobin", "hematocrit", "platelets", "esr", "pt-aptt", "reticulocyte"],
    snomedCode: "104177005",
  },
  "peripheral-blood-smear": {
    id: "peripheral-blood-smear",
    name: "Peripheral Blood Smear",
    category: "Hematology",
    description: "Microscopic examination of blood cells for abnormalities",
    tests: ["sickle-cells", "blasts", "parasites"],
    snomedCode: "104177006",
  },
  "anemia-workup": {
    id: "anemia-workup",
    name: "Anemia Workup",
    category: "Hematology",
    description: "Complete evaluation for anemia including iron studies",
    tests: ["ferritin", "iron", "b12", "folate", "bleeding-time", "clotting-time", "pt-inr", "aptt"],
    snomedCode: "394979004",
  },
  "hematology-specialized": {
    id: "hematology-specialized",
    name: "Specialized Hematology Tests",
    category: "Hematology",
    description: "Advanced hematology tests for specific conditions",
    tests: ["malaria-parasite", "microfilaria", "iron-studies-hb-electrophoresis", "bone-marrow-exam"],
    snomedCode: "394979005",
  },

  // BIOCHEMISTRY
  "liver-function": {
    id: "liver-function",
    name: "Liver Function Tests (LFT)",
    category: "Biochemistry",
    description: "Comprehensive liver function tests including enzymes, proteins, and bilirubin",
    tests: ["alt", "ast", "alp", "ggt", "ldh", "bilirubin", "albumin", "pt-inr-lft"],
    snomedCode: "166712004",
  },
  "kidney-function": {
    id: "kidney-function",
    name: "Kidney Function Tests (KFT)",
    category: "Biochemistry",
    description: "Complete renal function assessment",
    tests: ["creatinine", "urea", "egfr"],
    snomedCode: "166735006",
  },
  urinalysis: {
    id: "urinalysis",
    name: "Urinalysis",
    category: "Biochemistry",
    description: "Comprehensive urine analysis including chemistry",
    tests: ["urine-protein", "urine-glucose", "urine-ketones", "urine-blood", "urine-bilirubin", "urine-nitrite-leukocyte", "urine-24h-creatinine"],
    snomedCode: "309902002",
  },
  "lipid-glucose": {
    id: "lipid-glucose",
    name: "Lipid Profile & Glucose Tests",
    category: "Biochemistry",
    description: "Complete lipid and glucose analysis",
    tests: ["hdl", "ldl", "triglycerides", "vldl", "glucose", "hba1c", "fpg", "ogtt"],
    snomedCode: "473010000",
  },
  "electrolyte-metabolic": {
    id: "electrolyte-metabolic",
    name: "Electrolyte & Metabolic Panel",
    category: "Biochemistry",
    description: "Complete electrolyte and metabolic assessment",
    tests: ["sodium", "potassium", "calcium", "chloride", "bicarbonate", "uric-acid", "protein-electrophoresis"],
    snomedCode: "271236005",
  },

  // MICROBIOLOGY
  "blood-culture": {
    id: "blood-culture",
    name: "Blood Culture",
    category: "Microbiology",
    description: "Detection of bloodstream infections",
    tests: ["bacteremia", "fungemia"],
    snomedCode: "30088009",
  },
  "urine-culture": {
    id: "urine-culture",
    name: "Urine Culture",
    category: "Microbiology",
    description: "Detection of urinary tract infections",
    tests: ["uti-diagnosis"],
    snomedCode: "275885009",
  },
  "sputum-culture": {
    id: "sputum-culture",
    name: "Sputum Culture",
    category: "Microbiology",
    description: "Detection of respiratory infections",
    tests: ["sputum-culture-test"],
    snomedCode: "269911007",
  },
  "stool-tests": {
    id: "stool-tests",
    name: "Stool Tests",
    category: "Microbiology",
    description: "Comprehensive stool analysis",
    tests: ["stool-parasites", "c-difficile", "occult-blood", "pcr-naat"],
    snomedCode: "104435004",
  },

  // IMMUNOLOGY
  "general-immunology": {
    id: "general-immunology",
    name: "General Immunology Tests",
    category: "Immunology",
    description: "Basic immunological markers",
    tests: ["ana", "rf", "anti-ccp", "crp"],
    snomedCode: "252385000",
  },
  "hepatitis-viral": {
    id: "hepatitis-viral",
    name: "Hepatitis & Viral Markers",
    category: "Immunology",
    description: "Comprehensive viral infection screening",
    tests: ["hbsag", "anti-hbs", "anti-hbc", "anti-hcv", "hiv-antibody", "covid19-antibody"],
    snomedCode: "424972004",
  },
  "torch-panel": {
    id: "torch-panel",
    name: "TORCH Panel",
    category: "Immunology",
    description: "Screening for congenital infections",
    tests: ["toxoplasmosis", "rubella", "cmv", "herpes"],
    snomedCode: "252385001",
  },
  "autoimmune-panel": {
    id: "autoimmune-panel",
    name: "Autoimmune Panel",
    category: "Immunology",
    description: "Comprehensive autoimmune disease screening",
    tests: ["vdrl", "tpha", "ana-autoimmune", "anti-dsdna", "anti-smith", "anti-rnp", "anti-ssa-ssb", "anca", "ama", "anti-tpo-thyroglobulin"],
    snomedCode: "252385002",
  },
  "tumor-markers": {
    id: "tumor-markers",
    name: "Tumor Markers",
    category: "Immunology",
    description: "Cancer screening markers",
    tests: ["cea", "ca125", "ca199", "beta2-glycoprotein-anticardiolipin"],
    snomedCode: "399370006",
  },

  // HISTOPATHOLOGY
  "routine-histopathology": {
    id: "routine-histopathology",
    name: "Routine Histopathology",
    category: "Histopathology",
    description: "Standard tissue and cell examination",
    tests: ["biopsy-exam", "cervical-cancer-screening", "fnac"],
    snomedCode: "252385007",
  },
  "special-stains": {
    id: "special-stains",
    name: "Special Stains",
    category: "Histopathology",
    description: "Advanced staining techniques for diagnosis",
    tests: ["pas", "ziehl-neelsen", "silver-stain", "ihc"],
    snomedCode: "252385008",
  },
  "molecular-pathology": {
    id: "molecular-pathology",
    name: "Molecular Pathology",
    category: "Histopathology",
    description: "Molecular and genetic testing",
    tests: ["pcr-molecular", "fish", "genetic-sequencing", "urine-cytology", "sputum-cytology"],
    snomedCode: "252385009",
  },
};

// Individual Tests (subset - add more as needed)
export const INDIVIDUAL_TESTS: Record<string, TestItem> = {
  // HEMATOLOGY - CBC
  rbc: { id: "rbc", name: "RBCs", code: "RBC", category: "Hematology", material: "Blood", snomedCode: "165716006" },
  wbc: { id: "wbc", name: "WBCs", code: "WBC", category: "Hematology", material: "Blood", snomedCode: "165717003" },
  hemoglobin: { id: "hemoglobin", name: "Hemoglobin", code: "HGB", category: "Hematology", material: "Blood", snomedCode: "165718008" },
  hematocrit: { id: "hematocrit", name: "Hematocrit", code: "HCT", category: "Hematology", material: "Blood", snomedCode: "165719001" },
  platelets: { id: "platelets", name: "Platelets", code: "PLT", category: "Hematology", material: "Blood", snomedCode: "165720006" },
  esr: { id: "esr", name: "ESR", code: "ESR", category: "Hematology", material: "Blood", snomedCode: "165725002" },
  "pt-aptt": { id: "pt-aptt", name: "PT/aPTT", code: "PT-APTT", category: "Hematology", material: "Blood", snomedCode: "165726001" },
  reticulocyte: { id: "reticulocyte", name: "Reticulocyte Count", code: "RETIC", category: "Hematology", material: "Blood", snomedCode: "165731004" },
  
  // HEMATOLOGY - Blood Smear
  "sickle-cells": { id: "sickle-cells", name: "Sickle Cells", code: "SICKLE", category: "Hematology", material: "Blood", snomedCode: "165732001" },
  blasts: { id: "blasts", name: "Blasts", code: "BLAST", category: "Hematology", material: "Blood", snomedCode: "165733002" },
  parasites: { id: "parasites", name: "Parasites", code: "PARA", category: "Hematology", material: "Blood", snomedCode: "165734003" },
  
  // HEMATOLOGY - Anemia Workup
  ferritin: { id: "ferritin", name: "Ferritin", code: "FERR", category: "Hematology", material: "Blood", snomedCode: "165776002" },
  iron: { id: "iron", name: "Iron", code: "IRON", category: "Hematology", material: "Blood", snomedCode: "165777001" },
  b12: { id: "b12", name: "Vitamin B12", code: "B12", category: "Hematology", material: "Blood", snomedCode: "165778006" },
  folate: { id: "folate", name: "Folate", code: "FOLATE", category: "Hematology", material: "Blood", snomedCode: "165779000" },
  "bleeding-time": { id: "bleeding-time", name: "Bleeding Time (BT)", code: "BT", category: "Hematology", material: "Blood", snomedCode: "165729008" },
  "clotting-time": { id: "clotting-time", name: "Clotting Time (CT)", code: "CT", category: "Hematology", material: "Blood", snomedCode: "165730003" },
  "pt-inr": { id: "pt-inr", name: "Prothrombin Time (PT & INR)", code: "PT-INR", category: "Hematology", material: "Blood", snomedCode: "165726001" },
  aptt: { id: "aptt", name: "APTT", code: "APTT", category: "Hematology", material: "Blood", snomedCode: "165727005" },
  
  // HEMATOLOGY - Specialized
  "malaria-parasite": { id: "malaria-parasite", name: "Malaria Parasite Detection", code: "MALARIA", category: "Hematology", material: "Blood", snomedCode: "165735001" },
  microfilaria: { id: "microfilaria", name: "Microfilaria Test", code: "MICROF", category: "Hematology", material: "Blood", snomedCode: "165736002" },
  "iron-studies-hb-electrophoresis": { id: "iron-studies-hb-electrophoresis", name: "Iron Studies & Hemoglobin Electrophoresis", code: "IRON-HB", category: "Hematology", material: "Blood", snomedCode: "165737003" },
  "bone-marrow-exam": { id: "bone-marrow-exam", name: "Bone Marrow Examination", code: "BM-EXAM", category: "Hematology", material: "Bone Marrow", snomedCode: "165738004" },
  
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
  
  // IMMUNOLOGY
  ana: { id: "ana", name: "ANA", code: "ANA", category: "Immunology", material: "Blood", snomedCode: "165780003" },
  rf: { id: "rf", name: "Rheumatoid Factor (RF)", code: "RF", category: "Immunology", material: "Blood", snomedCode: "165781004" },
  "anti-ccp": { id: "anti-ccp", name: "Anti-CCP", code: "CCP", category: "Immunology", material: "Blood", snomedCode: "165782006" },
  crp: { id: "crp", name: "C-Reactive Protein (CRP)", code: "CRP", category: "Immunology", material: "Blood", snomedCode: "165783001" },
  hbsag: { id: "hbsag", name: "HBsAg", code: "HBSAG", category: "Immunology", material: "Blood", snomedCode: "165784007" },
  "anti-hbs": { id: "anti-hbs", name: "Anti-HBs", code: "ANTI-HBS", category: "Immunology", material: "Blood", snomedCode: "165785008" },
  "anti-hbc": { id: "anti-hbc", name: "Anti-HBc", code: "ANTI-HBC", category: "Immunology", material: "Blood", snomedCode: "165786009" },
  "anti-hcv": { id: "anti-hcv", name: "Anti-HCV", code: "ANTI-HCV", category: "Immunology", material: "Blood", snomedCode: "165787000" },
  "hiv-antibody": { id: "hiv-antibody", name: "HIV Antibody", code: "HIV", category: "Immunology", material: "Blood", snomedCode: "165788005" },
  "covid19-antibody": { id: "covid19-antibody", name: "COVID-19 Antibody", code: "COVID-AB", category: "Immunology", material: "Blood", snomedCode: "165789002" },
  toxoplasmosis: { id: "toxoplasmosis", name: "Toxoplasmosis", code: "TOXO", category: "Immunology", material: "Blood", snomedCode: "165790006" },
  rubella: { id: "rubella", name: "Rubella", code: "RUBELLA", category: "Immunology", material: "Blood", snomedCode: "165791005" },
  cmv: { id: "cmv", name: "CMV", code: "CMV", category: "Immunology", material: "Blood", snomedCode: "165792003" },
  herpes: { id: "herpes", name: "Herpes", code: "HERPES", category: "Immunology", material: "Blood", snomedCode: "165793008" },
  vdrl: { id: "vdrl", name: "VDRL", code: "VDRL", category: "Immunology", material: "Blood", snomedCode: "165794002" },
  tpha: { id: "tpha", name: "TPHA", code: "TPHA", category: "Immunology", material: "Blood", snomedCode: "165795001" },
  "ana-autoimmune": { id: "ana-autoimmune", name: "ANA", code: "ANA", category: "Immunology", material: "Blood", snomedCode: "165796002" },
  "anti-dsdna": { id: "anti-dsdna", name: "Anti-dsDNA", code: "DSDNA", category: "Immunology", material: "Blood", snomedCode: "165797006" },
  "anti-smith": { id: "anti-smith", name: "Anti-Smith", code: "SMITH", category: "Immunology", material: "Blood", snomedCode: "165798001" },
  "anti-rnp": { id: "anti-rnp", name: "Anti-RNP", code: "RNP", category: "Immunology", material: "Blood", snomedCode: "165799009" },
  "anti-ssa-ssb": { id: "anti-ssa-ssb", name: "Anti-SSA/SSB", code: "SSA-SSB", category: "Immunology", material: "Blood", snomedCode: "165800008" },
  anca: { id: "anca", name: "ANCA", code: "ANCA", category: "Immunology", material: "Blood", snomedCode: "165801007" },
  ama: { id: "ama", name: "AMA", code: "AMA", category: "Immunology", material: "Blood", snomedCode: "165802000" },
  "anti-tpo-thyroglobulin": { id: "anti-tpo-thyroglobulin", name: "Anti-TPO & Thyroglobulin", code: "TPO-TG", category: "Immunology", material: "Blood", snomedCode: "165803005" },
  cea: { id: "cea", name: "CEA", code: "CEA", category: "Immunology", material: "Blood", snomedCode: "165804004" },
  ca125: { id: "ca125", name: "CA 125", code: "CA125", category: "Immunology", material: "Blood", snomedCode: "165805003" },
  ca199: { id: "ca199", name: "CA 19-9", code: "CA199", category: "Immunology", material: "Blood", snomedCode: "165806002" },
  "beta2-glycoprotein-anticardiolipin": { id: "beta2-glycoprotein-anticardiolipin", name: "Beta-2 Glycoprotein & Anticardiolipin", code: "B2GP-ACL", category: "Immunology", material: "Blood", snomedCode: "165807006" },
  
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
