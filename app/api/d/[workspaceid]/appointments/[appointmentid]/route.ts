/**
 * API: /api/d/[workspaceid]/appointments/[appointmentid]
 * - PATCH: update start/end (and optional status, location, notes)
 * - Role: doctor (only own appts) or administrator (any)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; appointmentid: string }> },
) {
  const { workspaceid, appointmentid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uws = await getUserWorkspaces(user.userid);
  const membership = uws.find((w) => w.workspace.workspaceid === workspaceid);
  const role = membership?.role;
  const isDoctor = role === "doctor";
  const isAdmin = role === "administrator";
  if (!isDoctor && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const payload: Record<string, any> = {};
  if (body.starttime) payload.starttime = new Date(String(body.starttime));
  if (body.endtime) payload.endtime = new Date(String(body.endtime));
  if (body.status) payload.status = String(body.status);
  if ("location" in body) payload.location = body.location ?? null;
  if ("notes" in body) payload.notes = body.notes ?? {};
  if (Object.keys(payload).length === 0)
    return NextResponse.json({ error: "No updatable fields" }, { status: 400 });

  try {
    // Doctors can only update their own appointments; admins can update any
    const whereBase = and(eq(appointments.workspaceid, workspaceid), eq(appointments.appointmentid, appointmentid));
    const where = isDoctor ? and(whereBase, eq(appointments.doctorid, user.userid)) : whereBase;

    const res = await db.update(appointments).set(payload).where(where).returning();
    if (!res.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ appointment: res[0] });
  } catch (e) {
    console.error("[appointments][PATCH] error:", e);
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
  }
}
