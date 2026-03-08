/**
 * API: /api/d/[workspaceid]/appointments
 * - GET: list appointments in a time range (doctor- or admin-only)
 * - POST: create an appointment (doctor or admin)
 * - Query params (GET): from, to (ISO strings), doctorid (optional)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> },
) {
  const { workspaceid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userWorkspaces = await getUserWorkspaces(user.userid);
  const membership = userWorkspaces.find((w) => w.workspace.workspaceid === workspaceid);
  const isDoctor = membership?.role === "doctor";
  const isAdmin = membership?.role === "administrator";
  if (!isDoctor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const doctoridParam = searchParams.get("doctorid");
  if (!from || !to) {
    return NextResponse.json({ error: "Missing 'from' or 'to'" }, { status: 400 });
  }

  try {
    // Administrators can fetch all appointments with doctorid=all
    const fetchAllAppointments = isAdmin && doctoridParam === "all";
    const doctorid = fetchAllAppointments ? null : (doctoridParam || user.userid);

    const conditions = [
      eq(appointments.workspaceid, workspaceid),
      gte(appointments.starttime, new Date(from)),
      lte(appointments.starttime, new Date(to)),
    ];

    // Only filter by doctorid if not fetching all
    if (doctorid) {
      conditions.push(eq(appointments.doctorid, doctorid));
    }

    const rows = await db
      .select()
      .from(appointments)
      .where(and(...conditions));
      
    return NextResponse.json({ appointments: rows });
  } catch (e) {
    console.error("[appointments][GET] error:", e);
    return NextResponse.json({ error: "Failed to load appointments" }, { status: 500 });
  }
}

type AppointmentStatus =
  | "scheduled"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled";

type AppointmentName = "new_patient" | "re_visit" | "follow_up";
type AppointmentType = "visiting" | "video_call" | "home_visit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> },
) {
  const { workspaceid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userWorkspaces = await getUserWorkspaces(user.userid);
  const membership = userWorkspaces.find((w) => w.workspace.workspaceid === workspaceid);
  const isDoctor = membership?.role === "doctor";
  const isAdmin = membership?.role === "administrator";
  if (!isDoctor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  try {
    const values = {
      workspaceid,
      patientid: String(body.patientid),
      doctorid: String(body.doctorid || user.userid), // Auto-fill with current user if doctor
      appointmentname: (body.appointmentname || "new_patient") as AppointmentName,
      appointmenttype: (body.appointmenttype || "visiting") as AppointmentType,
      clinicalindication: body.clinicalindication ?? null,
      reasonforrequest: body.reasonforrequest ?? null,
      description: body.description ?? null,
      starttime: new Date(String(body.starttime)),
      endtime: new Date(String(body.endtime)),
      location: body.location ?? null,
      unit: body.unit ?? null,
      status: String(body.status || "scheduled") as AppointmentStatus,
      notes: {
        ...(body.notes ?? {}),
        ...(body.patientname ? { patientname: String(body.patientname) } : {}),
      },
    };

    const [row] = await db.insert(appointments).values(values).returning();
    return NextResponse.json({ appointment: row }, { status: 201 });
  } catch (e) {
    console.error("[appointments][POST] error:", e);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
