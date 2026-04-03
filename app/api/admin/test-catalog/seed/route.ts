/**
 * Admin API: POST /api/admin/test-catalog/seed
 *
 * Inserts all tests from the static test catalog (lib/test-catalog.ts) into
 * lab_test_catalog for the given workspace. Skips already-existing codes.
 * Restricted to workspace administrator or global admin.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labTestCatalog } from "@/lib/db/tables/lims-order";
import { sql } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { INDIVIDUAL_TESTS, TEST_PACKAGES } from "@/lib/test-catalog";

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

async function requireAdmin(
  user: Awaited<ReturnType<typeof import("@/lib/user").getUser>>,
  workspaceid: string,
): Promise<boolean> {
  if (!user) return false;
  const workspaces = await getUserWorkspaces(user.userid);
  const membership = workspaces.find(
    (w) => w.workspace.workspaceid === workspaceid,
  );
  return (
    membership?.role === "administrator" ||
    normalizePerms(user.permissions).includes("admin")
  );
}

// Build reverse map: individual test ID → panel name from TEST_PACKAGES
function buildPanelMap(): Record<string, string> {
  const map: Record<string, string> = {};
  Object.values(TEST_PACKAGES).forEach((pkg) => {
    pkg.tests.forEach((testId) => {
      if (!map[testId]) map[testId] = pkg.name;
    });
  });
  return map;
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { workspaceid } = body;

  if (!workspaceid)
    return NextResponse.json({ error: "workspaceid is required" }, { status: 400 });

  const isAdmin = await requireAdmin(user, workspaceid);
  if (!isAdmin)
    return NextResponse.json(
      { error: "Forbidden: administrator access required" },
      { status: 403 },
    );

  try {
    // Ensure the DB has the per-workspace unique constraint before inserting
    await db.execute(sql`
      ALTER TABLE lab_test_catalog
        DROP CONSTRAINT IF EXISTS "lab_test_catalog_testcode_unique"
    `);
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

    const panelMap = buildPanelMap();

    // Deduplicate by testcode (INDIVIDUAL_TESTS occasionally has aliases with the same code)
    const seen = new Set<string>();
    const rows = Object.values(INDIVIDUAL_TESTS)
      .filter((test) => {
        if (seen.has(test.code)) return false;
        seen.add(test.code);
        return true;
      })
      .map((test) => ({
        testcode: test.code,
        testname: test.name,
        testdescription: test.description ?? null,
        testcategory: test.category,
        testpanel: panelMap[test.id] ?? null,
        snomedcode: test.snomedCode ?? null,
        snomedname: null as string | null,
        loinccode: null as string | null,
        loincname: null as string | null,
        specimentype: test.material ?? "Blood",
        specimenvolume: null as string | null,
        specimencontainer: null as string | null,
        turnaroundtime: null as string | null,
        fastingrequired: test.fastingRequired ?? false,
        isactive: true,
        workspaceid,
      }));

    // Skip rows whose (testcode, workspaceid) already exist
    await db.insert(labTestCatalog).values(rows).onConflictDoNothing();

    // Return count now in catalog for this workspace
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(labTestCatalog)
      .where(sql`workspaceid = ${workspaceid}`);

    const total = result[0]?.count ?? rows.length;

    return NextResponse.json({
      message: "Default tests loaded successfully",
      inserted: rows.length,
      total,
    });
  } catch (e) {
    console.error("[admin/test-catalog/seed][POST]", e);
    return NextResponse.json({ error: "Failed to seed test catalog" }, { status: 500 });
  }
}
