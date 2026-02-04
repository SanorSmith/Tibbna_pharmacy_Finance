/**
 * Seed Test Reference Ranges from CSV
 * Run with: npx tsx scripts/seed-test-references-from-csv.ts
 */

import { config } from "dotenv";
import * as path from "path";

// Load environment variables first
config({ path: path.join(process.cwd(), ".env.local") });

import { db } from "../lib/db/index";
import { testReferenceRanges } from "../lib/db/schema/test-reference-ranges";
import * as fs from "fs";

const WORKSPACE_ID = "fa9fb036-a7eb-49af-890c-54406dad139d";
const USER_ID = "5037145a-971e-4348-8e44-f7a7ca96a35f"; // Replace with your actual user ID

interface CSVRow {
  labtype: string;
  grouptests: string;
  testname: string;
  testcode: string;
  sampletype: string;
  category: string;
  unit: string;
  containertype: string;
}

async function parseCSV(filePath: string): Promise<CSVRow[]> {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n").filter(line => line.trim());
  
  // Skip header
  const dataLines = lines.slice(1);
  
  const rows: CSVRow[] = [];
  
  for (const line of dataLines) {
    // Simple CSV parsing (handles basic cases)
    const values = line.split(",");
    
    if (values.length >= 8) {
      rows.push({
        labtype: values[0].trim(),
        grouptests: values[1].trim(),
        testname: values[2].trim(),
        testcode: values[3].trim(),
        sampletype: values[4].trim(),
        category: values[5].trim(),
        unit: values[6].trim(),
        containertype: values[7].trim(),
      });
    }
  }
  
  return rows;
}

async function seedTestReferences() {
  try {
    console.log("🌱 Starting test reference ranges seeding...");
    console.log(`✅ Using user ID: ${USER_ID}`);

    // Read CSV file
    const csvPath = path.join(process.cwd(), "data", "test-references-import.csv");
    console.log(`📄 Reading CSV from: ${csvPath}`);
    
    const csvData = await parseCSV(csvPath);
    console.log(`📊 Found ${csvData.length} test references to seed`);

    let successCount = 0;
    let errorCount = 0;

    // Insert each test reference
    for (const row of csvData) {
      try {
        await db.insert(testReferenceRanges).values({
          workspaceid: WORKSPACE_ID,
          testcode: row.testcode,
          testname: row.testname,
          category: row.category,
          unit: row.unit || "N/A",
          agegroup: "ALL",
          sex: "ANY",
          labtype: row.labtype,
          grouptests: row.grouptests,
          sampletype: row.sampletype,
          containertype: row.containertype,
          isactive: "Y",
          createdby: USER_ID,
          createdat: new Date(),
          updatedby: USER_ID,
          updatedat: new Date(),
        });
        
        successCount++;
        
        if (successCount % 50 === 0) {
          console.log(`✅ Seeded ${successCount} test references...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error seeding ${row.testcode} - ${row.testname}:`, error);
      }
    }

    console.log("\n🎉 Seeding completed!");
    console.log(`✅ Successfully seeded: ${successCount} test references`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount}`);
    }
    
    // Show summary by lab type
    console.log("\n📊 Summary by Lab Type:");
    const labTypeCounts: Record<string, number> = {};
    
    for (const row of csvData) {
      labTypeCounts[row.labtype] = (labTypeCounts[row.labtype] || 0) + 1;
    }
    
    Object.entries(labTypeCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([labType, count]) => {
        console.log(`  ${labType}: ${count} tests`);
      });

  } catch (error) {
    console.error("❌ Fatal error during seeding:", error);
    process.exit(1);
  }
}

// Run the seeding
seedTestReferences()
  .then(() => {
    console.log("\n✅ Seeding script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seeding script failed:", error);
    process.exit(1);
  });
