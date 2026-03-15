/**
 * Migration Script: Phase 2 - Migrate to Global Drug Catalog
 * 
 * This script:
 * 1. Creates global_drugs table entries from existing workspace drugs
 * 2. Links workspace drugs to their global counterparts
 * 3. Deduplicates drugs across workspaces based on nationalcode + name + form + strength
 */

import { db } from "@/lib/db";
import { drugs, globalDrugs } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";

interface DrugKey {
  nationalcode: string | null;
  name: string;
  form: string;
  strength: string;
}

function createDrugKey(drug: any): string {
  // Create a unique key for deduplication
  const nc = drug.nationalcode || "NONE";
  const name = drug.name.toLowerCase().trim();
  const form = drug.form.toLowerCase().trim();
  const strength = drug.strength.toLowerCase().trim();
  return `${nc}|${name}|${form}|${strength}`;
}

async function migrateToGlobalDrugs() {
  console.log("🔄 Starting migration to global drug catalog...\n");

  try {
    // Step 1: Fetch all existing drugs from all workspaces
    console.log("📦 Fetching all workspace drugs...");
    const allDrugs = await db.select().from(drugs);
    console.log(`   Found ${allDrugs.length} drugs across all workspaces\n`);

    // Step 2: Deduplicate drugs based on key fields
    console.log("🔍 Deduplicating drugs...");
    const drugMap = new Map<string, any>();
    const workspaceDrugMap = new Map<string, string>(); // drugid -> global_drugid

    for (const drug of allDrugs) {
      const key = createDrugKey(drug);
      
      if (!drugMap.has(key)) {
        // First occurrence - this will become the global drug
        drugMap.set(key, drug);
      }
    }

    console.log(`   Deduplicated to ${drugMap.size} unique drugs\n`);

    // Step 3: Insert into global_drugs table
    console.log("➕ Creating global drug catalog...");
    let inserted = 0;
    let errors = 0;

    for (const [key, drug] of drugMap.entries()) {
      try {
        const [globalDrug] = await db
          .insert(globalDrugs)
          .values({
            name: drug.name,
            genericname: drug.genericname,
            atccode: drug.atccode,
            form: drug.form,
            strength: drug.strength,
            unit: drug.unit,
            nationalcode: drug.nationalcode,
            category: drug.category,
            description: drug.description,
            interaction: drug.interaction,
            warning: drug.warning,
            pregnancy: drug.pregnancy,
            sideeffect: drug.sideeffect,
            storagetype: drug.storagetype,
            indication: drug.indication,
            traffic: drug.traffic,
            requiresprescription: drug.requiresprescription,
            metadata: drug.metadata || {},
            isactive: drug.isactive,
          })
          .returning();

        // Store mapping for all drugs with this key
        for (const d of allDrugs) {
          if (createDrugKey(d) === key) {
            workspaceDrugMap.set(d.drugid, globalDrug.drugid);
          }
        }

        inserted++;
        if (inserted % 100 === 0) {
          console.log(`   ↳ Inserted ${inserted} global drugs...`);
        }
      } catch (error) {
        errors++;
        console.error(`   ❌ Error inserting ${drug.name}:`, error);
      }
    }

    console.log(`   ✅ Inserted ${inserted} global drugs\n`);

    // Step 4: Update workspace drugs to link to global catalog
    console.log("🔗 Linking workspace drugs to global catalog...");
    let linked = 0;
    let linkErrors = 0;

    for (const [workspaceDrugId, globalDrugId] of workspaceDrugMap.entries()) {
      try {
        await db
          .update(drugs)
          .set({ globaldrugid: globalDrugId })
          .where(eq(drugs.drugid, workspaceDrugId));
        
        linked++;
        if (linked % 100 === 0) {
          console.log(`   ↳ Linked ${linked} workspace drugs...`);
        }
      } catch (error) {
        linkErrors++;
        console.error(`   ❌ Error linking drug ${workspaceDrugId}:`, error);
      }
    }

    console.log(`   ✅ Linked ${linked} workspace drugs to global catalog\n`);

    // Step 5: Summary
    console.log("📊 Migration Summary:");
    console.log(`   ✅ Global drugs created: ${inserted}`);
    console.log(`   ✅ Workspace drugs linked: ${linked}`);
    console.log(`   ❌ Errors: ${errors + linkErrors}`);
    console.log(`   📦 Total workspace drugs: ${allDrugs.length}`);
    console.log(`   🔄 Deduplication ratio: ${((1 - drugMap.size / allDrugs.length) * 100).toFixed(1)}%`);
    console.log("\n✨ Migration complete!");

  } catch (error) {
    console.error("❌ Fatal error during migration:", error);
    process.exit(1);
  }
}

// Run migration
migrateToGlobalDrugs()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });
