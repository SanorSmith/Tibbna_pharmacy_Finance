/**
 * Test script for enhanced sample numbering system
 * 
 * This demonstrates how the new sample numbering works
 */

import { generateEnhancedSampleNumber, parseSampleNumber } from "../lib/lims/enhanced-sample-number-generator";

// Test cases for different lab types and test groups
const testCases = [
  {
    name: "Biochemistry - Hormones",
    testCodes: ["TSH", "T3", "T4", "ESTRADIOL"],
    workspaceid: "test-workspace",
  },
  {
    name: "Hematology - Complete Blood Count",
    testCodes: ["WBC", "RBC", "HGB", "HCT", "PLT"],
    workspaceid: "test-workspace",
  },
  {
    name: "Serology - Virology",
    testCodes: ["HIV_AG", "HCV_AB", "HBV_AB"],
    workspaceid: "test-workspace",
  },
  {
    name: "Microbiology - Bacteriology",
    testCodes: ["BLOOD_CULTURE", "URINE_CULTURE", "SPUTUM_CULTURE"],
    workspaceid: "test-workspace",
  },
  {
    name: "Mixed Tests (should pick most common)",
    testCodes: ["TSH", "WBC", "HIV_AG", "T3"],
    workspaceid: "test-workspace",
  },
];

// Example usage in your application:
export async function demonstrateSampleNumbering() {
  console.log("=== Enhanced Sample Numbering System Demo ===\n");
  
  for (const testCase of testCases) {
    console.log(`Test Case: ${testCase.name}`);
    console.log(`Test Codes: ${testCase.testCodes.join(", ")}`);
    
    try {
      const sampleNumber = await generateEnhancedSampleNumber(
        testCase.testCodes,
        testCase.workspaceid
      );
      
      console.log(`Generated Sample Number: ${sampleNumber}`);
      
      const parsed = parseSampleNumber(sampleNumber);
      if (parsed) {
        console.log(`Parsed Components:`);
        console.log(`  Date: ${parsed.date}`);
        console.log(`  Lab Type: ${parsed.labType}`);
        console.log(`  Test Group: ${parsed.testGroup}`);
        console.log(`  Sequence: ${parsed.sequence}`);
      }
      
      console.log("---");
    } catch (error) {
      console.error(`Error generating sample number: ${error}`);
    }
  }
}

// Example of how to use in your API route:
export async function exampleUsage() {
  // When creating a sample:
  const testCodes = ["TSH", "T3", "T4"]; // From the order
  const workspaceid = "your-workspace-id";
  
  const sampleNumber = await generateEnhancedSampleNumber(testCodes, workspaceid);
  
  // Result will be something like: "20260405-BIO-HOR-001"
  console.log(`Sample created with number: ${sampleNumber}`);
  
  // When displaying to users:
  const parsed = parseSampleNumber(sampleNumber);
  if (parsed) {
    console.log(`This is a ${parsed.labType} sample from ${parsed.testGroup} group`);
  }
}

// Run demo if this file is executed directly
if (require.main === module) {
  demonstrateSampleNumbering();
}
