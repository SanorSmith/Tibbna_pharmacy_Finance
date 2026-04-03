/**
 * Admin API: /api/admin/test-catalog
 *
 * GET  – List all tests in the catalog for a workspace (admin only)
 * POST – Add a new test to the catalog (admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labTestCatalog } from "@/lib/db/schema";
import { eq, and, or, ilike } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

function normalizePerms(perms: unknown): string[] {
  try {
    if (Array.isArray(perms)) return perms as string[];
    if (typeof perms === "string") {
      const trimmed = perms.trim();
      const dequoted =
        trimmed.startsWith("'") && trimmed.endsWith("'")
          ? trimmed.slice(1, -1)
          : trimmed;
      const parsed = JSON.parse(dequoted);
      if (Array.isArray(parsed)) return parsed as string[];
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
  const isWorkspaceAdmin = membership?.role === "administrator";
  const isGlobalAdmin = normalizePerms(user.permissions).includes("admin");
  return isWorkspaceAdmin || isGlobalAdmin;
}

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const workspaceid = searchParams.get("workspaceid");
  if (!workspaceid)
    return NextResponse.json(
      { error: "workspaceid is required" },
      { status: 400 },
    );

  const isAdmin = await requireAdmin(user, workspaceid);
  if (!isAdmin)
    return NextResponse.json(
      { error: "Forbidden: administrator access required" },
      { status: 403 },
    );

  try {
    const search = searchParams.get("search") || "";
    const activeFilter = searchParams.get("active");

    const conditions = [eq(labTestCatalog.workspaceid, workspaceid)];
    if (activeFilter === "true") conditions.push(eq(labTestCatalog.isactive, true));
    if (activeFilter === "false") conditions.push(eq(labTestCatalog.isactive, false));

    let tests;
    if (search) {
      tests = await db
        .select()
        .from(labTestCatalog)
        .where(
          and(
            ...conditions,
            or(
              ilike(labTestCatalog.testcode, `%${search}%`),
              ilike(labTestCatalog.testname, `%${search}%`),
              ilike(labTestCatalog.testcategory, `%${search}%`),
            ),
          ),
        )
        .orderBy(labTestCatalog.testcategory, labTestCatalog.testname);
    } else {
      tests = await db
        .select()
        .from(labTestCatalog)
        .where(and(...conditions))
        .orderBy(labTestCatalog.testcategory, labTestCatalog.testname);
    }

    return NextResponse.json({ tests, total: tests.length });
  } catch (e) {
    console.error("[admin/test-catalog][GET]", e);
    return NextResponse.json(
      { error: "Failed to fetch test catalog" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { workspaceid, testcode, testname, testcategory, specimentype } = body;

  if (!workspaceid)
    return NextResponse.json(
      { error: "workspaceid is required" },
      { status: 400 },
    );

  const isAdmin = await requireAdmin(user, workspaceid);
  if (!isAdmin)
    return NextResponse.json(
      { error: "Forbidden: administrator access required" },
      { status: 403 },
    );

  if (!testcode || !testname || !testcategory || !specimentype) {
    return NextResponse.json(
      {
        error:
          "testcode, testname, testcategory, and specimentype are required",
      },
      { status: 400 },
    );
  }

  try {
    const [test] = await db
      .insert(labTestCatalog)
      .values({
        testcode: String(testcode).trim().toUpperCase(),
        testname: String(testname).trim(),
        testdescription: body.testdescription?.trim() || null,
        testcategory: String(testcategory).trim(),
        testpanel: body.testpanel?.trim() || null,
        loinccode: body.loinccode?.trim() || null,
        loincname: body.loincname?.trim() || null,
        snomedcode: body.snomedcode?.trim() || null,
        snomedname: body.snomedname?.trim() || null,
        specimentype: String(specimentype).trim(),
        specimenvolume: body.specimenvolume?.trim() || null,
        specimencontainer: body.specimencontainer?.trim() || null,
        turnaroundtime: body.turnaroundtime?.trim() || null,
        fastingrequired: body.fastingrequired ?? false,
        isactive: body.isactive ?? true,
        workspaceid,
      })
      .returning();

    return NextResponse.json({ test }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "23505") {
      return NextResponse.json(
        { error: "A test with this code already exists" },
        { status: 409 },
      );
    }
    console.error("[admin/test-catalog][POST]", e);
    return NextResponse.json(
      { error: "Failed to create test" },
      { status: 500 },
    );
  }
}
