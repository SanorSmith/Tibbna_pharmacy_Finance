/**
 * API: /api/d/[workspaceid]/patients/[patientid]
 * - GET: fetch individual patient information
 * - PATCH: update patient information
 * - Role: GET - doctor, nurse, administrator; PATCH - administrator only
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { getOpenEHREHRBySubjectId, deleteOpenEHREHR } from "@/lib/openehr/openehr";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> },
) {
  const { workspaceid, patientid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uws = await getUserWorkspaces(user.userid);
  const membership = uws.find((w) => w.workspace.workspaceid === workspaceid);
  const role = membership?.role;
  
  // Allow doctors, nurses, and administrators to view patient data
  if (role !== "doctor" && role !== "nurse" && role !== "administrator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [patient] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.workspaceid, workspaceid), eq(patients.patientid, patientid)))
      .limit(1);
      
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    
    return NextResponse.json({ patient });
  } catch (e) {
    console.error("[patients][GET] error:", e);
    return NextResponse.json({ error: "Failed to fetch patient" }, { status: 500 });
  }
}

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
  if ("gender" in body) payload.gender = body.gender || null;
  if ("bloodgroup" in body) payload.bloodgroup = body.bloodgroup || null;
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> },
) {
  const { workspaceid, patientid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uws = await getUserWorkspaces(user.userid);
  const membership = uws.find((w) => w.workspace.workspaceid === workspaceid);
  const isAdmin = membership?.role === "administrator";

  // Check global admin permissions
  function normalizePerms(p: unknown): string[] {
    if (Array.isArray(p)) return p.map(String);
    if (typeof p === "string") return [p];
    return [];
  }
  const isGlobalAdmin = normalizePerms(user.permissions).includes("admin");
  
  if (!isAdmin && !isGlobalAdmin) {
    return NextResponse.json({ error: "Forbidden - Administrator access required" }, { status: 403 });
  }

  try {
    // 1. Get patient to find National ID / Subject ID
    const [patient] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.workspaceid, workspaceid), eq(patients.patientid, patientid)))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // 2. Try to delete from OpenEHR
    const subjectId = patient.nationalid || patient.patientid;
    try {
      const ehrId = await getOpenEHREHRBySubjectId(subjectId);
      if (ehrId) {
        await deleteOpenEHREHR(ehrId);
        console.log(`[patients][DELETE] Deleted EHR ${ehrId} for subject ${subjectId}`);
      }
    } catch (ehrError) {
      console.error(`[patients][DELETE] Failed to delete EHR for subject ${subjectId}:`, ehrError);
      // Continue to delete from DB even if EHR deletion fails
    }

    // 3. Delete from DB
    const res = await db
      .delete(patients)
      .where(and(eq(patients.workspaceid, workspaceid), eq(patients.patientid, patientid)))
      .returning();
      
    return NextResponse.json({ success: true, deleted: res[0] });
  } catch (e) {
    console.error("[patients][DELETE] error:", e);
    return NextResponse.json({ error: "Failed to delete patient" }, { status: 500 });
  }
}
