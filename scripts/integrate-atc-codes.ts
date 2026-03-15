/**
 * Integrate ATC codes into drugs table
 * 
 * This script matches drugs by generic name to ATC codes from a mapping file
 * You can download ATC data from: https://github.com/fabkury/atcd
 * 
 * Usage: npx tsx scripts/integrate-atc-codes.ts <workspaceid> [atc-csv-path]
 */

import { db } from "@/lib/db";
import { drugs } from "@/lib/db/schema";
import { eq, or, ilike } from "drizzle-orm";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parse } from "csv-parse/sync";

interface ATCRecord {
  atc_code: string;
  atc_name: string;
  ddd?: string;
  uom?: string;
  adm_r?: string;
  note?: string;
}

// Common ATC codes for frequently used drugs (manual mapping)
const COMMON_ATC_CODES: Record<string, string> = {
  // Cardiovascular
  "digoxin": "C01AA05",
  "digitoxin": "C01AA04",
  "furosemide": "C03CA01",
  "frusemide": "C03CA01",
  "hydrochlorothiazide": "C03AA03",
  "spironolactone": "C03DA01",
  "bumetanide": "C03CA02",
  "amiloride": "C03DB01",
  
  // Antibiotics
  "amoxicillin": "J01CA04",
  "ampicillin": "J01CA01",
  "ciprofloxacin": "J01MA02",
  "azithromycin": "J01FA10",
  "ceftriaxone": "J01DD04",
  "metronidazole": "J01XD01",
  
  // Analgesics
  "paracetamol": "N02BE01",
  "acetaminophen": "N02BE01",
  "ibuprofen": "M01AE01",
  "diclofenac": "M01AB05",
  "aspirin": "N02BA01",
  "morphine": "N02AA01",
  
  // Diabetes
  "metformin": "A10BA02",
  "insulin": "A10AB01",
  "glibenclamide": "A10BB01",
  
  // Respiratory
  "salbutamol": "R03AC02",
  "prednisolone": "H02AB06",
  "dexamethasone": "H02AB02",
  
  // GI
  "omeprazole": "A02BC01",
  "ranitidine": "A02BA02",
  "metoclopramide": "A03FA01",
};

function normalizeGenericName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)[0]; // Get first word (main active ingredient)
}

async function integrateATCCodes(workspaceid: string, atcCsvPath?: string) {
  console.log("🔄 Starting ATC code integration...");
  
  let atcMapping: Map<string, string> = new Map();
  
  // Load from CSV if provided
  if (atcCsvPath && existsSync(atcCsvPath)) {
    console.log(`📂 Loading ATC codes from ${atcCsvPath}...`);
    try {
      const csvContent = readFileSync(atcCsvPath, "utf-8");
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as ATCRecord[];
      
      records.forEach(r => {
        // Skip category-level entries (they have NA for ddd)
        if (!r.atc_name || r.ddd === "NA" || r.atc_code.length < 7) {
          return;
        }
        
        const normalized = normalizeGenericName(r.atc_name);
        if (!atcMapping.has(normalized)) {
          atcMapping.set(normalized, r.atc_code);
        }
      });
      
      console.log(`✅ Loaded ${atcMapping.size} ATC codes from CSV`);
    } catch (err) {
      console.error("❌ Failed to load ATC CSV:", err);
    }
  }
  
  // Add common mappings
  Object.entries(COMMON_ATC_CODES).forEach(([name, code]) => {
    const normalized = normalizeGenericName(name);
    if (!atcMapping.has(normalized)) {
      atcMapping.set(normalized, code);
    }
  });
  
  console.log(`📊 Total ATC mappings available: ${atcMapping.size}`);
  
  // Fetch all drugs in workspace
  const allDrugs = await db
    .select()
    .from(drugs)
    .where(eq(drugs.workspaceid, workspaceid));
  
  console.log(`📦 Found ${allDrugs.length} drugs to process`);
  
  let updated = 0;
  let notFound = 0;
  
  for (const drug of allDrugs) {
    try {
      // Skip if already has ATC code
      if (drug.atccode) {
        continue;
      }
      
      // Try to match by generic name or drug name
      const searchNames = [
        drug.genericname,
        drug.name,
      ].filter(Boolean);
      
      let atcCode: string | undefined;
      
      for (const name of searchNames) {
        const normalized = normalizeGenericName(name!);
        atcCode = atcMapping.get(normalized);
        if (atcCode) break;
        
        // Try partial match for combinations
        for (const [key, code] of atcMapping.entries()) {
          if (normalized.includes(key) || key.includes(normalized)) {
            atcCode = code;
            break;
          }
        }
        if (atcCode) break;
      }
      
      if (atcCode) {
        await db
          .update(drugs)
          .set({ atccode: atcCode, updatedat: new Date() })
          .where(eq(drugs.drugid, drug.drugid));
        
        updated++;
        
        if (updated % 50 === 0) {
          console.log(`  ↳ Updated ${updated} drugs with ATC codes...`);
        }
      } else {
        notFound++;
      }
    } catch (err: any) {
      console.error(`❌ Error processing ${drug.name}:`, err.message);
    }
  }
  
  console.log("\n📊 Summary:");
  console.log(`  ✅ Updated with ATC codes: ${updated}`);
  console.log(`  ⚠️  No ATC code found: ${notFound}`);
  console.log(`  📦 Total drugs: ${allDrugs.length}`);
  console.log(`  📈 Coverage: ${((updated / allDrugs.length) * 100).toFixed(1)}%`);
  console.log("\n✨ ATC integration completed!");
}

const workspaceid = process.argv[2];
const atcCsvPath = process.argv[3];

if (!workspaceid) {
  console.error("❌ Error: Workspace ID is required");
  console.log("Usage: npx tsx scripts/integrate-atc-codes.ts <workspaceid> [atc-csv-path]");
  console.log("\nExample:");
  console.log("  npx tsx scripts/integrate-atc-codes.ts 123e4567-e89b-12d3-a456-426614174000");
  console.log("  npx tsx scripts/integrate-atc-codes.ts 123e4567-e89b-12d3-a456-426614174000 data/atc-codes.csv");
  process.exit(1);
}

integrateATCCodes(workspaceid, atcCsvPath)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Fatal error:", err);
    process.exit(1);
  });
