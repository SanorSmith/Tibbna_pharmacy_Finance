/**
 * API: /api/d/[workspaceid]/staff
 * - GET: List staff for a workspace (auth required)
 * - POST: Create staff (requires workspace administrator OR global "admin")
 * - Server-side validation:
 *   - For roles nurse/lab_technician/pharmacist: require name, unit, and phone or email
 */
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
    const role = (String(body.role || "receptionist") as StaffRole);
    const firstname = String(body.firstname || "").trim();
    const middlename = body.middlename ? String(body.middlename) : null;
    const lastname = String(body.lastname || "").trim();
    const unit = body.unit ? String(body.unit) : null;
    const specialty = body.specialty ? String(body.specialty) : null;
    const phone = body.phone ? String(body.phone) : null;
    const email = body.email ? String(body.email) : null;

    // Role-based requirements: nurse, lab_technician, pharmacist
    if (role === "nurse" || role === "lab_technician" || role === "pharmacist") {
      if (!firstname || !lastname) {
        return NextResponse.json({ error: "Name (first and last) is required for this role" }, { status: 400 });
      }
      if (!unit) {
        return NextResponse.json({ error: "Unit is required for this role" }, { status: 400 });
      }
      if (!phone && !email) {
        return NextResponse.json({ error: "Provide at least phone or email for this role" }, { status: 400 });
      }
    }

    const values = {
      workspaceid,
      role,
      firstname,
      middlename,
      lastname,
      unit,
      specialty,
      phone,
      email,
    } as const;

    const [row] = await db.insert(staff).values(values).returning();
    return NextResponse.json({ staff: row }, { status: 201 });
  } catch (e) {
    console.error("[staff][POST] error:", e);
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }
}
