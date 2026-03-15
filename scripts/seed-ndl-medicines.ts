/**
 * Seed NDL Medicines from CSV to drugs table
 * 
 * Usage: npx tsx scripts/seed-ndl-medicines.ts [workspaceid]
 */

import { db } from "@/lib/db";
import { drugs } from "@/lib/db/schema";
import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "csv-parse/sync";

interface NDLMedicine {
  national_code: string;
  drug_name: string;
  strength: string;
  form: string;
  route: string;
}

async function seedNDLMedicines(workspaceid: string) {
  console.log("🔄 Starting NDL medicines import...");
  console.log(`📦 Workspace ID: ${workspaceid}`);

  // Read CSV file
  const csvPath = join(process.cwd(), "data", "ndl_medicines_only.csv");
  const csvContent = readFileSync(csvPath, "utf-8");

  // Parse CSV
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as NDLMedicine[];

  console.log(`📊 Found ${records.length} medicines to import`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const record of records) {
    try {
      // Extract form from the form field (e.g., "Tablet", "2ml Ampoule", "oral Solution")
      let form = record.form.toLowerCase();
      
      // Normalize form to standard types
      if (form.includes("tablet")) form = "tablet";
      else if (form.includes("capsule")) form = "capsule";
      else if (form.includes("syrup") || form.includes("solution") || form.includes("elixir")) form = "syrup";
      else if (form.includes("ampoule") || form.includes("vial") || form.includes("injection")) form = "injection";
      else if (form.includes("suspension")) form = "suspension";
      else if (form.includes("cream") || form.includes("ointment")) form = "cream";
      else if (form.includes("drops")) form = "drops";
      else if (form.includes("spray")) form = "spray";
      else if (form.includes("inhaler")) form = "inhaler";
      else if (form.includes("suppository")) form = "suppository";
      else form = "other";

      // Extract unit from form
      let unit = "tablet";
      if (form === "syrup" || form === "suspension") unit = "ml";
      else if (form === "injection") unit = "vial";
      else if (form === "capsule") unit = "capsule";
      else if (form === "cream") unit = "g";
      else if (form === "drops") unit = "drops";
      else if (form === "spray") unit = "spray";
      else if (form === "inhaler") unit = "dose";
      else if (form === "suppository") unit = "suppository";

      // Clean drug name (remove extra spaces and special characters)
      const drugName = record.drug_name.trim().replace(/\s+/g, " ");

      // Insert into database
      await db.insert(drugs).values({
        workspaceid: workspaceid,
        name: drugName,
        genericname: drugName, // Use same as name for now
        nationalcode: record.national_code,
        form: form,
        strength: record.strength,
        unit: unit,
        category: "NDL Import",
        description: `Route: ${record.route}`,
        isactive: true,
        requiresprescription: true,
        insuranceapproved: false,
      });

      imported++;

      if (imported % 100 === 0) {
        console.log(`✅ Imported ${imported} medicines...`);
      }
    } catch (error: any) {
      // Check if it's a duplicate error
      if (error?.code === "23505") {
        skipped++;
      } else {
        errors++;
        console.error(`❌ Error importing ${record.drug_name}:`, error.message);
      }
    }
  }

  console.log("\n📊 Import Summary:");
  console.log(`✅ Successfully imported: ${imported}`);
  console.log(`⏭️  Skipped (duplicates): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📦 Total processed: ${records.length}`);
  console.log("\n✨ NDL medicines import completed!");
}

// Get workspace ID from command line or use default
const workspaceid = process.argv[2];

if (!workspaceid) {
  console.error("❌ Error: Workspace ID is required");
  console.log("Usage: npx tsx scripts/seed-ndl-medicines.ts [workspaceid]");
  console.log("\nExample: npx tsx scripts/seed-ndl-medicines.ts 123e4567-e89b-12d3-a456-426614174000");
  process.exit(1);
}

// Validate UUID format
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(workspaceid)) {
  console.error("❌ Error: Invalid workspace ID format (must be a valid UUID)");
  process.exit(1);
}

seedNDLMedicines(workspaceid)
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
