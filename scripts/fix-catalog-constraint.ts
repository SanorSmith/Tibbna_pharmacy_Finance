import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env") });

import { db } from "../lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Fixing lab_test_catalog unique constraint...");
  await db.execute(sql`
    ALTER TABLE lab_test_catalog DROP CONSTRAINT IF EXISTS "lab_test_catalog_testcode_unique";
  `);
  await db.execute(sql`
    ALTER TABLE lab_test_catalog ADD CONSTRAINT IF NOT EXISTS "lab_test_catalog_code_workspace_unique" UNIQUE (testcode, workspaceid);
  `);
  console.log("Done.");
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
