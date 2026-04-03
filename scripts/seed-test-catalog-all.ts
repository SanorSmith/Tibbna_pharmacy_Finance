/**
 * Seeds ALL individual tests from lib/test-catalog.ts into lab_test_catalog.
 * Run with:
 *   DATABASE_URL=<url> npx tsx scripts/seed-test-catalog-all.ts [workspaceid]
 *
 * If no workspaceid arg is supplied, inserts rows with workspaceid = 'global'
 * so they're visible to every workspace via a single seed.
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { INDIVIDUAL_TESTS, TEST_PACKAGES } from "../lib/test-catalog";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = postgres(DB_URL, { ssl: "require", max: 1 });
const db = drizzle(client);

// Inline table definition (avoids importing the full schema tree)
const labTestCatalog = pgTable("lab_test_catalog", {
  testid: uuid("testid").primaryKey().defaultRandom(),
  testcode: text("testcode").notNull(),
  testname: text("testname").notNull(),
  testdescription: text("testdescription"),
  testcategory: text("testcategory").notNull(),
  testpanel: text("testpanel"),
  loinccode: text("loinccode"),
  loincname: text("loincname"),
  snomedcode: text("snomedcode"),
  snomedname: text("snomedname"),
  specimentype: text("specimentype").notNull(),
  specimenvolume: text("specimenvolume"),
  specimencontainer: text("specimencontainer"),
  turnaroundtime: text("turnaroundtime"),
  fastingrequired: boolean("fastingrequired").default(false),
  isactive: boolean("isactive").notNull().default(true),
  workspaceid: text("workspaceid").notNull(),
  createdat: timestamp("createdat", { withTimezone: true }).notNull().defaultNow(),
  updatedat: timestamp("updatedat", { withTimezone: true }).notNull().defaultNow(),
});

async function main() {
  const workspaceid = process.argv[2] ?? "global";
  console.log(`Seeding lab_test_catalog for workspaceid = "${workspaceid}"`);

  // Build reverse map: individual test id → panel name
  const panelMap: Record<string, string> = {};
  for (const pkg of Object.values(TEST_PACKAGES)) {
    for (const testId of pkg.tests) {
      if (!panelMap[testId]) panelMap[testId] = pkg.name;
    }
  }

  // Deduplicate by testcode
  const seen = new Set<string>();
  const rows = Object.values(INDIVIDUAL_TESTS)
    .filter((t) => {
      if (seen.has(t.code)) return false;
      seen.add(t.code);
      return true;
    })
    .map((t) => ({
      testcode: t.code,
      testname: t.name,
      testdescription: t.description ?? null,
      testcategory: t.category,
      testpanel: panelMap[t.id] ?? null,
      snomedcode: t.snomedCode ?? null,
      snomedname: null as string | null,
      loinccode: null as string | null,
      loincname: null as string | null,
      specimentype: t.material ?? "Blood",
      specimenvolume: null as string | null,
      specimencontainer: null as string | null,
      turnaroundtime: null as string | null,
      fastingrequired: t.fastingRequired ?? false,
      isactive: true,
      workspaceid,
    }));

  console.log(`Inserting ${rows.length} tests…`);

  await db.insert(labTestCatalog).values(rows).onConflictDoNothing();

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(labTestCatalog)
    .where(sql`workspaceid = ${workspaceid}`);

  console.log(`Done. Total rows for workspace "${workspaceid}": ${result[0]?.count}`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
