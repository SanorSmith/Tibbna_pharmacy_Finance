/**
 * API: /api/d/[workspaceid]/operations/[operationid]
 * - GET: fetch single operation
 * - PATCH: update operation details
 * - DELETE: cancel operation
 * - Role: doctor, administrator
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { operations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; operationid: string }> },
) {
  const { workspaceid, operationid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uws = await getUserWorkspaces(user.userid);
  const membership = uws.find((w) => w.workspace.workspaceid === workspaceid);
  const role = membership?.role;
  
  if (role !== "doctor" && role !== "administrator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [operation] = await db
      .select()
      .from(operations)
      .where(and(eq(operations.workspaceid, workspaceid), eq(operations.operationid, operationid)))
      .limit(1);

    if (!operation) {
      return NextResponse.json({ error: "Operation not found" }, { status: 404 });
    }

    return NextResponse.json({ operation });
  } catch (e) {
    console.error("[operations][GET] error:", e);
    return NextResponse.json({ error: "Failed to fetch operation" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; operationid: string }> },
) {
  const { workspaceid, operationid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uws = await getUserWorkspaces(user.userid);
  const membership = uws.find((w) => w.workspace.workspaceid === workspaceid);
  const role = membership?.role;
  
  if (role !== "doctor" && role !== "administrator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const payload: Record<string, unknown> = {};

  if (body.scheduleddate) payload.scheduleddate = new Date(String(body.scheduleddate));
  if ("estimatedduration" in body) payload.estimatedduration = body.estimatedduration || null;
  if (body.operationtype) payload.operationtype = String(body.operationtype);
  if (body.status) payload.status = String(body.status);
  if ("preoperativeassessment" in body) payload.preoperativeassessment = body.preoperativeassessment || null;
  if (body.operationname) payload.operationname = String(body.operationname);
  if ("operationdetails" in body) payload.operationdetails = body.operationdetails || null;
  if ("anesthesiatype" in body) payload.anesthesiatype = body.anesthesiatype || null;
  if ("theater" in body) payload.theater = body.theater || null;
  if ("operationdiagnosis" in body) payload.operationdiagnosis = body.operationdiagnosis || null;
  if (body.actualstarttime) payload.actualstarttime = new Date(body.actualstarttime);
  if (body.actualendtime) payload.actualendtime = new Date(body.actualendtime);
  if ("outcomes" in body) payload.outcomes = body.outcomes || null;
  if ("complications" in body) payload.complications = body.complications || null;
  if ("comment" in body) payload.comment = body.comment || null;
  
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  }

  payload.updatedat = new Date();

  try {
    const res = await db
      .update(operations)
      .set(payload)
      .where(and(eq(operations.workspaceid, workspaceid), eq(operations.operationid, operationid)))
      .returning();

    if (!res.length) {
      return NextResponse.json({ error: "Operation not found" }, { status: 404 });
    }

    return NextResponse.json({ operation: res[0] });
  } catch (e) {
    console.error("[operations][PATCH] error:", e);
    return NextResponse.json({ error: "Failed to update operation" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; operationid: string }> },
) {
  const { workspaceid, operationid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uws = await getUserWorkspaces(user.userid);
  const membership = uws.find((w) => w.workspace.workspaceid === workspaceid);
  const role = membership?.role;
  
  // Only administrators can delete operations
  if (role !== "administrator") {
    return NextResponse.json({ error: "Forbidden - Administrator access required" }, { status: 403 });
  }

  try {
    const res = await db
      .delete(operations)
      .where(and(eq(operations.workspaceid, workspaceid), eq(operations.operationid, operationid)))
      .returning();

    if (!res.length) {
      return NextResponse.json({ error: "Operation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: res[0] });
  } catch (e) {
    console.error("[operations][DELETE] error:", e);
    return NextResponse.json({ error: "Failed to delete operation" }, { status: 500 });
  }
}
