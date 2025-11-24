/**
 * API: /api/d/[workspaceid]/patients/[patientid]/appointments
 * - GET: list appointments for a specific patient
 * - POST: create a new appointment for a patient
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

export async function POST(
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

  // Only doctors and nurses can create appointments
  if (membership.role !== "doctor" && membership.role !== "nurse") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { 
      starttime, 
      endtime, 
      unit, 
      location, 
      status,
      appointmentName,
      appointmentType,
      clinicalIndication,
      reasonForRequest
    } = body;

    if (!starttime || !endtime) {
      return NextResponse.json(
        { error: "Start time and end time are required" },
        { status: 400 }
      );
    }

    // Build notes object with new structured fields
    const notesData: {
      appointmentName?: string;
      appointmentType?: string;
      clinicalIndication?: string;
      reasonForRequest?: string;
    } = {};
    if (appointmentName) notesData.appointmentName = appointmentName;
    if (appointmentType) notesData.appointmentType = appointmentType;
    if (clinicalIndication) notesData.clinicalIndication = clinicalIndication;
    if (reasonForRequest) notesData.reasonForRequest = reasonForRequest;

    // Use the current user's userid as doctorid (appointments.doctorid references users.userid)
    const newAppointment = await db
      .insert(appointments)
      .values({
        workspaceid,
        patientid,
        doctorid: user.userid,
        starttime: new Date(starttime),
        endtime: new Date(endtime),
        status: status || "scheduled",
        unit: unit || null,
        location: location || null,
        notes: Object.keys(notesData).length > 0 ? notesData : null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      appointment: newAppointment[0],
    });
  } catch (e) {
    console.error("[patient-appointments][POST] error:", e);
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}
