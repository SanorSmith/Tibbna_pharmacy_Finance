import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/tables/patient";
import { eq } from "drizzle-orm";
import {
  getOpenEHRProcedures,
  createProcedure,
} from "@/lib/openehr/procedure";
import {
  getOpenEHREHRBySubjectId,
  createOpenEHREHR,
} from "@/lib/openehr/openehr";

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/procedures
 * Fetch all procedures/surgeries for a patient from OpenEHR
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { patientid } = await params;

    // Get patient from database
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
    }
    if (!ehrId) {
      ehrId = await getOpenEHREHRBySubjectId(patientid);
    }

    if (!ehrId) {
      return NextResponse.json({ procedures: [] }, { status: 200 });
    }

    const procedures = await getOpenEHRProcedures(ehrId);

    return NextResponse.json({ procedures }, { status: 200 });
  } catch (error) {
    console.error("Error fetching procedures:", error);
    return NextResponse.json(
      { error: "Failed to fetch procedures" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/procedures
 * Create a new procedure/surgery in OpenEHR
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { patientid } = await params;
    const body = await request.json();

    // Get patient from database
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

    // Create procedure in OpenEHR
    const composerName = user.name || user.email || "Unknown";
    
    const compositionUid = await createProcedure(
      ehrId,
      {
        procedure_name: body.operationname || body.procedure_name,
        procedure_code: body.procedure_code,
        body_site: body.body_site,
        laterality: body.laterality,
        method: body.method,
        description: body.operationdetails || body.description,
        scheduled_date_time: body.scheduleddate || body.scheduled_date_time,
        duration: body.estimatedduration || body.duration,
        urgency: body.operationtype || body.urgency || "elective",
        indication: body.operationdiagnosis || body.indication,
        anesthesia_type: body.anesthesiatype || body.anesthesia_type,
        theater_location: body.theater || body.theater_location,
        estimated_duration: body.estimatedduration || body.estimated_duration,
        preoperative_assessment: body.preoperativeassessment || body.preoperative_assessment,
        performer_name: body.performer_name,
        performer_role: body.performer_role || "Surgeon",
        current_state: body.current_state || "planned",
        careflow_step: body.careflow_step || "procedure_scheduled",
        comment: body.comment,
      },
      composerName
    );

    return NextResponse.json(
      {
        success: true,
        composition_uid: compositionUid,
        message: "Procedure created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating procedure:", error);
    return NextResponse.json(
      { error: "Failed to create procedure" },
      { status: 500 }
    );
  }
}
