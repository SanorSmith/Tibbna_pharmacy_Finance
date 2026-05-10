/**
 * One-shot admin endpoint: fix lab_test_catalog unique constraint
 * Replaces UNIQUE(testcode) with UNIQUE(testcode, workspaceid).
 * Safe to call multiple times (idempotent).
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getUser } from "@/lib/user";

function normalizePerms(perms: unknown): string[] {
  try {
    if (Array.isArray(perms)) return perms as string[];
    if (typeof perms === "string") {
      const t = perms.trim();
      const d = t.startsWith("'") && t.endsWith("'") ? t.slice(1, -1) : t;
      const p = JSON.parse(d);
      if (Array.isArray(p)) return p as string[];
    }
  } catch {}
  return [];
}

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isGlobalAdmin = normalizePerms(user.permissions).includes("admin");
  if (!isGlobalAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    // Drop the old global unique constraint (if it still exists)
    await db.execute(sql`
      ALTER TABLE lab_test_catalog
        DROP CONSTRAINT IF EXISTS "lab_test_catalog_testcode_unique"
    `);

    // Add the per-workspace composite unique (ignore if already exists)
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'lab_test_catalog_code_workspace_unique'
        ) THEN
          ALTER TABLE lab_test_catalog
            ADD CONSTRAINT "lab_test_catalog_code_workspace_unique"
            UNIQUE (testcode, workspaceid);
        END IF;
      END
      $$
    `);

    return NextResponse.json({
      success: true,
      message: "Constraint fixed: UNIQUE(testcode, workspaceid) is now active.",
    });
  } catch (e) {
    console.error("[db-migrate/fix-catalog-constraint]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
