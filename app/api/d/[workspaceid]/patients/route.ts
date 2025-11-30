/**
 * API: /api/d/[workspaceid]/patients
 * - GET: list patients for the given workspace (auth required)
 * - POST: create a patient (requires workspace administrator, global admin, or doctor)
 * - Uses Drizzle ORM and Next.js App Router route handlers.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { createOpenEHREHR, getOpenEHREHRBySubjectId } from "@/lib/openehr/openehr";
import { randomUUID } from "crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> },
) {
  // Await dynamic params per project convention
  const { workspaceid } = await params;
  // Ensure only authenticated users can read workspace data
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // Fetch all patients scoped to this workspace, ordered by creation time
    const rows = await db
      .select()
      .from(patients)
      .where(eq(patients.workspaceid, workspaceid))
      .orderBy(asc(patients.createdat));
    return NextResponse.json({ patients: rows });
  } catch (e) {
    // Surface the error server-side and return a generic message to clients
    console.error("[patients][GET] error:", e);
    return NextResponse.json({ error: "Failed to load patients" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> },
) {
  // Await dynamic params per project convention
  const { workspaceid } = await params;
  // Require authentication for creating a patient
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the user is administrator or doctor in this workspace OR has global admin permission
  const userWorkspaces = await getUserWorkspaces(user.userid);
  const membership = userWorkspaces.find(
    (w) => w.workspace.workspaceid === workspaceid,
  );
  const isWorkspaceAdmin = membership?.role === "administrator";
  const isDoctor = membership?.role === "doctor";
  // Normalize permissions to an array of strings
  const normalizePerms = (perms: unknown): string[] => {
    try {
      if (Array.isArray(perms)) return perms as string[];
      if (typeof perms === "string") {
        const trimmed = perms.trim();
        // Handle cases like "'[\"admin\"]'" or "[\"admin\"]"
        const dequoted = trimmed.startsWith("'") && trimmed.endsWith("'")
          ? trimmed.slice(1, -1)
          : trimmed;
        const parsed = JSON.parse(dequoted);
        if (Array.isArray(parsed)) return parsed as string[];
      }
    } catch {}
    return [];
  };
  const isGlobalAdmin = normalizePerms(user.permissions).includes("admin");
  if (!isWorkspaceAdmin && !isGlobalAdmin && !isDoctor) {
    // Block non-admin, non-doctor users from creating patients
    return NextResponse.json({ error: "Only admin or doctor can register a patient" }, { status: 403 });
  }

  const body = await req.json();
  try {
    // Check if National ID already exists (if provided)
    if (body.nationalid) {
      const existingPatient = await db
        .select()
        .from(patients)
        .where(eq(patients.nationalid, body.nationalid))
        .limit(1);
      
      if (existingPatient.length > 0) {
        return NextResponse.json(
          { error: "A patient with this National ID already exists" },
          { status: 409 }
        );
      }
    }

    // Generate a UUID here so we can use the same value to create the EHR in EHRbase
    const newPatientId = randomUUID();
    const values = {
      patientid: newPatientId,
      workspaceid,
      firstname: String(body.firstname || ""),
      middlename: body.middlename ?? null,
      lastname: String(body.lastname || ""),
      nationalid: body.nationalid ?? null,
      dateofbirth: body.dateofbirth ? String(body.dateofbirth) : null,
      gender: body.gender ?? null,
      bloodgroup: body.bloodgroup ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      address: body.address ?? null,
      medicalhistory: body.medicalhistory ?? {},
    } as const;

    // First create the local patient row
    const [inserted] = await db.insert(patients).values(values).returning();

    // Create EHR in EHRbase using the patient's National ID as subject id
    // Fall back to patient UUID if National ID is not provided
    let ehrId: string | null = null;
    try {
      // Use National ID if available, otherwise use patient UUID
      const subjectId = body.nationalid || newPatientId;
      ehrId = await createOpenEHREHR(subjectId);
    } catch (ehrErr: unknown) {
      // If 409 conflict, EHR already exists - try to fetch it
      const axiosError = ehrErr as { response?: { status?: number }; status?: number };
      if (axiosError?.response?.status === 409 || axiosError?.status === 409) {
        console.log("[patients][POST] EHR already exists, fetching existing EHR ID");
        try {
          const subjectId = body.nationalid || newPatientId;
          ehrId = await getOpenEHREHRBySubjectId(subjectId);
          if (ehrId) {
            console.log("[patients][POST] Found existing EHR:", ehrId);
          }
        } catch (fetchErr) {
          console.error("[patients][POST] Failed to fetch existing EHR:", fetchErr);
        }
      } else {
        console.error("[patients][POST] EHR create failed:", ehrErr);
      }
    }

    let updated = inserted;
    if (ehrId) {
      // Persist the returned EHR identifier on the patient record
      const [row] = await db
        .update(patients)
        .set({ ehrid: ehrId })
        .where(eq(patients.patientid, newPatientId))
        .returning();
      updated = row ?? inserted;
    }

    return NextResponse.json({ patient: updated }, { status: 201 });
  } catch (e) {
    // Catch any unexpected error in the create flow
    console.error(e);
    return NextResponse.json({ error: "Failed to create patient" }, { status: 500 });
  }
}
