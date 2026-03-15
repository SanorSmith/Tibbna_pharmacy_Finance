/**
 * Update drugs table with category + drug_interaction_group from enriched CSV
 * 
 * CSV columns:
 *   national_code, drug_name, strength, form, route, notes,
 *   medicine_name, category, drug_interaction_group
 *
 * Strategy:
 *  - Match existing rows by nationalcode → update category, interaction, genericname, notes
 *  - Insert row if no match found (upsert by national_code within workspace)
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/update-ndl-categories.ts <workspaceid>
 */

import { db } from "@/lib/db";
import { drugs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "csv-parse/sync";

interface EnrichedMedicine {
  national_code: string;
  drug_name: string;
  strength: string;
  form: string;
  route: string;
  notes: string;
  medicine_name: string;
  category: string;
  drug_interaction_group: string;
}

function normalizeForm(raw: string): string {
  const f = raw.toLowerCase();
  if (f.includes("tablet") || f.includes("caplet") || f.includes("scored")) return "tablet";
  if (f.includes("capsule"))               return "capsule";
  if (f.includes("syrup") || f.includes("elixir") || f.includes("linctus")) return "syrup";
  if (f.includes("solution") || f.includes("mixture") || f.includes("liquid")) return "solution";
  if (f.includes("suspension"))            return "suspension";
  if (f.includes("ampoule") || f.includes("vial") || f.includes("injection") || f.includes("infusion")) return "injection";
  if (f.includes("cream") || f.includes("ointment") || f.includes("gel")) return "cream";
  if (f.includes("drops"))                 return "drops";
  if (f.includes("spray") || f.includes("jet")) return "spray";
  if (f.includes("inhaler") || f.includes("aerosol")) return "inhaler";
  if (f.includes("suppository"))           return "suppository";
  if (f.includes("patch"))                 return "patch";
  if (f.includes("powder"))                return "powder";
  return "other";
}

function unitFromForm(form: string): string {
  const map: Record<string, string> = {
    tablet: "tablet", capsule: "capsule", syrup: "ml",
    solution: "ml", suspension: "ml", injection: "vial",
    cream: "g", drops: "drops", spray: "spray",
    inhaler: "dose", suppository: "suppository", patch: "patch",
    powder: "g", other: "unit",
  };
  return map[form] ?? "unit";
}

async function run(workspaceid: string) {
  console.log("🔄 Loading enriched CSV...");
  const csvPath = join(process.cwd(), "data", "all_medicines_with_categories_interactions.csv");
  const records = parse(readFileSync(csvPath, "utf-8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as EnrichedMedicine[];

  console.log(`📊 ${records.length} records found`);

  let updated = 0;
  let inserted = 0;
  let errors = 0;

  for (const r of records) {
    try {
      const form = normalizeForm(r.form);
      const unit = unitFromForm(form);
      const drugName = r.drug_name.trim().replace(/\s+/g, " ");
      const genericName = r.medicine_name?.trim().replace(/\s+/g, " ") || drugName;
      const category = r.category?.trim() || null;
      const interaction = r.drug_interaction_group?.trim() || null;
      const notes = r.notes?.trim() || null;
      const description = `Route: ${r.route}`;

      // Try to find existing drug by nationalcode + workspaceid
      const [existing] = await db
        .select({ drugid: drugs.drugid })
        .from(drugs)
        .where(
          and(
            eq(drugs.nationalcode, r.national_code),
            eq(drugs.workspaceid, workspaceid)
          )
        )
        .limit(1);

      if (existing) {
        // Update with enriched data
        await db
          .update(drugs)
          .set({
            genericname: genericName,
            category,
            interaction,
            notes,
            description,
            updatedat: new Date(),
          })
          .where(eq(drugs.drugid, existing.drugid));
        updated++;
      } else {
        // Insert new record
        await db.insert(drugs).values({
          workspaceid,
          name: drugName,
          genericname: genericName,
          nationalcode: r.national_code,
          form,
          strength: r.strength,
          unit,
          category,
          interaction,
          notes,
          description,
          isactive: true,
          requiresprescription: true,
          insuranceapproved: false,
        });
        inserted++;
      }

      const done = updated + inserted;
      if (done % 200 === 0) {
        console.log(`  ↳ processed ${done} (updated: ${updated}, inserted: ${inserted})`);
      }
    } catch (err: any) {
      errors++;
      console.error(`❌ ${r.national_code} – ${r.drug_name}: ${err.message}`);
    }
  }

  console.log("\n📊 Summary:");
  console.log(`  ✅ Updated   : ${updated}`);
  console.log(`  ➕ Inserted  : ${inserted}`);
  console.log(`  ❌ Errors    : ${errors}`);
  console.log(`  📦 Total     : ${records.length}`);
  console.log("\n✨ Done!");
}

const workspaceid = process.argv[2];
if (!workspaceid) {
  console.error("Usage: npx tsx scripts/update-ndl-categories.ts <workspaceid>");
  process.exit(1);
}

run(workspaceid)
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
