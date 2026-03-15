/**
 * Check drugs in workspace
 */

import { db } from "@/lib/db";
import { drugs } from "@/lib/db/schema";
import { eq, ilike, or, and } from "drizzle-orm";

const workspaceid = process.argv[2];
const searchQuery = process.argv[3] || "";

if (!workspaceid) {
  console.error("❌ Error: Workspace ID is required");
  console.log("Usage: npx tsx scripts/check-drugs.ts <workspaceid> [search]");
  process.exit(1);
}

async function checkDrugs() {
  console.log(`🔍 Checking drugs in workspace: ${workspaceid}`);
  if (searchQuery) {
    console.log(`   Search query: "${searchQuery}"`);
  }
  
  try {
    let query = db
      .select({
        drugid: drugs.drugid,
        name: drugs.name,
        genericname: drugs.genericname,
        form: drugs.form,
        strength: drugs.strength,
        atccode: drugs.atccode,
        category: drugs.category,
      })
      .from(drugs)
      .where(eq(drugs.workspaceid, workspaceid));

    if (searchQuery) {
      const results = await db
        .select({
          drugid: drugs.drugid,
          name: drugs.name,
          genericname: drugs.genericname,
          form: drugs.form,
          strength: drugs.strength,
          atccode: drugs.atccode,
          category: drugs.category,
        })
        .from(drugs)
        .where(
          and(
            eq(drugs.workspaceid, workspaceid),
            eq(drugs.isactive, true),
            or(
              ilike(drugs.name, `%${searchQuery}%`),
              ilike(drugs.genericname, `%${searchQuery}%`)
            )
          )
        )
        .limit(10);

      console.log(`\n✅ Found ${results.length} drugs matching "${searchQuery}":\n`);
      results.forEach((drug, idx) => {
        console.log(`${idx + 1}. ${drug.name}`);
        console.log(`   Generic: ${drug.genericname || "N/A"}`);
        console.log(`   Form: ${drug.form} | Strength: ${drug.strength}`);
        console.log(`   ATC: ${drug.atccode || "N/A"} | Category: ${drug.category || "N/A"}`);
        console.log("");
      });
    } else {
      const allDrugs = await query.limit(20);
      console.log(`\n📦 Total drugs in workspace (showing first 20):\n`);
      allDrugs.forEach((drug, idx) => {
        console.log(`${idx + 1}. ${drug.name} (${drug.form} ${drug.strength})`);
      });
      console.log(`\n💡 Try: npx tsx scripts/check-drugs.ts ${workspaceid} "digoxin"`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

checkDrugs()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Fatal error:", err);
    process.exit(1);
  });
