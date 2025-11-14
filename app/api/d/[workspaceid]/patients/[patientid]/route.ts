/**
 * API: /api/d/[workspaceid]/patients/[patientid]
 * - PATCH: update patient information
 * - Role: administrator only
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> },
) {
  const { workspaceid, patientid } = await params;
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
  
  if (body.firstname) payload.firstname = String(body.firstname);
  if ("middlename" in body) payload.middlename = body.middlename || null;
  if (body.lastname) payload.lastname = String(body.lastname);
  if ("nationalid" in body) payload.nationalid = body.nationalid || null;
  if ("dateofbirth" in body) payload.dateofbirth = body.dateofbirth || null;
  if ("phone" in body) payload.phone = body.phone || null;
  if ("email" in body) payload.email = body.email || null;
  if ("address" in body) payload.address = body.address || null;
  if ("medicalhistory" in body) payload.medicalhistory = body.medicalhistory || {};
  
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  }

  try {
    const res = await db
      .update(patients)
      .set(payload)
      .where(and(eq(patients.workspaceid, workspaceid), eq(patients.patientid, patientid)))
      .returning();
      
    if (!res.length) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    
    return NextResponse.json({ patient: res[0] });
  } catch (e) {
    console.error("[patients][PATCH] error:", e);
    return NextResponse.json({ error: "Failed to update patient" }, { status: 500 });
  }
}
