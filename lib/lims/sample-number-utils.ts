/**
 * Client-side Sample Number Utilities
 * 
 * These utilities work on the client side without database dependencies
 * Used for parsing and displaying sample numbers in React components
 */

// Lab type and test group code mappings (client-side only)
const LAB_TYPE_CODES: Record<string, string> = {
  "biochemistry": "BIO",
  "hematology": "HEM", 
  "serology": "SER",
  "microbiology": "MIC",
  "immunology": "IMM",
  "parasitology": "PAR",
  "histopathology": "HIS",
  "cytology": "CYT",
  "molecular": "MOL",
  "toxicology": "TOX",
  "endocrinology": "END",
  "clinical chemistry": "BIO", // Alias for biochemistry
  "blood bank": "BBK",
  "coagulation": "COA",
};

const TEST_GROUP_CODES: Record<string, string> = {
  "hormones": "HOR",
  "serology": "SER",
  "virology": "VIR",
  "bacteriology": "BAC",
  "mycology": "MYC",
  "parasitology": "PAR",
  "immunology": "IMM",
  "autoimmune": "AUT",
  "tumor markers": "TUM",
  "therapeutic drug monitoring": "TDM",
  "cbc": "CBC",
  "complete blood count": "CBC",
  "coagulation": "COA",
  "chemistry": "CHE",
  "liver function": "LFT",
  "renal function": "RFT",
  "cardiac markers": "CAR",
  "electrolytes": "ELE",
  "lipid profile": "LIP",
  "diabetes": "DIA",
  "thyroid": "THY",
  "fertility": "FER",
  "vitamins": "VIT",
  "anemia": "ANE",
  "inflammation": "INF",
  "genetic": "GEN",
  "pharmacogenomics": "PGX",
};

/**
 * Parse sample number to extract components
 * Works with both old format (YYYYMMDDNNN) and new format (YYYYMMDD-LABTYPE-GROUP-SEQ)
 */
export function parseSampleNumber(sampleNumber: string): {
  date: string;
  labType?: string;
  testGroup?: string;
  sequence: string;
  format: 'legacy' | 'enhanced';
} | null {
  // Check for enhanced format: YYYYMMDD-LABTYPE-GROUP-SEQ
  const enhancedMatch = /^(\d{8})-(\w{3})-(\w{3})-(\d{3})$/.exec(sampleNumber);
  
  if (enhancedMatch) {
    return {
      date: enhancedMatch[1],
      labType: enhancedMatch[2],
      testGroup: enhancedMatch[3],
      sequence: enhancedMatch[4],
      format: 'enhanced'
    };
  }
  
  // Check for legacy format: YYYYMMDDNNN
  const legacyMatch = /^(\d{8})(\d{3})$/.exec(sampleNumber);
  
  if (legacyMatch) {
    return {
      date: legacyMatch[1],
      sequence: legacyMatch[2],
      format: 'legacy'
    };
  }
  
  return null;
}

/**
 * Get human-readable lab type from code
 */
export function getLabTypeFromCode(code: string): string {
  const entries = Object.entries(LAB_TYPE_CODES);
  const entry = entries.find(([_, value]) => value === code);
  return entry ? entry[0] : code;
}

/**
 * Get human-readable test group from code
 */
export function getTestGroupFromCode(code: string): string {
  const entries = Object.entries(TEST_GROUP_CODES);
  const entry = entries.find(([_, value]) => value === code);
  return entry ? entry[0] : code;
}

/**
 * Format date from YYYYMMDD to readable format
 */
export function formatSampleDate(dateString: string): string {
  if (dateString.length !== 8) return dateString;
  
  const year = dateString.slice(0, 4);
  const month = dateString.slice(4, 6);
  const day = dateString.slice(6, 8);
  
  return `${year}-${month}-${day}`;
}

/**
 * Check if sample number is enhanced format
 */
export function isEnhancedSampleNumber(sampleNumber: string): boolean {
  const parsed = parseSampleNumber(sampleNumber);
  return parsed?.format === 'enhanced';
}

/**
 * Get sample number color based on lab type
 */
export function getLabTypeColor(labType?: string): string {
  if (!labType) return "default";
  
  const colorMap: Record<string, string> = {
    "BIO": "blue",      // Biochemistry
    "HEM": "red",       // Hematology
    "SER": "green",     // Serology
    "MIC": "purple",    // Microbiology
    "IMM": "orange",    // Immunology
    "PAR": "yellow",    // Parasitology
    "HIS": "pink",      // Histopathology
    "CYT": "indigo",    // Cytology
    "MOL": "cyan",      // Molecular
    "TOX": "gray",      // Toxicology
    "END": "emerald",   // Endocrinology
    "BBK": "rose",      // Blood Bank
    "COA": "amber",     // Coagulation
  };
  
  return colorMap[labType] || "default";
}

/**
 * Get sample number description
 */
export function getSampleNumberDescription(sampleNumber: string): string {
  const parsed = parseSampleNumber(sampleNumber);
  
  if (!parsed) {
    return "Invalid sample number";
  }
  
  if (parsed.format === 'legacy') {
    return `Sample from ${formatSampleDate(parsed.date)}, sequence #${parsed.sequence}`;
  }
  
  return `${getLabTypeFromCode(parsed.labType || '')} - ${getTestGroupFromCode(parsed.testGroup || '')} sample from ${formatSampleDate(parsed.date)}, sequence #${parsed.sequence}`;
}
