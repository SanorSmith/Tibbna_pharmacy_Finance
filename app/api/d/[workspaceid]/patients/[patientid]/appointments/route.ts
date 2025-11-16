/**
 * API: /api/d/[workspaceid]/patients/[patientid]/appointments
 * - GET: list appointments for a specific patient
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> },
) {
  const { workspaceid, patientid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userWorkspaces = await getUserWorkspaces(user.userid);
  const membership = userWorkspaces.find((w) => w.workspace.workspaceid === workspaceid);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rows = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.workspaceid, workspaceid),
          eq(appointments.patientid, patientid)
        )
      )
      .orderBy(appointments.starttime);
    
    return NextResponse.json({ appointments: rows });
  } catch (e) {
    console.error("[patient-appointments][GET] error:", e);
    return NextResponse.json({ error: "Failed to load appointments" }, { status: 500 });
  }
}
