/**
 * Admin API: /api/admin/test-catalog/[testid]
 *
 * PUT    – Update an existing test in the catalog (admin only)
 * DELETE – Deactivate a test (soft delete, admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labTestCatalog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ testid: string }> },
) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { testid } = await params;
  const body = await request.json();
  const { workspaceid } = body;

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

  const [existing] = await db
    .select()
    .from(labTestCatalog)
    .where(eq(labTestCatalog.testid, testid))
    .limit(1);

  if (!existing)
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  if (existing.workspaceid !== workspaceid)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const [updated] = await db
      .update(labTestCatalog)
      .set({
        testname: body.testname?.trim() || existing.testname,
        testdescription:
          body.testdescription !== undefined
            ? body.testdescription?.trim() || null
            : existing.testdescription,
        testcategory: body.testcategory?.trim() || existing.testcategory,
        testpanel:
          body.testpanel !== undefined
            ? body.testpanel?.trim() || null
            : existing.testpanel,
        loinccode:
          body.loinccode !== undefined
            ? body.loinccode?.trim() || null
            : existing.loinccode,
        loincname:
          body.loincname !== undefined
            ? body.loincname?.trim() || null
            : existing.loincname,
        snomedcode:
          body.snomedcode !== undefined
            ? body.snomedcode?.trim() || null
            : existing.snomedcode,
        snomedname:
          body.snomedname !== undefined
            ? body.snomedname?.trim() || null
            : existing.snomedname,
        specimentype: body.specimentype?.trim() || existing.specimentype,
        specimenvolume:
          body.specimenvolume !== undefined
            ? body.specimenvolume?.trim() || null
            : existing.specimenvolume,
        specimencontainer:
          body.specimencontainer !== undefined
            ? body.specimencontainer?.trim() || null
            : existing.specimencontainer,
        turnaroundtime:
          body.turnaroundtime !== undefined
            ? body.turnaroundtime?.trim() || null
            : existing.turnaroundtime,
        fastingrequired:
          body.fastingrequired !== undefined
            ? body.fastingrequired
            : existing.fastingrequired,
        isactive:
          body.isactive !== undefined ? body.isactive : existing.isactive,
        updatedat: new Date(),
      })
      .where(eq(labTestCatalog.testid, testid))
      .returning();

    return NextResponse.json({ test: updated });
  } catch (e) {
    console.error("[admin/test-catalog][PUT]", e);
    return NextResponse.json(
      { error: "Failed to update test" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ testid: string }> },
) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { testid } = await params;
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

  const [existing] = await db
    .select()
    .from(labTestCatalog)
    .where(eq(labTestCatalog.testid, testid))
    .limit(1);

  if (!existing)
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  if (existing.workspaceid !== workspaceid)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const [deactivated] = await db
      .update(labTestCatalog)
      .set({ isactive: false, updatedat: new Date() })
      .where(eq(labTestCatalog.testid, testid))
      .returning();

    return NextResponse.json({
      test: deactivated,
      message: "Test deactivated successfully",
    });
  } catch (e) {
    console.error("[admin/test-catalog][DELETE]", e);
    return NextResponse.json(
      { error: "Failed to deactivate test" },
      { status: 500 },
    );
  }
}
