import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { staff, type StaffRole } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> },
) {
  const { workspaceid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await db
      .select()
      .from(staff)
      .where(eq(staff.workspaceid, workspaceid))
      .orderBy(asc(staff.createdat));
    return NextResponse.json({ staff: rows });
  } catch (e) {
    console.error("[staff][GET] error:", e);
    return NextResponse.json({ error: "Failed to load staff" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> },
) {
  const { workspaceid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userWorkspaces = await getUserWorkspaces(user.userid);
  const membership = userWorkspaces.find((w) => w.workspace.workspaceid === workspaceid);
  const isWorkspaceAdmin = membership?.role === "administrator";
  const normalizePerms = (perms: unknown): string[] => {
    try {
      if (Array.isArray(perms)) return perms as string[];
      if (typeof perms === "string") {
        const trimmed = perms.trim();
        const dequoted = trimmed.startsWith("'") && trimmed.endsWith("'") ? trimmed.slice(1, -1) : trimmed;
        const parsed = JSON.parse(dequoted);
        if (Array.isArray(parsed)) return parsed as string[];
      }
    } catch {}
    return [];
  };
  const isGlobalAdmin = normalizePerms(user.permissions).includes("admin");
  if (!isWorkspaceAdmin && !isGlobalAdmin) {
    return NextResponse.json({ error: "Only admin can register staff" }, { status: 403 });
  }

  const body = await req.json();
  try {
    const values = {
      workspaceid,
      role: (String(body.role || "receptionist") as StaffRole),
      firstname: String(body.firstname || ""),
      middlename: body.middlename ?? null,
      lastname: String(body.lastname || ""),
      unit: body.unit ?? null,
      specialty: body.specialty ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
    } as const;

    const [row] = await db.insert(staff).values(values).returning();
    return NextResponse.json({ staff: row }, { status: 201 });
  } catch (e) {
    console.error("[staff][POST] error:", e);
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }
}
