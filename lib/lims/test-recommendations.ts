/**
 * Complete Test Sample Recommendations for all 104 tests
 * Organized by laboratory department
 */

export interface TestRecommendation {
  testCode: string;
  testName: string;
  sampleType: string;
  containerType: string;
  volume: number;
  volumeUnit: string;
  fastingRequired: boolean;
  specialInstructions?: string;
}

export interface OrderRecommendations {
  primarySampleType: string;
  primaryContainer: string;
  totalVolume: number;
  volumeUnit: string;
  fastingRequired: boolean;
  recommendations: TestRecommendation[];
  specialInstructions: string[];
}

const TEST_REQUIREMENTS: Record<string, TestRecommendation> = {
  // HEMATOLOGY - CBC Components
  'RBC': { testCode: 'RBC', testName: 'Red Blood Cells', sampleType: 'blood', containerType: 'EDTA Tube', volume: 2, volumeUnit: 'mL', fastingRequired: false, specialInstructions: 'Gently invert 8-10 times' },
  'WBC': { testCode: 'WBC', testName: 'White Blood Cells', sampleType: 'blood', containerType: 'EDTA Tube', volume: 2, volumeUnit: 'mL', fastingRequired: false, specialInstructions: 'Gently invert 8-10 times' },
  'HGB': { testCode: 'HGB', testName: 'Hemoglobin', sampleType: 'blood', containerType: 'EDTA Tube', volume: 2, volumeUnit: 'mL', fastingRequired: false },
  'HCT': { testCode: 'HCT', testName: 'Hematocrit', sampleType: 'blood', containerType: 'EDTA Tube', volume: 2, volumeUnit: 'mL', fastingRequired: false },
  'PLT': { testCode: 'PLT', testName: 'Platelets', sampleType: 'blood', containerType: 'EDTA Tube', volume: 2, volumeUnit: 'mL', fastingRequired: false },
  'ESR': { testCode: 'ESR', testName: 'ESR', sampleType: 'blood', containerType: 'ESR Tube', volume: 2, volumeUnit: 'mL', fastingRequired: false },
  'PT-APTT': { testCode: 'PT-APTT', testName: 'PT/aPTT', sampleType: 'blood', containerType: 'Sodium Citrate Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false, specialInstructions: 'Fill tube completely' },
  'RETIC': { testCode: 'RETIC', testName: 'Reticulocyte Count', sampleType: 'blood', containerType: 'EDTA Tube', volume: 2, volumeUnit: 'mL', fastingRequired: false },
  
  // HEMATOLOGY - Blood Smear
  'SICKLE': { testCode: 'SICKLE', testName: 'Sickle Cells', sampleType: 'blood', containerType: 'EDTA Tube', volume: 2, volumeUnit: 'mL', fastingRequired: false },
  'BLAST': { testCode: 'BLAST', testName: 'Blasts', sampleType: 'blood', containerType: 'EDTA Tube', volume: 2, volumeUnit: 'mL', fastingRequired: false },
  'PARA': { testCode: 'PARA', testName: 'Parasites', sampleType: 'blood', containerType: 'EDTA Tube', volume: 2, volumeUnit: 'mL', fastingRequired: false },
  
  // HEMATOLOGY - Anemia Workup
  'FERR': { testCode: 'FERR', testName: 'Ferritin', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'IRON': { testCode: 'IRON', testName: 'Iron', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: true, specialInstructions: 'Morning sample preferred' },
  'B12': { testCode: 'B12', testName: 'Vitamin B12', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'FOLATE': { testCode: 'FOLATE', testName: 'Folate', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'BT': { testCode: 'BT', testName: 'Bleeding Time', sampleType: 'blood', containerType: 'No tube required', volume: 0, volumeUnit: 'mL', fastingRequired: false, specialInstructions: 'Performed at bedside' },
  'CT': { testCode: 'CT', testName: 'Clotting Time', sampleType: 'blood', containerType: 'Plain Tube', volume: 2, volumeUnit: 'mL', fastingRequired: false },
  'PT-INR': { testCode: 'PT-INR', testName: 'PT & INR', sampleType: 'blood', containerType: 'Sodium Citrate Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'APTT': { testCode: 'APTT', testName: 'APTT', sampleType: 'blood', containerType: 'Sodium Citrate Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  
  // HEMATOLOGY - Specialized
  'MALARIA': { testCode: 'MALARIA', testName: 'Malaria Parasite', sampleType: 'blood', containerType: 'EDTA Tube', volume: 2, volumeUnit: 'mL', fastingRequired: false },
  'MICROF': { testCode: 'MICROF', testName: 'Microfilaria', sampleType: 'blood', containerType: 'EDTA Tube', volume: 2, volumeUnit: 'mL', fastingRequired: false, specialInstructions: 'Night blood sample (10 PM - 2 AM)' },
  'IRON-HB': { testCode: 'IRON-HB', testName: 'Iron Studies & Hb Electrophoresis', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: true },
  'BM-EXAM': { testCode: 'BM-EXAM', testName: 'Bone Marrow Examination', sampleType: 'bone marrow', containerType: 'Special Container', volume: 2, volumeUnit: 'mL', fastingRequired: false, specialInstructions: 'Procedure performed by specialist' },
  
  // BIOCHEMISTRY - Liver Function
  'ALT': { testCode: 'ALT', testName: 'ALT (SGPT)', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'AST': { testCode: 'AST', testName: 'AST (SGOT)', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'ALP': { testCode: 'ALP', testName: 'Alkaline Phosphatase', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'GGT': { testCode: 'GGT', testName: 'GGT', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'LDH': { testCode: 'LDH', testName: 'LDH', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'BILI': { testCode: 'BILI', testName: 'Bilirubin (Total & Direct)', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false, specialInstructions: 'Protect from light' },
  'ALB': { testCode: 'ALB', testName: 'Albumin', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  
  // BIOCHEMISTRY - Kidney Function
  'CREAT': { testCode: 'CREAT', testName: 'Creatinine', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'UREA': { testCode: 'UREA', testName: 'Urea/BUN', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'EGFR': { testCode: 'EGFR', testName: 'eGFR', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  
  // BIOCHEMISTRY - Urinalysis
  'U-PROT': { testCode: 'U-PROT', testName: 'Urine Protein', sampleType: 'urine', containerType: 'Sterile Container', volume: 10, volumeUnit: 'mL', fastingRequired: false },
  'U-GLU': { testCode: 'U-GLU', testName: 'Urine Glucose', sampleType: 'urine', containerType: 'Sterile Container', volume: 10, volumeUnit: 'mL', fastingRequired: false },
  'U-KET': { testCode: 'U-KET', testName: 'Urine Ketones', sampleType: 'urine', containerType: 'Sterile Container', volume: 10, volumeUnit: 'mL', fastingRequired: false },
  'U-BLOOD': { testCode: 'U-BLOOD', testName: 'Urine Blood', sampleType: 'urine', containerType: 'Sterile Container', volume: 10, volumeUnit: 'mL', fastingRequired: false },
  'U-BILI': { testCode: 'U-BILI', testName: 'Urine Bilirubin', sampleType: 'urine', containerType: 'Sterile Container', volume: 10, volumeUnit: 'mL', fastingRequired: false },
  'U-NIT-LE': { testCode: 'U-NIT-LE', testName: 'Urine Nitrite & Leukocyte Esterase', sampleType: 'urine', containerType: 'Sterile Container', volume: 10, volumeUnit: 'mL', fastingRequired: false },
  'U-24H-CR': { testCode: 'U-24H-CR', testName: '24-Hour Urine Creatinine', sampleType: 'urine', containerType: '24-Hour Collection Container', volume: 2000, volumeUnit: 'mL', fastingRequired: false, specialInstructions: 'Collect all urine for 24 hours' },
  
  // BIOCHEMISTRY - Lipid & Glucose
  'HDL': { testCode: 'HDL', testName: 'HDL Cholesterol', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: true, specialInstructions: '12-14 hour fast required' },
  'LDL': { testCode: 'LDL', testName: 'LDL Cholesterol', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: true, specialInstructions: '12-14 hour fast required' },
  'TRIG': { testCode: 'TRIG', testName: 'Triglycerides', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: true, specialInstructions: '12-14 hour fast required' },
  'VLDL': { testCode: 'VLDL', testName: 'VLDL Cholesterol', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: true, specialInstructions: '12-14 hour fast required' },
  'GLU': { testCode: 'GLU', testName: 'Glucose', sampleType: 'blood', containerType: 'Fluoride Tube', volume: 2, volumeUnit: 'mL', fastingRequired: true, specialInstructions: '8-12 hour fast for fasting glucose' },
  'HBA1C': { testCode: 'HBA1C', testName: 'HbA1c', sampleType: 'blood', containerType: 'EDTA Tube', volume: 2, volumeUnit: 'mL', fastingRequired: false },
  'FPG': { testCode: 'FPG', testName: 'Fasting Plasma Glucose', sampleType: 'blood', containerType: 'Fluoride Tube', volume: 2, volumeUnit: 'mL', fastingRequired: true, specialInstructions: '8-12 hour fast required' },
  'OGTT': { testCode: 'OGTT', testName: 'Oral Glucose Tolerance Test', sampleType: 'blood', containerType: 'Fluoride Tube', volume: 6, volumeUnit: 'mL', fastingRequired: true, specialInstructions: '8-12 hour fast, multiple samples required' },
  
  // BIOCHEMISTRY - Electrolytes
  'NA': { testCode: 'NA', testName: 'Sodium', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'K': { testCode: 'K', testName: 'Potassium', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'CA': { testCode: 'CA', testName: 'Calcium', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'CL': { testCode: 'CL', testName: 'Chloride', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'HCO3': { testCode: 'HCO3', testName: 'Bicarbonate', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'URIC': { testCode: 'URIC', testName: 'Uric Acid', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'PROT-ELEC': { testCode: 'PROT-ELEC', testName: 'Protein Electrophoresis', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  
  // MICROBIOLOGY
  'BACT': { testCode: 'BACT', testName: 'Bacteremia', sampleType: 'blood', containerType: 'Blood Culture Bottle', volume: 10, volumeUnit: 'mL', fastingRequired: false, specialInstructions: 'Aseptic technique, collect before antibiotics' },
  'FUNG': { testCode: 'FUNG', testName: 'Fungemia', sampleType: 'blood', containerType: 'Blood Culture Bottle', volume: 10, volumeUnit: 'mL', fastingRequired: false, specialInstructions: 'Aseptic technique' },
  'UTI': { testCode: 'UTI', testName: 'Urine Culture', sampleType: 'urine', containerType: 'Sterile Container', volume: 10, volumeUnit: 'mL', fastingRequired: false, specialInstructions: 'Midstream clean catch' },
  'SPUTUM': { testCode: 'SPUTUM', testName: 'Sputum Culture', sampleType: 'sputum', containerType: 'Sterile Sputum Container', volume: 5, volumeUnit: 'mL', fastingRequired: false, specialInstructions: 'Early morning deep cough specimen' },
  'PARA-ST': { testCode: 'PARA-ST', testName: 'Stool Parasites', sampleType: 'stool', containerType: 'Stool Container', volume: 10, volumeUnit: 'g', fastingRequired: false },
  'C-DIFF': { testCode: 'C-DIFF', testName: 'C. difficile', sampleType: 'stool', containerType: 'Stool Container', volume: 10, volumeUnit: 'g', fastingRequired: false },
  'OB': { testCode: 'OB', testName: 'Occult Blood', sampleType: 'stool', containerType: 'Stool Container', volume: 5, volumeUnit: 'g', fastingRequired: false },
  'PCR': { testCode: 'PCR', testName: 'PCR/NAAT', sampleType: 'tissue', containerType: 'Formalin Container', volume: 1, volumeUnit: 'cm³', fastingRequired: false, specialInstructions: 'Fresh tissue preferred, minimum 1cm³' },
  
  // IMMUNOLOGY
  'ANA': { testCode: 'ANA', testName: 'ANA', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'RF': { testCode: 'RF', testName: 'Rheumatoid Factor', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'CCP': { testCode: 'CCP', testName: 'Anti-CCP', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'CRP': { testCode: 'CRP', testName: 'C-Reactive Protein', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'HBSAG': { testCode: 'HBSAG', testName: 'HBsAg', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'ANTI-HBS': { testCode: 'ANTI-HBS', testName: 'Anti-HBs', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'ANTI-HBC': { testCode: 'ANTI-HBC', testName: 'Anti-HBc', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'ANTI-HCV': { testCode: 'ANTI-HCV', testName: 'Anti-HCV', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'HIV': { testCode: 'HIV', testName: 'HIV Antibody', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'COVID-AB': { testCode: 'COVID-AB', testName: 'COVID-19 Antibody', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'TOXO': { testCode: 'TOXO', testName: 'Toxoplasmosis', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'RUBELLA': { testCode: 'RUBELLA', testName: 'Rubella', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'CMV': { testCode: 'CMV', testName: 'CMV', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'HERPES': { testCode: 'HERPES', testName: 'Herpes', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'VDRL': { testCode: 'VDRL', testName: 'VDRL', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'TPHA': { testCode: 'TPHA', testName: 'TPHA', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 3, volumeUnit: 'mL', fastingRequired: false },
  'DSDNA': { testCode: 'DSDNA', testName: 'Anti-dsDNA', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'SMITH': { testCode: 'SMITH', testName: 'Anti-Smith', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'RNP': { testCode: 'RNP', testName: 'Anti-RNP', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'SSA-SSB': { testCode: 'SSA-SSB', testName: 'Anti-SSA/SSB', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'ANCA': { testCode: 'ANCA', testName: 'ANCA', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'AMA': { testCode: 'AMA', testName: 'AMA', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'TPO-TG': { testCode: 'TPO-TG', testName: 'Anti-TPO & Thyroglobulin', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'CEA': { testCode: 'CEA', testName: 'CEA', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'CA125': { testCode: 'CA125', testName: 'CA 125', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'CA199': { testCode: 'CA199', testName: 'CA 19-9', sampleType: 'blood', containerType: 'Serum Separator Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  'B2GP-ACL': { testCode: 'B2GP-ACL', testName: 'Beta-2 Glycoprotein & Anticardiolipin', sampleType: 'blood', containerType: 'Sodium Citrate Tube', volume: 5, volumeUnit: 'mL', fastingRequired: false },
  
  // HISTOPATHOLOGY
  'BIOPSY': { testCode: 'BIOPSY', testName: 'Biopsy Examination', sampleType: 'tissue', containerType: 'Formalin Container', volume: 2, volumeUnit: 'cm³', fastingRequired: false, specialInstructions: 'Fix tissue immediately in 10% formalin, minimum 1-2cm³' },
  'PAP': { testCode: 'PAP', testName: 'Pap Smear', sampleType: 'cervical cells', containerType: 'Cytology Container', volume: 1, volumeUnit: 'sample', fastingRequired: false, specialInstructions: 'Adequate cellular sample required' },
  'FNAC': { testCode: 'FNAC', testName: 'FNAC', sampleType: 'cells', containerType: 'Cytology Container', volume: 1, volumeUnit: 'sample', fastingRequired: false, specialInstructions: 'Multiple passes for adequate cellularity' },
  'PAS': { testCode: 'PAS', testName: 'PAS Stain', sampleType: 'tissue', containerType: 'Formalin Container', volume: 1, volumeUnit: 'cm³', fastingRequired: false },
  'ZN': { testCode: 'ZN', testName: 'Ziehl-Neelsen Stain', sampleType: 'tissue', containerType: 'Formalin Container', volume: 1, volumeUnit: 'cm³', fastingRequired: false },
  'SILVER': { testCode: 'SILVER', testName: 'Silver Stain', sampleType: 'tissue', containerType: 'Formalin Container', volume: 1, volumeUnit: 'cm³', fastingRequired: false },
  'IHC': { testCode: 'IHC', testName: 'Immunohistochemistry', sampleType: 'tissue', containerType: 'Formalin Container', volume: 2, volumeUnit: 'cm³', fastingRequired: false, specialInstructions: 'Representative tissue sample required' },
  'FISH': { testCode: 'FISH', testName: 'FISH', sampleType: 'tissue', containerType: 'Formalin Container', volume: 1, volumeUnit: 'cm³', fastingRequired: false, specialInstructions: 'Fixed tissue required, minimum 1cm³' },
  'SEQ': { testCode: 'SEQ', testName: 'Genetic Sequencing', sampleType: 'tissue', containerType: 'Formalin Container', volume: 2, volumeUnit: 'cm³', fastingRequired: false, specialInstructions: 'High-quality DNA required, minimum 2cm³, avoid necrotic tissue' },
  'URINE-CYTO': { testCode: 'URINE-CYTO', testName: 'Urine Cytology', sampleType: 'urine', containerType: 'Sterile Container with Fixative', volume: 50, volumeUnit: 'mL', fastingRequired: false, specialInstructions: 'First morning void preferred' },
  'SPUTUM-CYTO': { testCode: 'SPUTUM-CYTO', testName: 'Sputum Cytology', sampleType: 'sputum', containerType: 'Sterile Sputum Container', volume: 5, volumeUnit: 'mL', fastingRequired: false, specialInstructions: 'Early morning collection' },
};

/**
 * Find a test recommendation by code or name (fuzzy matching).
 * Tries: exact code → uppercase code → keyword matching on test name.
 */
export function findRecommendation(testCode?: string, testName?: string): TestRecommendation | null {
  if (!testCode && !testName) return null;

  // 1. Exact code match
  if (testCode && TEST_REQUIREMENTS[testCode]) return TEST_REQUIREMENTS[testCode];

  // 2. Uppercase code match
  if (testCode && TEST_REQUIREMENTS[testCode.toUpperCase()]) return TEST_REQUIREMENTS[testCode.toUpperCase()];

  // 3. Keyword matching against TEST_REQUIREMENTS entries using code or name
  const searchTerms = [testCode, testName].filter(Boolean).map(s => s!.toLowerCase());
  const entries = Object.values(TEST_REQUIREMENTS);

  for (const entry of entries) {
    const entryName = entry.testName.toLowerCase();
    const entryCode = entry.testCode.toLowerCase();
    for (const term of searchTerms) {
      // Check if the search term contains the entry name or code, or vice versa
      if (
        term.includes(entryName) || entryName.includes(term) ||
        term.includes(entryCode) || entryCode.includes(term)
      ) {
        return entry;
      }
    }
  }

  // 4. Partial keyword match (e.g. "Cytomegalovirus-IgM" → "CMV" via common abbreviation mapping)
  const KEYWORD_MAP: Record<string, string> = {
    'cytomegalovirus': 'CMV',
    'toxoplasmosis': 'TOXO',
    'toxoplasma': 'TOXO',
    'herpes': 'HERPES',
    'hsv': 'HERPES',
    'rubella': 'RUBELLA',
    'hepatitis b': 'HBSAG',
    'hbsag': 'HBSAG',
    'hepatitis c': 'ANTI-HCV',
    'hiv': 'HIV',
    'syphilis': 'VDRL',
    'glucose': 'FBS',
    'blood sugar': 'FBS',
    'hemoglobin': 'HGB',
    'haemoglobin': 'HGB',
    'platelet': 'PLT',
    'creatinine': 'CREAT',
    'urea': 'UREA',
    'cholesterol': 'CHOL',
    'triglyceride': 'TG',
    'thyroid': 'TSH',
    'ferritin': 'FERRITIN',
    'iron': 'IRON',
    'calcium': 'CA',
    'potassium': 'K',
    'sodium': 'NA',
    'magnesium': 'MG',
    'phosphorus': 'PO4',
    'bilirubin': 'TBIL',
    'albumin': 'ALB',
    'protein': 'TP',
    'uric acid': 'UA',
    'bacteremia': 'BACT',
    'fungemia': 'FUNG',
    'culture': 'UTI',
  };

  for (const term of searchTerms) {
    for (const [keyword, code] of Object.entries(KEYWORD_MAP)) {
      if (term.includes(keyword)) {
        if (TEST_REQUIREMENTS[code]) return TEST_REQUIREMENTS[code];
      }
    }
  }

  return null;
}

export function getSampleRecommendations(testCodes: string[]): OrderRecommendations {
  if (!testCodes || testCodes.length === 0) {
    return {
      primarySampleType: '',
      primaryContainer: '',
      totalVolume: 0,
      volumeUnit: 'mL',
      fastingRequired: false,
      recommendations: [],
      specialInstructions: [],
    };
  }

  const recommendations = testCodes
    .map(code => TEST_REQUIREMENTS[code])
    .filter(Boolean);

  if (recommendations.length === 0) {
    return {
      primarySampleType: '',
      primaryContainer: '',
      totalVolume: 0,
      volumeUnit: 'mL',
      fastingRequired: false,
      recommendations: [],
      specialInstructions: [],
    };
  }

  const sampleTypeGroups = recommendations.reduce((acc, rec) => {
    acc[rec.sampleType] = (acc[rec.sampleType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const primarySampleType = Object.keys(sampleTypeGroups).length > 0
    ? Object.entries(sampleTypeGroups).sort((a, b) => b[1] - a[1])[0][0]
    : '';

  const primaryTests = recommendations.filter(r => r.sampleType === primarySampleType);
  const primaryContainer = primaryTests.length > 0 ? primaryTests[0].containerType : '';
  const primaryVolumeUnit = primaryTests.length > 0 ? primaryTests[0].volumeUnit : 'mL';

  // Calculate total volume - only apply buffer for liquid samples (mL, L)
  const shouldApplyBuffer = primaryVolumeUnit === 'mL' || primaryVolumeUnit === 'L';
  const totalVolume = shouldApplyBuffer 
    ? Math.ceil(recommendations.reduce((sum, rec) => sum + rec.volume, 0) * 1.2)
    : Math.ceil(recommendations.reduce((sum, rec) => sum + rec.volume, 0));

  const fastingRequired = recommendations.some(r => r.fastingRequired);

  const specialInstructions = recommendations
    .filter(r => r.specialInstructions)
    .map(r => `${r.testName}: ${r.specialInstructions}`);

  return {
    primarySampleType,
    primaryContainer,
    totalVolume,
    volumeUnit: primaryVolumeUnit,
    fastingRequired,
    recommendations,
    specialInstructions,
  };
}

/**
 * Map common service/package names (used by openEHR orders) to their constituent test codes
 * so we can derive specimen types, containers, and volumes for orders that only carry a service_name.
 */
const SERVICE_NAME_TO_TEST_CODES: Record<string, string[]> = {
  // Hematology
  'Complete Blood Count': ['RBC', 'WBC', 'HGB', 'HCT', 'PLT'],
  'CBC': ['RBC', 'WBC', 'HGB', 'HCT', 'PLT'],
  'ESR': ['ESR'],
  'PT/aPTT': ['PT-APTT'],
  'Reticulocyte Count': ['RETIC'],
  'Bleeding Time': ['BT'],
  'Clotting Time': ['CT'],
  'PT & INR': ['PT-INR'],
  'APTT': ['APTT'],
  'Malaria Parasite': ['MALARIA'],
  'Microfilaria': ['MICROF'],
  'Iron Studies & Hb Electrophoresis': ['IRON-HB'],
  'Bone Marrow Examination': ['BM-EXAM'],
  'Blood Smear': ['SICKLE', 'BLAST', 'PARA'],
  'Anemia Workup': ['FERR', 'IRON', 'B12', 'FOLATE'],

  // Biochemistry - Organ Function
  'Liver Function Tests (LFT)': ['ALT', 'AST', 'ALP', 'GGT', 'LDH', 'BILI', 'ALB'],
  'Liver Function Tests': ['ALT', 'AST', 'ALP', 'GGT', 'LDH', 'BILI', 'ALB'],
  'LFT': ['ALT', 'AST', 'ALP', 'GGT', 'LDH', 'BILI', 'ALB'],
  'Kidney Function Tests (KFT)': ['CREAT', 'UREA', 'EGFR'],
  'Kidney Function Tests': ['CREAT', 'UREA', 'EGFR'],
  'KFT': ['CREAT', 'UREA', 'EGFR'],
  'Renal Function Tests': ['CREAT', 'UREA', 'EGFR'],

  // Biochemistry - Lipid & Glucose
  'Lipid Profile': ['HDL', 'LDL', 'TRIG', 'VLDL'],
  'Fasting Blood Sugar': ['FPG'],
  'Random Blood Sugar': ['GLU'],
  'HbA1c': ['HBA1C'],
  'Oral Glucose Tolerance Test': ['OGTT'],

  // Biochemistry - Electrolytes
  'Electrolytes': ['NA', 'K', 'CA', 'CL', 'HCO3'],
  'Uric Acid': ['URIC'],
  'Protein Electrophoresis': ['PROT-ELEC'],

  // Biochemistry - Urinalysis
  'Urinalysis': ['U-PROT', 'U-GLU', 'U-KET', 'U-BLOOD', 'U-BILI', 'U-NIT-LE'],
  'Urine Routine': ['U-PROT', 'U-GLU', 'U-KET', 'U-BLOOD', 'U-BILI', 'U-NIT-LE'],
  '24-Hour Urine': ['U-24H-CR'],

  // Microbiology
  'Blood Culture': ['BACT', 'FUNG'],
  'Urine Culture': ['UTI'],
  'Sputum Culture': ['SPUTUM'],
  'Stool Examination': ['PARA-ST', 'OB'],
  'C. difficile': ['C-DIFF'],
  'PCR/NAAT': ['PCR'],

  // Immunology - Hepatitis
  'Hepatitis B Panel': ['HBSAG', 'ANTI-HBS', 'ANTI-HBC'],
  'HBsAg': ['HBSAG'],
  'Anti-HCV': ['ANTI-HCV'],
  'HIV': ['HIV'],

  // Immunology - Autoimmune
  'ANA': ['ANA'],
  'Rheumatoid Factor': ['RF'],
  'Anti-CCP': ['CCP'],
  'CRP': ['CRP'],
  'Autoimmune Panel': ['ANA', 'DSDNA', 'SMITH', 'RNP', 'SSA-SSB'],
  'TORCH Panel': ['TOXO', 'RUBELLA', 'CMV', 'HERPES'],
  'Syphilis Screening': ['VDRL', 'TPHA'],
  'ANCA': ['ANCA'],
  'Tumor Markers': ['CEA', 'CA125', 'CA199'],
  'Thyroid Antibodies': ['TPO-TG'],
  'Antiphospholipid Panel': ['B2GP-ACL'],

  // Histopathology
  'Biopsy': ['BIOPSY'],
  'Pap Smear': ['PAP'],
  'FNAC': ['FNAC'],
  'Special Stains': ['PAS', 'ZN', 'SILVER'],
  'Immunohistochemistry': ['IHC'],
  'FISH': ['FISH'],
  'Genetic Sequencing': ['SEQ'],
  'Urine Cytology': ['URINE-CYTO'],
  'Sputum Cytology': ['SPUTUM-CYTO'],
};

// Reverse mapping: test name (lowercase) -> test code
const TEST_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.values(TEST_REQUIREMENTS).map(t => [t.testName.toLowerCase(), t.testCode])
);

/**
 * Parse "Selected Tests (N): test1, test2" from a pipe-delimited description string
 * and resolve test names to test codes.
 */
export function resolveTestsFromDescription(description: string | undefined | null): string[] {
  if (!description) return [];
  
  // Parse pipe-delimited parts
  const parts = description.split('|').map(p => p.trim());
  for (const part of parts) {
    const match = part.match(/Selected Tests\s*\(\d+\)\s*:\s*(.+)/i);
    if (match) {
      const testNames = match[1].split(',').map(n => n.trim()).filter(Boolean);
      const codes: string[] = [];
      for (const name of testNames) {
        const lowerName = name.toLowerCase();
        // Direct name match
        if (TEST_NAME_TO_CODE[lowerName]) {
          codes.push(TEST_NAME_TO_CODE[lowerName]);
        } else {
          // Partial match
          const found = Object.entries(TEST_NAME_TO_CODE).find(
            ([tName]) => tName.includes(lowerName) || lowerName.includes(tName)
          );
          if (found) {
            codes.push(found[1]);
          } else {
            // Use the test name itself as a pseudo-code so the actual ordered tests
            // are preserved and the fallback to SERVICE_NAME_TO_TEST_CODES is prevented
            codes.push(name);
          }
        }
      }
      if (codes.length > 0) return codes;
    }
  }
  return [];
}

/**
 * Resolve test codes from a service/package name (case-insensitive, partial match)
 * Optionally also parses the description field for "Selected Tests" to get exact selections.
 */
export function resolveServiceToTestCodes(serviceName: string, description?: string | null): string[] {
  if (!serviceName) return [];
  
  // First try to parse specific selected tests from the description
  const fromDescription = resolveTestsFromDescription(description);
  if (fromDescription.length > 0) return fromDescription;
  
  // Exact match first
  if (SERVICE_NAME_TO_TEST_CODES[serviceName]) {
    return SERVICE_NAME_TO_TEST_CODES[serviceName];
  }
  
  // Case-insensitive match
  const lowerService = serviceName.toLowerCase().trim();
  for (const [key, codes] of Object.entries(SERVICE_NAME_TO_TEST_CODES)) {
    if (key.toLowerCase() === lowerService) return codes;
  }
  
  // Partial match - check if service name contains a known key or vice versa
  for (const [key, codes] of Object.entries(SERVICE_NAME_TO_TEST_CODES)) {
    if (lowerService.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerService)) {
      return codes;
    }
  }
  
  return [];
}

/**
 * Get sample recommendations by service name (for openEHR orders)
 */
export function getRecommendationsByServiceName(serviceName: string, description?: string | null): OrderRecommendations {
  const testCodes = resolveServiceToTestCodes(serviceName, description);
  return getSampleRecommendations(testCodes);
}

export function getContainerOptions(sampleType: string): string[] {
  const containers = Object.values(TEST_REQUIREMENTS)
    .filter(test => test.sampleType === sampleType)
    .map(test => test.containerType);
  return Array.from(new Set(containers));
}

export function getVolumeUnits(): string[] {
  return ['mL', 'L', 'g', 'cm³', 'sample'];
}
