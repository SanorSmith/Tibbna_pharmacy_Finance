/**
 * Enhanced Sample Number Generator
 * 
 * Generates sample numbers with lab type and test group identifiers
 * Format: YYYYMMDD-LABTYPE-GROUP-SEQ
 * Examples:
 * - 20260405-BIO-HOR-001 (Biochemistry - Hormones)
 * - 20260405-HEM-CBC-001 (Hematology - Complete Blood Count)
 * - 20260405-SER-VIR-001 (Serology - Virology)
 */

import { db } from "@/lib/db";
import { accessionSamples, labTestCatalog } from "@/lib/db/schema";
import { sql, eq } from "drizzle-orm";

// Lab type and test group code mappings
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
 * Get lab type code from lab type name
 */
function getLabTypeCode(labType: string): string {
  const normalized = labType.toLowerCase().trim();
  return LAB_TYPE_CODES[normalized] || labType.substring(0, 3).toUpperCase();
}

/**
 * Get test group code from test group name
 */
function getTestGroupCode(testGroup: string): string {
  const normalized = testGroup.toLowerCase().trim();
  return TEST_GROUP_CODES[normalized] || testGroup.substring(0, 3).toUpperCase();
}

/**
 * Determine lab type and test group from test codes
 */
async function determineLabTypeAndGroup(
  testCodes: string[],
  workspaceid: string
): Promise<{ labType: string; testGroup: string }> {
  if (!testCodes || testCodes.length === 0) {
    return { labType: "GEN", testGroup: "UNK" }; // General/Unknown
  }

  try {
    // Fetch test catalog information for the given test codes
    const tests = await db
      .select({
        testcategory: labTestCatalog.testcategory,
        testpanel: labTestCatalog.testpanel,
      })
      .from(labTestCatalog)
      .where(
        sql`${labTestCatalog.testcode} IN ${testCodes} AND ${labTestCatalog.workspaceid} = ${workspaceid}`
      );

    if (tests.length === 0) {
      return { labType: "GEN", testGroup: "UNK" };
    }

    // Count occurrences of each lab type and test group
    const labTypeCounts: Record<string, number> = {};
    const testGroupCounts: Record<string, number> = {};

    tests.forEach((test) => {
      if (test.testcategory) {
        const labType = test.testcategory.toLowerCase();
        labTypeCounts[labType] = (labTypeCounts[labType] || 0) + 1;
      }
      if (test.testpanel) {
        const testGroup = test.testpanel.toLowerCase();
        testGroupCounts[testGroup] = (testGroupCounts[testGroup] || 0) + 1;
      }
    });

    // Get the most common lab type and test group
    const mostCommonLabType = Object.entries(labTypeCounts).reduce(
      (a, b) => (a[1] > b[1] ? a : b),
      ["", 0]
    )[0];

    const mostCommonTestGroup = Object.entries(testGroupCounts).reduce(
      (a, b) => (a[1] > b[1] ? a : b),
      ["", 0]
    )[0];

    return {
      labType: getLabTypeCode(mostCommonLabType || "general"),
      testGroup: getTestGroupCode(mostCommonTestGroup || "unknown"),
    };
  } catch (error) {
    console.error("Error determining lab type and group:", error);
    return { labType: "GEN", testGroup: "UNK" };
  }
}

/**
 * Generate enhanced sample number with lab type and test group
 * Format: YYYYMMDD-LABTYPE-GROUP-SEQ
 */
export async function generateEnhancedSampleNumber(
  testCodes: string[],
  workspaceid: string
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const datePrefix = `${year}${month}${day}`;

  // Determine lab type and test group
  const { labType, testGroup } = await determineLabTypeAndGroup(testCodes, workspaceid);
  
  // Create the prefix for this lab type and test group combination
  const prefix = `${datePrefix}-${labType}-${testGroup}`;

  // Get the last sample number for this specific combination today
  const lastSample = await db
    .select({ samplenumber: accessionSamples.samplenumber })
    .from(accessionSamples)
    .where(sql`${accessionSamples.samplenumber} LIKE ${prefix + '-' + '%'}`)
    .orderBy(sql`${accessionSamples.samplenumber} DESC`)
    .limit(1);

  let nextNumber = 1;
  if (lastSample.length > 0) {
    // Extract the sequence number (last 3 digits)
    const lastSequence = lastSample[0].samplenumber.slice(-3);
    nextNumber = parseInt(lastSequence, 10) + 1;
  }

  // Pad sequence with zeros to 3 digits
  const paddedSequence = nextNumber.toString().padStart(3, "0");
  return `${prefix}-${paddedSequence}`;
}

/**
 * Parse sample number to extract components
 */
export function parseSampleNumber(sampleNumber: string): {
  date: string;
  labType: string;
  testGroup: string;
  sequence: string;
} | null {
  const match = /^(\d{8})-(\w{3})-(\w{3})-(\d{3})$/.exec(sampleNumber);
  
  if (!match) {
    return null;
  }

  return {
    date: match[1],
    labType: match[2],
    testGroup: match[3],
    sequence: match[4],
  };
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
