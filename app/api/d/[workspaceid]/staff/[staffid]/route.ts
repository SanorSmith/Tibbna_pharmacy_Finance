/**
 * API: /api/d/[workspaceid]/staff/[staffid]
 * - PATCH: update staff information
 * - Role: administrator only
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { staff } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; staffid: string }> },
) {
  const { workspaceid, staffid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uws = await getUserWorkspaces(user.userid);
  const membership = uws.find((w) => w.workspace.workspaceid === workspaceid);
  const isAdmin = membership?.role === "administrator";
  
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden - Administrator access required" }, { status: 403 });
  }

  const body = await req.json();
  const payload: Record<string, unknown> = {};
  
  if (body.role) payload.role = String(body.role);
  if (body.firstname) payload.firstname = String(body.firstname);
  if ("middlename" in body) payload.middlename = body.middlename || null;
  if (body.lastname) payload.lastname = String(body.lastname);
  if ("unit" in body) payload.unit = body.unit || null;
  if ("specialty" in body) payload.specialty = body.specialty || null;
  if ("phone" in body) payload.phone = body.phone || null;
  if ("email" in body) payload.email = body.email || null;
  
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  }

  try {
    const res = await db
      .update(staff)
      .set(payload)
      .where(and(eq(staff.workspaceid, workspaceid), eq(staff.staffid, staffid)))
      .returning();
      
    if (!res.length) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }
    
    return NextResponse.json({ staff: res[0] });
  } catch (e) {
    console.error("[staff][PATCH] error:", e);
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 });
  }
}
