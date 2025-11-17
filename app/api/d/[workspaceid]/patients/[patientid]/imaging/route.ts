import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

// In-memory storage for imaging requests and results (dummy data)
// In production, this would be stored in EHRbase or a database

// Imaging Request (openEHR: INSTRUCTION.imaging_exam_request)
interface ImagingRequest {
  composition_uid: string;
  recorded_time: string;
  
  // Request details (openEHR: Imaging exam request)
  request_name: string;
  description?: string;
  clinical_indication?: string;
  urgency: string; // routine, urgent, emergency
  supporting_doc_image?: string;
  patient_requirement?: string;
  comment?: string;
  
  // Target body site (openEHR: Structured body site)
  target_body_site?: string;
  structured_target_body_site?: string;
  
  // Contrast use
  contrast_use?: string; // yes, no, unknown
  
  // Metadata
  requested_by: string;
  request_status: string; // requested, scheduled, in-progress, completed, cancelled
}

// Imaging Result (openEHR: OBSERVATION.imaging_exam_result)
interface ImagingResult {
  composition_uid: string;
  recorded_time: string;
  request_uid?: string; // Link to request
  
  // Examination details
  examination_name: string;
  
  // Body site (openEHR: Body structure)
  body_structure?: string;
  body_site?: string;
  structured_body_site?: string;
  
  // Findings (openEHR: Imaging findings)
  imaging_findings?: string;
  additional_details?: string;
  
  // Interpretation (openEHR: Impression)
  impression?: string;
  
  // Comment
  comment?: string;
  
  // Metadata
  performed_by?: string;
  reported_by?: string;
  report_date: string;
  result_status: string; // preliminary, final, amended
}

const imagingRequestStore: Record<string, ImagingRequest[]> = {};
const imagingResultStore: Record<string, ImagingResult[]> = {};

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/imaging
 * Retrieve imaging requests and results for a patient
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const { workspaceid, patientid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and nurses can view imaging
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get imaging data from in-memory store
    const requests = imagingRequestStore[patientid] || [];
    const results = imagingResultStore[patientid] || [];

    return NextResponse.json({ 
      requests,
      results
    });
  } catch (error) {
    console.error("Error fetching imaging data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/imaging
 * Create a new imaging request or result
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const { workspaceid, patientid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors can create imaging requests
    if (membership.role !== "doctor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type, data } = body; // type: 'request' or 'result'

    if (type === 'request') {
      // Create imaging request
      const imagingRequest: ImagingRequest = {
        composition_uid: `imaging-request-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        recorded_time: new Date().toISOString(),
        request_name: data.requestName,
        description: data.description,
        clinical_indication: data.clinicalIndication,
        urgency: data.urgency || "routine",
        supporting_doc_image: data.supportingDocImage,
        patient_requirement: data.patientRequirement,
        comment: data.comment,
        target_body_site: data.targetBodySite,
        structured_target_body_site: data.structuredTargetBodySite,
        contrast_use: data.contrastUse,
        requested_by: user.name || user.email,
        request_status: "requested",
      };

      // Store in memory
      if (!imagingRequestStore[patientid]) {
        imagingRequestStore[patientid] = [];
      }
      imagingRequestStore[patientid].unshift(imagingRequest);

      console.log("✅ Imaging request created:", imagingRequest);

      return NextResponse.json(
        { 
          success: true,
          message: "Imaging request created successfully",
          record: imagingRequest
        },
        { status: 201 }
      );
    } else if (type === 'result') {
      // Create imaging result
      const imagingResult: ImagingResult = {
        composition_uid: `imaging-result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        recorded_time: new Date().toISOString(),
        request_uid: data.requestUid,
        examination_name: data.examinationName,
        body_structure: data.bodyStructure,
        body_site: data.bodySite,
        structured_body_site: data.structuredBodySite,
        imaging_findings: data.imagingFindings,
        additional_details: data.additionalDetails,
        impression: data.impression,
        comment: data.comment,
        performed_by: data.performedBy,
        reported_by: user.name || user.email,
        report_date: new Date().toISOString(),
        result_status: data.resultStatus || "final",
      };

      // Store in memory
      if (!imagingResultStore[patientid]) {
        imagingResultStore[patientid] = [];
      }
      imagingResultStore[patientid].unshift(imagingResult);

      console.log("✅ Imaging result created:", imagingResult);

      return NextResponse.json(
        { 
          success: true,
          message: "Imaging result created successfully",
          record: imagingResult
        },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        { error: "Invalid type. Must be 'request' or 'result'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error creating imaging data:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
