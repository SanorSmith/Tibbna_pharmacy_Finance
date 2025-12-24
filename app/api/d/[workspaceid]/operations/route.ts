/**
 * API: /api/d/[workspaceid]/operations
 * - GET: list all operations for workspace (OpenEHR only)
 * - POST: create new operation booking (OpenEHR only)
 * - Role: doctor, administrator
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/tables/patient";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import {
  getOpenEHREHRBySubjectId,
  createOpenEHREHR,
} from "@/lib/openehr/openehr";
import {
  getOpenEHRProcedures,
  createProcedure,
  type Procedure,
} from "@/lib/openehr/procedure";

// Helper to map OpenEHR procedure state to operation status
function mapOpenEHRStateToStatus(state: string): OperationStatus {
  const stateMap: Record<string, OperationStatus> = {
    planned: "scheduled",
    scheduled: "scheduled",
    active: "in_progress",
    suspended: "postponed",
    aborted: "cancelled",
    completed: "completed",
  };
  return stateMap[state?.toLowerCase()] || "scheduled";
}

type OperationStatus = "scheduled" | "in_preparation" | "in_progress" | "completed" | "cancelled" | "postponed";
//type OperationType = "emergency" | "elective" | "urgent";

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

    // Fetch from OpenEHR for all patients in this workspace
    // Get all patients in workspace
    const workspacePatients = await db.query.patients.findMany({
      where: eq(patients.workspaceid, workspaceid),
    });

    // Fetch procedures for all patients in parallel for better performance
    const procedurePromises = workspacePatients.map(async (patient) => {
      try {
        let ehrId = null;
        if (patient.nationalid) {
          ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
        }
        if (!ehrId) {
          ehrId = await getOpenEHREHRBySubjectId(patient.patientid);
        }

        if (ehrId) {
          const procedures = await getOpenEHRProcedures(ehrId);
          // Transform OpenEHR procedures to match operation format
          return procedures.map((proc: Procedure) => ({
            operationid: proc.composition_uid,
            patientid: patient.patientid,
            surgeonid: proc.performer_name || "Unknown",
            surgeonname: proc.performer_name || "Unknown",
            scheduleddate: proc.scheduled_date_time || proc.recorded_time,
            estimatedduration: proc.estimated_duration || proc.duration,
            operationtype: proc.urgency?.toLowerCase() || "elective",
            status: mapOpenEHRStateToStatus(proc.current_state),
            preoperativeassessment: proc.preoperative_assessment,
            operationname: proc.procedure_name,
            operationdetails: proc.description,
            anesthesiatype: proc.anesthesia_type,
            theater: proc.theater_location,
            operationdiagnosis: proc.indication,
            actualstarttime: null,
            actualendtime: null,
            outcomes: proc.outcome,
            complications: proc.complications,
            comment: proc.comment,
            source: "openehr",
            patient: {
              firstname: patient.firstname,
              middlename: patient.middlename,
              lastname: patient.lastname,
              nationalid: patient.nationalid,
            },
          }));
        }
        return [];
      } catch (error) {
        console.error(`Error fetching procedures for patient ${patient.patientid}:`, error);
        return [];
      }
    });

    // Wait for all patient queries to complete in parallel
    const allProcedureResults = await Promise.all(procedurePromises);
    const openEHROperations = allProcedureResults.flat();

    // Filter by date range if provided
    let filteredOperations = openEHROperations;
    if (from) {
      const fromDate = new Date(from);
      filteredOperations = filteredOperations.filter(
        (op) => new Date(op.scheduleddate) >= fromDate
      );
    }
    if (to) {
      const toDate = new Date(to);
      filteredOperations = filteredOperations.filter(
        (op) => new Date(op.scheduleddate) <= toDate
      );
    }

    // Filter by surgeon if provided (unless "all")
    if (surgeonid && surgeonid !== "all") {
      // For database operations: filter by surgeon UUID
      const dbOps = filteredOperations.filter(
        (op) => op.source !== "openehr" && op.surgeonid === surgeonid
      );
      
      // For OpenEHR operations: filter by surgeon name (performer_name)
      // Get the current user's name to match against OpenEHR performer_name
      const currentUserName = user.name || user.email || "";
      const openEHROps = openEHROperations.filter(
        (op) => op.source === "openehr" && op.surgeonname === currentUserName
      );
      
      filteredOperations = [...dbOps, ...openEHROps];
    }

    // Sort by scheduled date
    filteredOperations.sort(
      (a, b) => new Date(b.scheduleddate).getTime() - new Date(a.scheduleddate).getTime()
    );

    return NextResponse.json({ operations: filteredOperations });
  } catch (e) {
    console.error("[operations][GET] error:", e);
    return NextResponse.json({ error: "Failed to load operations" }, { status: 500 });
  }
}

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
    const patientid = String(body.patientid);
    
    // Get patient to find EHR ID
    const patient = await db.query.patients.findFirst({
      where: eq(patients.patientid, patientid),
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Get or create EHR ID
    let ehrId = null;
    if (patient.nationalid) {
      ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
      if (!ehrId) {
        ehrId = await createOpenEHREHR(patient.nationalid);
      }
    }
    if (!ehrId) {
      ehrId = await getOpenEHREHRBySubjectId(patientid);
      if (!ehrId) {
        ehrId = await createOpenEHREHR(patientid);
      }
    }

    if (!ehrId) {
      return NextResponse.json(
        { error: "Failed to create or retrieve EHR" },
        { status: 500 }
      );
    }

    // Save to OpenEHR only
    const composerName = user.name || user.email || "Unknown";
    const compositionUid = await createProcedure(
      ehrId,
      {
        procedure_name: body.operationname,
        description: body.operationdetails,
        scheduled_date_time: body.scheduleddate,
        duration: body.estimatedduration,
        urgency: body.operationtype || "elective",
        indication: body.operationdiagnosis,
        anesthesia_type: body.anesthesiatype,
        theater_location: body.theater,
        estimated_duration: body.estimatedduration,
        preoperative_assessment: body.preoperativeassessment,
        performer_name: user.name || user.email,
        performer_role: "Surgeon",
        current_state: "planned",
        careflow_step: "procedure_scheduled",
        comment: body.comment,
      },
      composerName
    );

    return NextResponse.json(
      {
        success: true,
        composition_uid: compositionUid,
        message: "Operation created successfully in OpenEHR",
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[operations][POST] error:", e);
    return NextResponse.json({ error: "Failed to create operation" }, { status: 500 });
  }
}
