/**
 * API: /api/d/[workspaceid]/operations
 * - GET: list all operations for workspace
 * - POST: create new operation booking
 * - Role: doctor, administrator
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { operations } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> },
) {
  const { workspaceid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uws = await getUserWorkspaces(user.userid);
  const membership = uws.find((w) => w.workspace.workspaceid === workspaceid);
  const role = membership?.role;
  
  if (role !== "doctor" && role !== "administrator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const surgeonid = searchParams.get("surgeonid");

    const conditions = [eq(operations.workspaceid, workspaceid)];

    // Filter by date range if provided
    if (from) {
      conditions.push(gte(operations.scheduleddate, new Date(from)));
    }
    if (to) {
      conditions.push(lte(operations.scheduleddate, new Date(to)));
    }

    // Filter by surgeon if provided (unless "all")
    if (surgeonid && surgeonid !== "all") {
      conditions.push(eq(operations.surgeonid, surgeonid));
    }

    const rows = await db
      .select()
      .from(operations)
      .where(and(...conditions))
      .orderBy(operations.scheduleddate);

    return NextResponse.json({ operations: rows });
  } catch (e) {
    console.error("[operations][GET] error:", e);
    return NextResponse.json({ error: "Failed to load operations" }, { status: 500 });
  }
}

type OperationStatus = "scheduled" | "in_preparation" | "in_progress" | "completed" | "cancelled" | "postponed";
type OperationType = "emergency" | "elective" | "urgent";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> },
) {
  const { workspaceid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uws = await getUserWorkspaces(user.userid);
  const membership = uws.find((w) => w.workspace.workspaceid === workspaceid);
  const role = membership?.role;
  
  if (role !== "doctor" && role !== "administrator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  
  try {
    const values = {
      workspaceid,
      patientid: String(body.patientid),
      surgeonid: String(body.surgeonid || user.userid), // Auto-fill with current user if doctor
      scheduleddate: new Date(String(body.scheduleddate)),
      estimatedduration: body.estimatedduration || null,
      operationtype: (body.operationtype || "elective") as OperationType,
      status: (body.status || "scheduled") as OperationStatus,
      preoperativeassessment: body.preoperativeassessment || null,
      operationname: String(body.operationname),
      operationdetails: body.operationdetails || null,
      anesthesiatype: body.anesthesiatype || null,
      theater: body.theater || null,
      operationdiagnosis: body.operationdiagnosis || null,
      actualstarttime: body.actualstarttime ? new Date(body.actualstarttime) : null,
      actualendtime: body.actualendtime ? new Date(body.actualendtime) : null,
      outcomes: body.outcomes || null,
      complications: body.complications || null,
      comment: body.comment || null,
    };

    const [row] = await db.insert(operations).values(values).returning();
    return NextResponse.json({ operation: row }, { status: 201 });
  } catch (e) {
    console.error("[operations][POST] error:", e);
    return NextResponse.json({ error: "Failed to create operation" }, { status: 500 });
  }
}
