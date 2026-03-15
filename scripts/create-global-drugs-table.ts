/**
 * Create Global Drugs Table (Phase 2)
 * 
 * This script creates the global_drugs table and adds the globaldrugid column
 * to the existing drugs table WITHOUT modifying or renaming any existing tables.
 */

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

async function createGlobalDrugsTable() {
  console.log("🔄 Creating global_drugs table...\n");

  try {
    // Step 1: Create global_drugs table
    console.log("📦 Creating global_drugs table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS global_drugs (
        drugid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        genericname TEXT,
        atccode TEXT,
        form TEXT NOT NULL,
        strength TEXT NOT NULL,
        unit TEXT NOT NULL DEFAULT 'tablet',
        nationalcode TEXT,
        category TEXT,
        description TEXT,
        interaction TEXT,
        warning TEXT,
        pregnancy TEXT,
        sideeffect TEXT,
        storagetype TEXT,
        indication TEXT,
        traffic TEXT,
        requiresprescription BOOLEAN NOT NULL DEFAULT true,
        metadata JSONB DEFAULT '{}',
        isactive BOOLEAN NOT NULL DEFAULT true,
        createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updatedat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);
    console.log("   ✅ global_drugs table created\n");

    // Step 2: Create indexes for global_drugs
    console.log("📑 Creating indexes for global_drugs...");
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS global_drugs_name_idx ON global_drugs(name);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS global_drugs_generic_name_idx ON global_drugs(genericname);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS global_drugs_atc_idx ON global_drugs(atccode);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS global_drugs_national_code_idx ON global_drugs(nationalcode);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS global_drugs_category_idx ON global_drugs(category);
    `);
    
    console.log("   ✅ Indexes created\n");

    // Step 3: Add globaldrugid column to existing drugs table
    console.log("🔗 Adding globaldrugid column to drugs table...");
    await db.execute(sql`
      ALTER TABLE drugs 
      ADD COLUMN IF NOT EXISTS globaldrugid UUID 
      REFERENCES global_drugs(drugid) ON DELETE SET NULL;
    `);
    console.log("   ✅ globaldrugid column added\n");

    // Step 4: Create index for globaldrugid
    console.log("📑 Creating index for globaldrugid...");
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS drugs_global_drug_idx ON drugs(globaldrugid);
    `);
    console.log("   ✅ Index created\n");

    console.log("✨ Global drugs table setup complete!");
    console.log("\n📊 Summary:");
    console.log("   ✅ global_drugs table created");
    console.log("   ✅ 5 indexes created on global_drugs");
    console.log("   ✅ globaldrugid column added to drugs table");
    console.log("   ✅ Index created on drugs.globaldrugid");
    console.log("\n💡 Next steps:");
    console.log("   1. Run: npx tsx scripts/migrate-to-global-drugs.ts");
    console.log("   2. This will populate global_drugs and link existing drugs");

  } catch (error) {
    console.error("❌ Error creating global drugs table:", error);
    throw error;
  }
}

// Run the script
createGlobalDrugsTable()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Script failed:", err);
    process.exit(1);
  });
